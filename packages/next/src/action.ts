import { ResilioError, Result, normalizeError, resilioLogger } from '@resilio/core';
import { sanitizeErrorForClient } from './serializer.js';

export type ActionResult<T, E = ResilioError> = Result<T, E>;

export interface ActionConfig {
  unexpectedPolicy?: 'throw' | 'safe';
  logServerErrors?: boolean;
}

export function createResilioAction<State, Payload, Data>(
  handler: (prevState: State, payload: Payload) => Promise<ActionResult<Data> | State>,
  config: ActionConfig = {}
): (prevState: ActionResult<Data> | State, payload: Payload) => Promise<ActionResult<Data> | State> {
  const unexpectedPolicy = config.unexpectedPolicy ?? 'throw';
  const logServerErrors = config.logServerErrors ?? true;

  return async (prevState, payload) => {
    try {
      const result = await handler(prevState as State, payload);
      return result;
    } catch (error) {
      const normalized = normalizeError(error, { defaultKind: 'server', defaultPresentation: 'boundary' });

      if (logServerErrors) {
        resilioLogger.log(normalized, { serverSide: true });
      }

      if (unexpectedPolicy === 'throw' && (normalized.kind === 'server' || normalized.kind === 'unknown')) {
        throw error;
      }

      const sanitized = sanitizeErrorForClient(normalized, unexpectedPolicy);
      return { ok: false, error: sanitized } as ActionResult<Data>;
    }
  };
}
