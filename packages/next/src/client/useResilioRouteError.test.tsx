// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PolicyEngine, ResilioProvider, defineErrorCatalog, defineErrorPolicy } from '@resiliojs/react';
import { useResilioRouteError } from './useResilioRouteError.js';

afterEach(cleanup);

describe('useResilioRouteError', () => {
  it('reports a route error once and blocks repeated reset loops', async () => {
    const catalog = defineErrorCatalog({ TEST: {} });
    const sink = { report: vi.fn() };
    const engine = new PolicyEngine({
      catalog,
      policy: defineErrorPolicy(catalog, { TEST: { feedback: 'silent', message: 'test' } }),
      sink,
    });
    const reset = vi.fn();
    const error = Object.assign(new Error('route failed'), { digest: 'digest-1' });

    function ErrorPage() {
      const routeError = useResilioRouteError(error, reset, { maxResets: 1 });
      return (
        <>
          <button onClick={routeError.reset}>retry route</button>
          <span>{routeError.resetBlocked ? 'blocked' : 'ready'}</span>
        </>
      );
    }

    const { rerender } = render(
      <ResilioProvider engine={engine}><ErrorPage /></ResilioProvider>,
    );
    rerender(<ResilioProvider engine={engine}><ErrorPage /></ResilioProvider>);
    await vi.waitFor(() => expect(sink.report).toHaveBeenCalledTimes(1));
    expect(sink.report).toHaveBeenCalledWith(expect.objectContaining({
      source: 'next.route',
      correlationId: 'digest-1',
    }));

    fireEvent.click(screen.getByText('retry route'));
    fireEvent.click(screen.getByText('retry route'));
    expect(reset).toHaveBeenCalledTimes(1);
    expect(screen.getByText('blocked')).toBeTruthy();
  });
});
