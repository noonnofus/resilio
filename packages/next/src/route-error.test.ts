import { describe, expect, it, vi } from 'vitest';
import type { ErrorSink } from '@resilio/core';
import { createResilioOnRequestError } from './route-error.js';

describe('createResilioOnRequestError', () => {
  it('reports safe Next.js request context and awaits the sink', async () => {
    const sink: ErrorSink<any> = { report: vi.fn() };
    const handler = createResilioOnRequestError(sink);
    const error = Object.assign(new Error('database failed'), { digest: 'digest-1' });

    await handler(
      error,
      { path: '/users?secret=value', method: 'GET', headers: { cookie: 'secret' } },
      {
        routerKind: 'App Router',
        routePath: '/users',
        routeType: 'render',
        renderSource: 'server-rendering',
        revalidateReason: undefined,
      },
    );

    expect(sink.report).toHaveBeenCalledWith(expect.objectContaining({
      source: 'next.request',
      kind: 'exception',
      error,
      correlationId: 'digest-1',
      context: expect.objectContaining({
        path: '/users',
        method: 'GET',
        routerKind: 'App Router',
        routePath: '/users',
        routeType: 'render',
      }),
    }));
    expect(sink.report).not.toHaveBeenCalledWith(expect.objectContaining({
      context: expect.objectContaining({ headers: expect.anything() }),
    }));
  });

  it('does not reject when the telemetry sink fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const handler = createResilioOnRequestError({
      report: async () => {
        throw new Error('sink unavailable');
      },
    });

    await expect(handler(
      new Error('request failed'),
      { path: '/', method: 'GET', headers: {} },
      {
        routerKind: 'App Router',
        routePath: '/',
        routeType: 'render',
        revalidateReason: undefined,
      },
    )).resolves.toBeUndefined();

    consoleError.mockRestore();
  });
});
