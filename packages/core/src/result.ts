export type Result<T, E = unknown> =
  | { ok: true; data: T; error?: never }
  | { ok: false; error: E; data?: never };

export type PublicResult<T, E> = Result<T, E>;

export function ok<T>(data: T): Result<T, never> {
  return { ok: true, data };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

export function isOk<T, E>(result: Result<T, E>): result is { ok: true; data: T; error?: never } {
  return result.ok;
}

export function isErr<T, E>(result: Result<T, E>): result is { ok: false; error: E; data?: never } {
  return !result.ok;
}

export function isPublicResult(value: unknown): value is PublicResult<unknown, unknown> {
  if (typeof value !== 'object' || value === null || !('ok' in value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  if (candidate.ok === true) {
    return 'data' in candidate && !('error' in candidate);
  }
  if (candidate.ok === false) {
    return 'error' in candidate && !('data' in candidate);
  }
  return false;
}
