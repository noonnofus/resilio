import { ResilioError, serializeError } from '@resilio/core';

export function sanitizeErrorForClient(
  error: ResilioError,
): ResilioError {
  if (error.kind === 'server' || error.kind === 'unknown') {
    throw new Error('Unexpected server errors must be thrown and handled by the Next.js error boundary.');
  }
  return serializeError(error);
}
