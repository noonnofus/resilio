import { describe, it, expect, vi } from 'vitest';
import { ResilioEmitter } from './emitter.js';
import { ResilioError } from './error.js';

describe('ResilioEmitter', () => {
  it('should notify subscribers on emit', () => {
    const emitter = new ResilioEmitter();
    const listener = vi.fn();
    const unsubscribe = emitter.subscribe(listener);

    const error: ResilioError = {
      kind: 'validation',
      message: 'Invalid input',
    };

    emitter.emit(error);
    expect(listener).toHaveBeenCalledWith(error);
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    emitter.emit(error);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
