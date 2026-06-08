'use server';

import { createResilioAction } from '@resilio/next';
import { err, ok } from '@resilio/core';

export const updateProfile = createResilioAction(async (_prevState: any, formData: FormData) => {
  const name = formData.get('name');

  if (typeof name !== 'string' || name.trim().length < 2) {
    return err({
      kind: 'validation',
      message: '이름은 최소 2글자 이상이어야 합니다.',
      fields: { name: ['2글자 이상 입력해 주세요.'] },
      presentation: 'inline',
    });
  }

  return ok({
    message: `Profile updated successfully to ${name}!`,
  });
});

export const triggerToastError = createResilioAction(async (_prevState: any) => {
  return err({
    kind: 'rate_limit',
    message: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.',
    presentation: 'toast',
    retryable: true,
  });
});

export const triggerUnexpectedError = createResilioAction(async (_prevState: any) => {
  throw new Error('Fatal database connection failed!');
});
