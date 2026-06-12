import type { PresentationContext } from '@resiliojs/core';
import {
  dispatchTanStackError,
  type TanStackPresentationOptions,
} from './shared.js';

export interface ResilioTanStackMeta {
  [key: string]: unknown;
  resilio?: {
    enabled?: boolean;
    mapError?: (error: unknown) => unknown;
    context?: Omit<PresentationContext, 'source'>;
  };
}

export interface QueryLike {
  meta?: Record<string, unknown>;
}

export interface MutationLike {
  meta?: Record<string, unknown>;
}

export interface ResilioQueryCacheCallbacks {
  onError(error: unknown, query: QueryLike): void;
}

export interface ResilioMutationCacheCallbacks {
  onError(
    error: unknown,
    variables: unknown,
    context: unknown,
    mutation: MutationLike,
  ): void | Promise<void>;
}

export function createResilioQueryCacheCallbacks(
  options: TanStackPresentationOptions,
): ResilioQueryCacheCallbacks {
  return {
    onError(error, query) {
      dispatchFromMeta(error, query.meta, 'query', options);
    },
  };
}

export function createResilioMutationCacheCallbacks(
  options: TanStackPresentationOptions,
): ResilioMutationCacheCallbacks {
  return {
    onError(error, _variables, _context, mutation) {
      dispatchFromMeta(error, mutation.meta, 'mutation', options);
    },
  };
}

function dispatchFromMeta(
  error: unknown,
  meta: Record<string, unknown> | undefined,
  source: 'query' | 'mutation',
  options: TanStackPresentationOptions,
): void {
  const resilio = getResilioMeta(meta);
  if (resilio?.enabled === false) return;
  let mapped = error;
  try {
    mapped = resilio?.mapError ? resilio.mapError(error) : error;
  } catch (mappingError) {
    options.reportException?.(mappingError, { source });
    return;
  }
  dispatchTanStackError(mapped, {
    ...resilio?.context,
    source,
    interaction: resilio?.context?.interaction ??
      (source === 'query' ? 'background' : 'foreground'),
  }, options);
}

function getResilioMeta(
  meta: Record<string, unknown> | undefined,
): ResilioTanStackMeta['resilio'] | undefined {
  const value = meta?.resilio;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  return value as ResilioTanStackMeta['resilio'];
}
