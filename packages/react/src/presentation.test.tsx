// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, render, renderHook, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as z from 'zod';
import {
  createPresentationEvaluator,
  defineErrorCatalog,
  definePresentationPolicy,
} from '@resiliojs/core';
import { ResilioProvider } from './ResilioProvider.js';
import {
  ResilioPresentationHost,
  usePresentError,
  useResilioInline,
} from './presentation.js';

afterEach(cleanup);

const catalog = defineErrorCatalog({
  EMAIL_TAKEN: { params: z.object({ email: z.string().email() }) },
  SESSION_EXPIRED: {},
});
const policy = definePresentationPolicy(catalog, {
  EMAIL_TAKEN: [
    {
      decide: () => ({
        channel: 'inline',
        severity: 'warning',
        messageKey: 'errors.emailTaken',
        target: 'email',
      }),
    },
  ],
  SESSION_EXPIRED: [
    {
      decide: () => ({
        channel: 'modal',
        severity: 'error',
        messageKey: 'errors.sessionExpired',
      }),
    },
  ],
});
const evaluator = createPresentationEvaluator({
  catalog,
  policy,
  fallback: () => ({
    channel: 'toast',
    severity: 'error',
    messageKey: 'errors.fallback',
  }),
});

describe('React presentation integration', () => {
  it('connects a project renderer without a UI library dependency', async () => {
    const modal = vi.fn();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ResilioProvider evaluator={evaluator} renderers={{ modal }}>
        {children}
      </ResilioProvider>
    );
    const { result } = renderHook(() => usePresentError(), { wrapper });

    await act(async () => {
      await result.current({ code: 'SESSION_EXPIRED' }, { source: 'manual' });
    });

    expect(modal).toHaveBeenCalledWith(expect.objectContaining({
      decision: expect.objectContaining({ channel: 'modal' }),
      dismiss: expect.any(Function),
    }));
  });

  it('exposes active decisions to a custom host and inline hook', async () => {
    function View() {
      const present = usePresentError();
      const inline = useResilioInline({ surface: 'signup-form', target: 'email' });
      return (
        <>
          <button onClick={() => void present(
            { code: 'EMAIL_TAKEN', params: { email: 'taken@example.com' } },
            { source: 'form', surface: 'signup-form' },
          )}>
            present
          </button>
          <span>{inline?.decision.messageKey}</span>
          <ResilioPresentationHost>
            {({ active }) => <span>{active.at(-1)?.decision.channel}</span>}
          </ResilioPresentationHost>
        </>
      );
    }

    render(<ResilioProvider evaluator={evaluator}><View /></ResilioProvider>);
    await act(async () => screen.getByText('present').click());

    expect(screen.getByText('errors.emailTaken')).toBeTruthy();
    expect(screen.getByText('inline')).toBeTruthy();
  });

  it('preserves multiple distinct presentations on the same channel', async () => {
    function View() {
      const present = usePresentError();
      return (
        <>
          <button onClick={() => {
            void present({ code: 'SESSION_EXPIRED' }, { source: 'first' });
            void present({ code: 'SESSION_EXPIRED' }, { source: 'second' });
          }}>
            present twice
          </button>
          <ResilioPresentationHost>
            {({ active }) => <span>active: {active.length}</span>}
          </ResilioPresentationHost>
        </>
      );
    }

    render(<ResilioProvider evaluator={evaluator}><View /></ResilioProvider>);
    await act(async () => screen.getByText('present twice').click());

    expect(screen.getByText('active: 2')).toBeTruthy();
  });

  it('isolates renderer failures from the caller', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ResilioProvider
        evaluator={evaluator}
        renderers={{ modal: () => { throw new Error('renderer failed'); } }}
      >
        {children}
      </ResilioProvider>
    );
    const { result } = renderHook(() => usePresentError(), { wrapper });

    await act(async () => {
      await expect(
        result.current({ code: 'SESSION_EXPIRED' }, { source: 'manual' }),
      ).resolves.toMatchObject([{ decision: { channel: 'modal' } }]);
    });
  });

  it('dispatches a multi-decision plan and dismisses it by occurrence', async () => {
    const multiPolicy = definePresentationPolicy(catalog, {
      EMAIL_TAKEN: policy.EMAIL_TAKEN,
      SESSION_EXPIRED: [
        {
          decide: () => ({
            primary: {
              channel: 'modal',
              severity: 'error',
              messageKey: 'errors.sessionExpired',
            },
            supplements: [
              {
                channel: 'banner',
                severity: 'warning',
                messageKey: 'errors.signInAgain',
              },
            ],
          }),
        },
      ],
    });
    const multiEvaluator = createPresentationEvaluator({
      catalog,
      policy: multiPolicy,
      fallback: () => ({
        channel: 'toast',
        severity: 'error',
        messageKey: 'errors.fallback',
      }),
      idProvider: () => 'occurrence-1',
    });

    function View() {
      const present = usePresentError();
      return (
        <>
          <button onClick={() => void present({ code: 'SESSION_EXPIRED' }, { source: 'manual' })}>
            present plan
          </button>
          <ResilioPresentationHost>
            {({ active, dismissOccurrence }) => (
              <>
                <span>active plan: {active.length}</span>
                <button onClick={() => dismissOccurrence('occurrence-1')}>dismiss plan</button>
              </>
            )}
          </ResilioPresentationHost>
        </>
      );
    }

    render(<ResilioProvider evaluator={multiEvaluator}><View /></ResilioProvider>);
    await act(async () => screen.getByText('present plan').click());
    expect(screen.getByText('active plan: 2')).toBeTruthy();

    await act(async () => screen.getByText('dismiss plan').click());
    expect(screen.getByText('active plan: 0')).toBeTruthy();
  });
});
