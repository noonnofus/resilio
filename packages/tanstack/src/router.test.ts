import { describe, expect, it, vi } from 'vitest';
import { createResilioRouterErrorHandler, createResilioRouterLifecycle } from './router.js';

describe('TanStack Router adapter', () => {
  it('dispatches route errors and preserves not-found control flow', async () => {
    const present = vi.fn().mockResolvedValue([]);
    const handler = createResilioRouterErrorHandler({
      present,
      isNotFound: (error) => error === 'not-found',
      context: { surface: 'route' },
    });

    handler('not-found');
    handler({ code: 'ROUTE_FAILED' });
    await vi.waitFor(() => expect(present).toHaveBeenCalledTimes(1));
    expect(present).toHaveBeenCalledWith({ code: 'ROUTE_FAILED' }, {
      source: 'router',
      surface: 'route',
    });
  });

  it('provides the same noninterfering handler for router lifecycle integration points', async () => {
    const present = vi.fn().mockResolvedValue([]);
    const lifecycle = createResilioRouterLifecycle({ present });

    lifecycle.onError({ code: 'LOADER_FAILED' });
    lifecycle.onCatch({ code: 'CAUGHT_FAILED' });
    lifecycle.presentError({ code: 'COMPONENT_FAILED' });
    await vi.waitFor(() => expect(present).toHaveBeenCalledTimes(3));
  });
});
