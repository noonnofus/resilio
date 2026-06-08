import { describe, it, expect, vi } from 'vitest';
import { withRetry } from './retry.js';

describe('withRetry utility', () => {
  it('should return value on immediate success', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const res = await withRetry(fn);
    expect(res).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on retryable error and succeed', async () => {
    const error = new Error('network timeout');
    const fn = vi
      .fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce('resolved on second attempt');

    const res = await withRetry(fn, { delayMs: 10, maxAttempts: 2 });
    expect(res).toBe('resolved on second attempt');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should not retry on non-retryable error and throw immediately', async () => {
    const error = new Error('fatal db error');
    const fn = vi.fn().mockRejectedValue(error);

    await expect(withRetry(fn, { delayMs: 10, maxAttempts: 3 })).rejects.toThrow('fatal db error');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
