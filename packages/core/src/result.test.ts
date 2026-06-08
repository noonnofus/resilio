import { describe, it, expect } from 'vitest';
import { ok, err, isOk, isErr } from './result.js';

describe('result helper utilities', () => {
  it('should create an ok result', () => {
    const res = ok({ value: 42 });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.value).toBe(42);
    }
  });

  it('should create an error result', () => {
    const res = err({ kind: 'validation', message: 'invalid field' });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.message).toBe('invalid field');
    }
  });

  it('should guard type check correctly using isOk and isErr', () => {
    const success = ok('hello');
    const failure = err({ kind: 'server', message: 'internal' });

    expect(isOk(success)).toBe(true);
    expect(isOk(failure)).toBe(false);
    expect(isErr(success)).toBe(false);
    expect(isErr(failure)).toBe(true);
  });
});
