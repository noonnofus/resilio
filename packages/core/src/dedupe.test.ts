import { describe, it, expect, vi, beforeEach } from 'vitest';
import { shouldSuppress } from './error.js';

describe('shouldSuppress (Deduplication)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('should not suppress if dedupeMs is not provided or zero', () => {
    const opts = { code: 'TEST_ERROR', dedupeMs: 0 };
    expect(shouldSuppress(opts)).toBe(false);
    expect(shouldSuppress(opts)).toBe(false);
  });

  it('should suppress consecutive duplicate errors within dedupeMs window', () => {
    const opts = { code: 'DUPLICATE_ERROR', dedupeMs: 1000 };
    
    // First trigger - not suppressed
    expect(shouldSuppress(opts)).toBe(false);
    
    // Second trigger within 1000ms - suppressed
    expect(shouldSuppress(opts)).toBe(true);

    // Advance time by 500ms - still suppressed
    vi.advanceTimersByTime(500);
    expect(shouldSuppress(opts)).toBe(true);

    // Advance time by another 600ms (total 1100ms) - not suppressed anymore
    vi.advanceTimersByTime(600);
    expect(shouldSuppress(opts)).toBe(false);
  });

  it('should distinguish errors with different params or fields', () => {
    const errA = { code: 'PARAM_ERROR', params: { userId: 1 }, dedupeMs: 1000 };
    const errB = { code: 'PARAM_ERROR', params: { userId: 2 }, dedupeMs: 1000 };
    const errC = { code: 'PARAM_ERROR', params: { userId: 1 }, field: 'email', dedupeMs: 1000 };

    expect(shouldSuppress(errA)).toBe(false);
    
    // errB has different params, should not be suppressed
    expect(shouldSuppress(errB)).toBe(false);

    // errC has same params as errA but different field, should not be suppressed
    expect(shouldSuppress(errC)).toBe(false);

    // Retry errA - should be suppressed since 1000ms has not passed
    expect(shouldSuppress(errA)).toBe(true);
  });
});
