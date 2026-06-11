import { describe, expect, it } from 'vitest';
import * as z from 'zod';
import {
  createPresentationEvaluator,
  defineErrorCatalog,
  definePresentationPolicy,
} from '@resilio/core';
import { createResilioFormErrorMapper, createResilioFormValidator } from './form.js';

const catalog = defineErrorCatalog({
  INVALID_PROFILE: { params: z.object({ field: z.string() }) },
});
const evaluator = createPresentationEvaluator({
  catalog,
  policy: definePresentationPolicy(catalog, {
    INVALID_PROFILE: [{
      decide: ({ error }) => ({
        primary: {
          channel: 'inline',
          severity: 'error',
          messageKey: 'errors.invalidField',
          target: error.params.field,
        },
        supplements: [{
          channel: 'banner',
          severity: 'warning',
          messageKey: 'errors.reviewForm',
        }],
      }),
    }],
  }),
  fallback: () => ({
    channel: 'silent',
    severity: 'error',
    messageKey: 'errors.fallback',
  }),
});

describe('TanStack Form adapter', () => {
  it('maps inline decisions to fields and other decisions to form errors', async () => {
    const map = createResilioFormErrorMapper({ evaluator });
    await expect(map({
      code: 'INVALID_PROFILE',
      params: { field: 'email' },
    })).resolves.toEqual({
      fields: { email: 'errors.invalidField' },
      form: 'errors.reviewForm',
    });
  });

  it('creates a validator matching TanStack Form form-level validator output', async () => {
    const validator = createResilioFormValidator({
      evaluator,
      validate: (value: { email: string }) => value.email
        ? undefined
        : { code: 'INVALID_PROFILE', params: { field: 'email' } },
    });

    await expect(validator({ value: { email: '' } })).resolves.toMatchObject({
      fields: { email: 'errors.invalidField' },
    });
    await expect(validator({ value: { email: 'ok@example.com' } })).resolves.toBeUndefined();
  });
});
