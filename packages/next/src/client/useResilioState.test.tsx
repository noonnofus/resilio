// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import React, { startTransition } from 'react';
import { render, screen, act, cleanup } from '@testing-library/react';
import { ResilioPresentationHost, ResilioProvider } from '@resiliojs/react';
import { useResilioState, type ResilioActionState } from './useResilioState.js';
import * as z from 'zod';
import {
  createPresentationEvaluator,
  defineErrorCatalog,
  definePresentationPolicy,
  PolicyEngine,
  defineErrorPolicy,
  PublicActionResult,
} from '@resiliojs/next';

afterEach(() => {
  cleanup();
});

const testCatalog = defineErrorCatalog({
  FAIL_TEST: { params: z.object({ message: z.string() }) },
});

const testPolicy = defineErrorPolicy(testCatalog, {
  FAIL_TEST: {
    feedback: 'toast',
    severity: 'error',
    message: (p) => p.message,
  },
});

interface DemoData {
  success: boolean;
}

function TestStateComponent({
  action,
  onSuccess,
  onError,
}: {
  action: (
    state: ResilioActionState<DemoData, typeof testCatalog>,
    payload: void,
  ) => Promise<PublicActionResult<DemoData, typeof testCatalog>>;
  onSuccess: (data: DemoData) => void;
  onError: (error: any) => void;
}) {
  const [state, execute, isPending] = useResilioState(action, {
    catalog: testCatalog,
    onSuccess,
    onError,
  });

  return (
    <div>
      <span data-testid="pending">{isPending ? 'true' : 'false'}</span>
      <span data-testid="status">{state?.ok ? 'ok' : 'err'}</span>
      <button data-testid="submit-btn" onClick={() => startTransition(() => execute())}>
        Execute
      </button>
    </div>
  );
}

describe('useResilioState', () => {
  it('should trigger onSuccess and execute action successfully', async () => {
    const action = async () => ({ ok: true as const, data: { success: true } });
    const onSuccess = vi.fn();
    const onError = vi.fn();
    const feedback = vi.fn();
    
    const engine = new PolicyEngine({
      catalog: testCatalog,
      policy: testPolicy,
    });

    render(
      <ResilioProvider engine={engine} feedback={feedback}>
        <TestStateComponent action={action} onSuccess={onSuccess} onError={onError} />
      </ResilioProvider>
    );

    const button = screen.getByTestId('submit-btn');
    
    await act(async () => {
      button.click();
    });

    expect(onSuccess).toHaveBeenCalledWith({ success: true });
    expect(onError).not.toHaveBeenCalled();
    expect(feedback).not.toHaveBeenCalled();
    expect(screen.getByTestId('status').textContent).toBe('ok');
  });

  it('should trigger onError and report to global provider on error', async () => {
    const errorPayload = { code: 'FAIL_TEST' as const, params: { message: 'failed test' } };
    const action = async () => ({ ok: false as const, error: errorPayload });
    const onSuccess = vi.fn();
    const onError = vi.fn();
    const feedback = vi.fn();

    const engine = new PolicyEngine({
      catalog: testCatalog,
      policy: testPolicy,
    });

    render(
      <ResilioProvider engine={engine} feedback={feedback}>
        <TestStateComponent action={action} onSuccess={onSuccess} onError={onError} />
      </ResilioProvider>
    );

    const button = screen.getByTestId('submit-btn');
    
    await act(async () => {
      button.click();
    });

    expect(onError).toHaveBeenCalledWith(errorPayload);
    expect(onSuccess).not.toHaveBeenCalled();
    expect(feedback).toHaveBeenCalledTimes(1);
    expect(feedback.mock.calls[0][0]).toMatchObject({
      feedback: 'toast',
      severity: 'error',
      message: 'failed test',
    });
    expect(screen.getByTestId('status').textContent).toBe('err');
  });

  it('should reject invalid action payloads before policy evaluation', async () => {
    const action = async () => ({
      ok: false as const,
      error: { code: 'UNKNOWN_CODE', stack: 'sensitive' },
    }) as any;
    const onSuccess = vi.fn();
    const onError = vi.fn();
    const onInvalidPublicError = vi.fn();
    const feedback = vi.fn();
    const sink = { report: vi.fn() };

    const engine = new PolicyEngine({
      catalog: testCatalog,
      policy: testPolicy,
      sink,
    });

    function InvalidPayloadComponent() {
      const [state, execute] = useResilioState(action, {
        catalog: testCatalog,
        onInvalidPublicError,
      });
      return (
        <>
          <span data-testid="invalid-status">{state?.ok ? 'ok' : 'err'}</span>
          <button
            data-testid="invalid-submit"
            onClick={() => startTransition(() => execute(undefined))}
          >
            Execute
          </button>
        </>
      );
    }

    render(
      <ResilioProvider engine={engine} feedback={feedback}>
        <InvalidPayloadComponent />
      </ResilioProvider>
    );

    await act(async () => {
      screen.getByTestId('invalid-submit').click();
    });

    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
    expect(onInvalidPublicError).toHaveBeenCalledWith('invalid_shape');
    expect(feedback).not.toHaveBeenCalled();
    expect(sink.report).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'invalid_public_error',
      reason: 'invalid_shape',
    }));
  });

  it('automatically presents expected action errors without a legacy engine', async () => {
    const action = async () => ({
      ok: false as const,
      error: { code: 'FAIL_TEST' as const, params: { message: 'failed test' } },
    });
    const evaluator = createPresentationEvaluator({
      catalog: testCatalog,
      policy: definePresentationPolicy(testCatalog, {
        FAIL_TEST: [{
          decide: () => ({
            channel: 'inline',
            severity: 'error',
            messageKey: 'errors.failed',
            target: 'name',
          }),
        }],
      }),
      fallback: () => ({
        channel: 'silent',
        severity: 'error',
        messageKey: 'errors.fallback',
      }),
    });

    function AutomaticPresentationComponent() {
      const [, execute] = useResilioState(action, {
        catalog: testCatalog,
        presentation: { surface: 'profile-form' },
      });
      return (
        <>
          <button onClick={() => startTransition(() => execute(undefined))}>execute automatic</button>
          <ResilioPresentationHost>
            {({ active }) => <span>presentations: {active.length}</span>}
          </ResilioPresentationHost>
        </>
      );
    }

    render(
      <ResilioProvider evaluator={evaluator}>
        <AutomaticPresentationComponent />
      </ResilioProvider>,
    );
    await act(async () => screen.getByText('execute automatic').click());

    expect(screen.getByText('presentations: 1')).toBeTruthy();
  });
});
