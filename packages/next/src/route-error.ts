import { normalizeError, globalResilioEmitter, ResilioError } from '@resilio/core';

export interface RouteErrorOptions {
  digest?: string;
}

export function reportRouteError(
  error: unknown,
  options: RouteErrorOptions = {}
): ResilioError {
  const normalized = normalizeError(error, {
    defaultKind: 'server',
    defaultPresentation: 'boundary',
  });

  if (options.digest) {
    normalized.code = options.digest;
  }

  globalResilioEmitter.emit(normalized);

  return normalized;
}
