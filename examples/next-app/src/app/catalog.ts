import { defineErrorCatalog, defineErrorPolicy } from '@resilio/next';
import * as z from 'zod';

export const appCatalog = defineErrorCatalog({
  VALIDATION_ERROR: {
    params: z.object({
      field: z.enum(['name']),
    }),
  },
  RATE_LIMIT_ERROR: {
    params: z.object({
      retryAfter: z.number().int().nonnegative(),
    }),
  },
});

export const appPolicy = defineErrorPolicy(appCatalog, {
  VALIDATION_ERROR: {
    feedback: 'inline',
    severity: 'error',
    message: () => '이름은 최소 2글자 이상이어야 합니다.',
    field: 'name',
  },
  RATE_LIMIT_ERROR: {
    feedback: 'toast',
    severity: 'warning',
    message: (p) => `${p.retryAfter}초 후 다시 시도해 주세요.`,
  },
});
