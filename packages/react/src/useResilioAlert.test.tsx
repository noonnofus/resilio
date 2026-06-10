// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, cleanup } from '@testing-library/react';
import { ResilioProvider } from './ResilioProvider.js';
import { useResilioAlert } from './useResilioAlert.js';
import { Result, err, ok } from '@resilio/core';
import * as z from 'zod';
import { defineErrorCatalog, PolicyEngine, defineErrorPolicy } from '@resilio/core';

afterEach(() => {
  cleanup();
});

const testCatalog = defineErrorCatalog({
  AUTH_FAILED: { params: z.object({ message: z.string() }) },
});

const testPolicy = defineErrorPolicy(testCatalog, {
  AUTH_FAILED: {
    feedback: 'toast',
    severity: 'error',
    message: (p) => p.message,
  },
});

function TestAlertComponent({ state }: { state: Result<any, any> | null }) {
  useResilioAlert(state);
  return <div data-testid="status">active</div>;
}

describe('useResilioAlert', () => {
  it('should not report if state is null or ok is true', () => {
    const feedback = vi.fn();
    const engine = new PolicyEngine({
      catalog: testCatalog,
      policy: testPolicy,
    });

    render(
      <ResilioProvider engine={engine} feedback={feedback}>
        <TestAlertComponent state={null} />
        <TestAlertComponent state={ok({ val: 'success' })} />
      </ResilioProvider>
    );

    expect(feedback).not.toHaveBeenCalled();
  });

  it('should automatically report once when state.ok is false', () => {
    const feedback = vi.fn();
    const engine = new PolicyEngine({
      catalog: testCatalog,
      policy: testPolicy,
    });
    
    const errorState = err({
      code: 'AUTH_FAILED',
      params: { message: 'Invalid password' },
    });

    render(
      <ResilioProvider engine={engine} feedback={feedback}>
        <TestAlertComponent state={errorState} />
      </ResilioProvider>
    );

    expect(feedback).toHaveBeenCalledTimes(1);
    expect(feedback.mock.calls[0][0]).toMatchObject({
      feedback: 'toast',
      severity: 'error',
      message: 'Invalid password',
    });
  });
});
