import { describe, expect, it, vi } from 'vitest';
import { PolicyEngine, defineErrorCatalog, defineErrorPolicy } from '@resilio/core';
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
});
