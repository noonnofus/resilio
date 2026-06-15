import { describe, expect, it, vi } from 'vitest';
import { PolicyEngine, defineErrorCatalog, defineErrorPolicy } from '@resiliojs/core';
import { createResilioRootHandlers } from './root-handlers.js';

describe('createResilioRootHandlers', () => {
  it('maps each React root callback to the correct source', async () => {
    const catalog = defineErrorCatalog({ TEST: {} });
    const sink = { report: vi.fn() };
    const engine = new PolicyEngine({
      catalog,
      policy: defineErrorPolicy(catalog, {
        TEST: { feedback: 'silent', message: 'test' },
      }),
      sink,
    });
    const handlers = createResilioRootHandlers(engine);

    handlers.onCaughtError(new Error('caught'), { componentStack: 'caught-stack' });
    handlers.onUncaughtError(new Error('uncaught'), { componentStack: 'uncaught-stack' });
    handlers.onRecoverableError(new Error('recoverable'), { componentStack: 'recoverable-stack' });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(sink.report.mock.calls.map(([event]) => event.source)).toEqual([
      'react.caught',
      'react.uncaught',
      'react.recoverable',
    ]);
  });

  it('does not report the same Error object twice across React callbacks', async () => {
    const catalog = defineErrorCatalog({ TEST: {} });
    const sink = { report: vi.fn() };
    const engine = new PolicyEngine({
      catalog,
      policy: defineErrorPolicy(catalog, {
        TEST: { feedback: 'silent', message: 'test' },
      }),
      sink,
    });
    const handlers = createResilioRootHandlers(engine);
    const error = new Error('same error');

    handlers.onCaughtError(error, { componentStack: 'stack' });
    handlers.onCaughtError(error, { componentStack: 'stack' });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(sink.report).toHaveBeenCalledTimes(1);

    handlers.onCaughtError(error, { componentStack: 'stack' });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(sink.report).toHaveBeenCalledTimes(2);
  });

  it('accepts a narrow exception reporter without a policy engine', () => {
    const reporter = { reportException: vi.fn() };
    const handlers = createResilioRootHandlers(reporter);
    const error = new Error('caught');

    handlers.onCaughtError(error, { componentStack: 'stack' });

    expect(reporter.reportException).toHaveBeenCalledWith(
      error,
      { componentStack: 'stack' },
      'react.caught',
    );
  });
});
