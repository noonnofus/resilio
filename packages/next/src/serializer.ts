import { ResilioError, serializeError } from '@resiliojs/core';

/**
 * @deprecated This legacy helper preserves expected-error messages and is not a
 * general-purpose secret scrubber. Return catalog-backed `PublicActionResult`
 * values created with `createPublicError` instead.
 */
export function sanitizeErrorForClient(
  error: ResilioError,
): ResilioError {
  if (error.kind === 'server' || error.kind === 'unknown') {
    throw new Error('Unexpected server errors must be thrown and handled by the Next.js error boundary.');
  }
  return serializeError(error);
}
