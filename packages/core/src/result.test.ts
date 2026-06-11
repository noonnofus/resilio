import { describe, it, expect } from 'vitest';
import { ok, err, isOk, isErr, isPublicResult } from './result.js';

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

  it('recognizes only the minimal public result envelope', () => {
    expect(isPublicResult(ok('done'))).toBe(true);
    expect(isPublicResult(err({ code: 'FAILED' }))).toBe(true);
    expect(isPublicResult({ ok: true, data: 'done', error: 'unexpected' })).toBe(false);
    expect(isPublicResult({ ok: false })).toBe(false);
  });
});
