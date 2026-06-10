// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, act, cleanup } from '@testing-library/react';
import { ResilioProvider } from './ResilioProvider.js';
import { useReportError } from './useResilio.js';
import * as z from 'zod';
import { defineErrorCatalog, PolicyEngine, defineErrorPolicy } from '@resilio/core';

afterEach(() => {
  cleanup();
});

const testCatalog = defineErrorCatalog({
  EMAIL_TAKEN: { params: z.object({ email: z.string().email() }) },
});

const testPolicy = defineErrorPolicy(testCatalog, {
  EMAIL_TAKEN: {
    feedback: 'toast',
    severity: 'error',
    message: (p) => `Email ${p.email} is already taken.`,
  },
});

function TestComponent({ errorToReport }: { errorToReport?: any }) {
  const report = useReportError();
  return (
    <div>
      <span data-testid="status">ready</span>
      {!!errorToReport && (
        <button data-testid="report-btn" onClick={() => report.public(errorToReport)}>
          Report
        </button>
      )}
    </div>
  );
}

describe('ResilioProvider and useResilio', () => {
  it('should throw an error when useResilio is used outside ResilioProvider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => render(<TestComponent />)).toThrow(
      'useResilio must be used within a ResilioProvider.'
    );
    
    consoleError.mockRestore();
  });

  it('should report public error and trigger feedback callback', () => {
    const feedback = vi.fn();
    const engine = new PolicyEngine({
      catalog: testCatalog,
      policy: testPolicy,
    });

    render(
      <ResilioProvider engine={engine} feedback={feedback}>
        <TestComponent errorToReport={{ code: 'EMAIL_TAKEN', params: { email: 'test@example.com' } }} />
      </ResilioProvider>
    );

    const button = screen.getByTestId('report-btn');
    
    act(() => {
      button.click();
    });

    expect(feedback).toHaveBeenCalledTimes(1);
    expect(feedback.mock.calls[0][0]).toMatchObject({
      feedback: 'toast',
      severity: 'error',
      message: 'Email test@example.com is already taken.',
    });
    expect(feedback.mock.calls[0][1]).toMatchObject({
      code: 'EMAIL_TAKEN',
      params: { email: 'test@example.com' },
    });
  });
});
