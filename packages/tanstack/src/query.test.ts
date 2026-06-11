import { describe, expect, it, vi } from 'vitest';
import {
  createResilioMutationCacheCallbacks,
  createResilioQueryCacheCallbacks,
} from './query.js';

describe('TanStack Query adapters', () => {
  it('dispatches query and mutation errors with their official callback sources', async () => {
    const present = vi.fn().mockResolvedValue([]);
    createResilioQueryCacheCallbacks({ present }).onError(
      { code: 'QUERY_FAILED' },
      { meta: { resilio: { context: { surface: 'dashboard' } } } },
    );
    createResilioMutationCacheCallbacks({ present }).onError(
      { code: 'MUTATION_FAILED' },
      undefined,
      undefined,
      {},
    );
    await vi.waitFor(() => expect(present).toHaveBeenCalledTimes(2));

    expect(present).toHaveBeenNthCalledWith(1, { code: 'QUERY_FAILED' }, {
      source: 'query',
      surface: 'dashboard',
      interaction: 'background',
    });
    expect(present).toHaveBeenNthCalledWith(2, { code: 'MUTATION_FAILED' }, {
      source: 'mutation',
      interaction: 'foreground',
    });
  });

  it('supports per-operation opt-out and error mapping', async () => {
    const present = vi.fn().mockResolvedValue([]);
    const callbacks = createResilioQueryCacheCallbacks({ present });
    callbacks.onError(new Error('ignored'), { meta: { resilio: { enabled: false } } });
    callbacks.onError(new Error('mapped'), {
      meta: { resilio: { mapError: () => ({ code: 'SAFE_ERROR' }) } },
    });
    await vi.waitFor(() => expect(present).toHaveBeenCalledTimes(1));
    expect(present).toHaveBeenCalledWith({ code: 'SAFE_ERROR' }, {
      source: 'query',
      interaction: 'background',
    });
  });

  it('reports inputs that are not recognized by the presentation policy', async () => {
    const error = new Error('unexpected');
    const reportException = vi.fn();
    createResilioQueryCacheCallbacks({
      present: vi.fn().mockResolvedValue(null),
      reportException,
    }).onError(error, {});
    await vi.waitFor(() => expect(reportException).toHaveBeenCalledTimes(1));
    expect(reportException).toHaveBeenCalledWith(error, {
      source: 'query',
      interaction: 'background',
    });
  });

  it('contains mapping failures so cache lifecycle semantics are unchanged', () => {
    const mappingError = new Error('mapping failed');
    const reportException = vi.fn();
    const callbacks = createResilioQueryCacheCallbacks({
      present: vi.fn(),
      reportException,
    });

    expect(() => callbacks.onError(new Error('query failed'), {
      meta: { resilio: { mapError: () => { throw mappingError; } } },
    })).not.toThrow();
    expect(reportException).toHaveBeenCalledWith(mappingError, { source: 'query' });
  });
});
