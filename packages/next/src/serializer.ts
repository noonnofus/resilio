import { ResilioError, serializeError } from '@resilio/core';

export function sanitizeErrorForClient(
  error: ResilioError,
  unexpectedPolicy: 'throw' | 'safe' = 'throw'
): ResilioError {
  if (error.kind === 'server' || error.kind === 'unknown') {
    if (unexpectedPolicy === 'safe') {
      return {
        kind: 'server',
        message: 'An internal server error occurred.',
        presentation: 'toast',
      };
    }
  }
  return serializeError(error);
}
