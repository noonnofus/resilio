// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PolicyEngine, defineErrorCatalog, defineErrorPolicy } from '@resiliojs/core';
import { ResilioErrorBoundary } from './ResilioErrorBoundary.js';
import { ResilioProvider } from './ResilioProvider.js';

afterEach(cleanup);

function Boom(): React.ReactNode {
  throw new Error('render failed');
}

describe('ResilioErrorBoundary', () => {
  it('reports descendant render errors and renders a custom fallback', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const catalog = defineErrorCatalog({ TEST: {} });
    const sink = { report: vi.fn() };
    const engine = new PolicyEngine({
      catalog,
      policy: defineErrorPolicy(catalog, { TEST: { feedback: 'silent', message: 'test' } }),
      sink,
    });

    render(
      <ResilioProvider engine={engine}>
        <ResilioErrorBoundary fallback={({ error }) => <span>{error.message}</span>}>
          <Boom />
        </ResilioErrorBoundary>
      </ResilioProvider>,
    );

    await vi.waitFor(() => expect(sink.report).toHaveBeenCalledTimes(1));
    expect(screen.getByText('render failed')).toBeTruthy();
    consoleError.mockRestore();
  });

  it('blocks repeated reset loops and renders the final fallback', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <ResilioErrorBoundary
        maxResets={1}
        fallback={({ reset }) => <button onClick={reset}>retry</button>}
        finalFallback={<span>final fallback</span>}
      >
        <Boom />
      </ResilioErrorBoundary>,
    );

    fireEvent.click(screen.getByText('retry'));
    fireEvent.click(screen.getByText('retry'));

    expect(screen.getByText('final fallback')).toBeTruthy();
    consoleError.mockRestore();
  });

  it('always invokes the consumer onError callback', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const onError = vi.fn();

    render(
      <ResilioErrorBoundary fallback={<span>fallback</span>} onError={onError}>
        <Boom />
      </ResilioErrorBoundary>,
    );

    await vi.waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    consoleError.mockRestore();
  });
});
