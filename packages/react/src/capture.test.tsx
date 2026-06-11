// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PolicyEngine, defineErrorCatalog, defineErrorPolicy } from '@resilio/core';
import { ResilioProvider } from './ResilioProvider.js';
import { capture, captureAsync, useResilioHandler } from './capture.js';

afterEach(cleanup);

describe('capture helpers', () => {
  it('reports and rethrows synchronous errors without changing success values', () => {
    const report = vi.fn();
    const success = capture((value: number) => value * 2, report);
    expect(success(2)).toBe(4);

    const error = new Error('failed');
    const failure = capture(() => { throw error; }, report, { source: 'react.event' });
    expect(() => failure()).toThrow(error);
    expect(report).toHaveBeenCalledWith(error, { source: 'react.event' });
  });

  it('reports and rejects with the original asynchronous error', async () => {
    const report = vi.fn();
    const error = new Error('async failed');
    const failure = captureAsync(async () => { throw error; }, report, { source: 'react.async' });

    await expect(failure()).rejects.toBe(error);
    expect(report).toHaveBeenCalledWith(error, { source: 'react.async' });
  });

  it('connects event handlers to the optional provider engine', async () => {
    const catalog = defineErrorCatalog({ TEST: {} });
    const sink = { report: vi.fn() };
    const engine = new PolicyEngine({
      catalog,
      policy: defineErrorPolicy(catalog, { TEST: { feedback: 'silent', message: 'test' } }),
      sink,
    });
    const error = new Error('event failed');
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ResilioProvider engine={engine}>{children}</ResilioProvider>
    );
    const { result } = renderHook(
      () => useResilioHandler(() => { throw error; }),
      { wrapper },
    );

    expect(() => result.current()).toThrow(error);
    await act(async () => undefined);
    expect(sink.report).toHaveBeenCalledWith(expect.objectContaining({
      source: 'react.event',
      kind: 'exception',
      error,
    }));
  });
});
