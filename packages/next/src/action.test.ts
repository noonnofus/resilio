import { describe, it, expect, vi } from 'vitest';
import { createResilioAction } from './action.js';
import { toActionState } from './action-state.js';
import * as z from 'zod';
import { defineErrorCatalog } from '@resilio/core';

const testCatalog = defineErrorCatalog({
  FAIL_TEST: { params: z.object({ message: z.string() }) },
});

describe('createResilioAction', () => {
  it('should return the successful Result on success', async () => {
    const handler = async (prevState: any, payload: string) => {
      return { ok: true as const, data: { value: `Hello, ${payload}` } };
    };

    const action = createResilioAction(handler);
    const result = await action(toActionState(null), 'World');

    expect(result).toEqual({
      ok: true,
      data: { value: 'Hello, World' },
    });
  });

  it('should return structured expected error', async () => {
    const handler = async () => {
      return {
        ok: false as const,
        error: {
          code: 'FAIL_TEST' as const,
          params: { message: 'invalid input' },
        },
      };
    };

    const action = createResilioAction<void, typeof testCatalog>(handler);
    const result = await action(toActionState(null) as any, null);

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'FAIL_TEST',
        params: { message: 'invalid input' },
      },
    });
  });

  it('should throw unexpected server errors by default configuration', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const action = createResilioAction(async () => {
      throw new Error('Database crash!');
    }, { unexpectedPolicy: 'throw' });
    
    await expect(action(toActionState(null), null)).rejects.toThrow('Database crash!');

    consoleError.mockRestore();
  });

  it('should sanitize and return internal server error under safe configuration policy', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const action = createResilioAction(async () => {
      throw new Error('Sensitive SQL Query error!');
    }, { unexpectedPolicy: 'safe' });
    
    const result = await action(toActionState(null), null);

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected server error occurred.',
      },
    });

    consoleError.mockRestore();
  });
});
