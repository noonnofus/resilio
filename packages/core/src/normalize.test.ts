import { describe, it, expect } from 'vitest';
import { normalizeError, serializeError, isRetryableError } from './normalize.js';

describe('normalize error utilities', () => {
  it('should normalize null and undefined', () => {
    const errorFromNull = normalizeError(null);
    expect(errorFromNull.kind).toBe('unknown');
    expect(errorFromNull.message).toBe('An unexpected error occurred.');

    const errorFromUndefined = normalizeError(undefined, {
      defaultKind: 'server',
      defaultMessage: 'custom default',
    });
    expect(errorFromUndefined.kind).toBe('server');
    expect(errorFromUndefined.message).toBe('custom default');
  });

  it('should pass through existing ResilioError', () => {
    const original = {
      kind: 'validation' as const,
      message: 'Email already exists',
      code: 'EMAIL_TAKEN',
      fields: { email: ['taken'] },
      presentation: 'inline' as const,
    };
    const normalized = normalizeError(original);
    expect(normalized.kind).toBe('validation');
    expect(normalized.message).toBe('Email already exists');
    expect(normalized.code).toBe('EMAIL_TAKEN');
    expect(normalized.fields?.email).toEqual(['taken']);
    expect(normalized.presentation).toBe('inline');
  });

  it('should infer error kinds from standard Error objects', () => {
    const valError = new Error('Validation failed for name');
    expect(normalizeError(valError).kind).toBe('validation');

    const authError = new Error('Unauthorized access');
    expect(normalizeError(authError).kind).toBe('authorization');

    const netError = new TypeError('Fetch failed due to timeout');
    expect(normalizeError(netError).kind).toBe('network');
  });

  it('should correctly evaluate retryable flags', () => {
    expect(isRetryableError(new Error('timeout'))).toBe(true);
    expect(isRetryableError(new Error('429 too many requests'))).toBe(true);
    expect(isRetryableError(new Error('database error'))).toBe(false);
    expect(isRetryableError({ kind: 'network' })).toBe(true);
  });

  it('should strip original traces and keep only serializable keys in serializeError', () => {
    const err = {
      kind: 'server' as const,
      message: 'DB failed',
      code: 'DB_ERROR',
      extraNonSerializable: () => {},
    };
    const serialized = serializeError(err as any);
    expect(serialized).toEqual({
      kind: 'server',
      message: 'DB failed',
      code: 'DB_ERROR',
      fields: undefined,
      retryable: undefined,
      presentation: undefined,
    });
  });
});
