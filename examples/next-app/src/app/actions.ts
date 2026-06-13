'use server';

import { createPublicError, type PublicActionResult } from '@resiliojs/next';
import { appCatalog } from './catalog';

export type ProfileActionState = PublicActionResult<
  { savedName: string } | null,
  typeof appCatalog
>;

export async function updateProfile(
  _previousState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const name = formData.get('name');

  if (typeof name !== 'string' || name.trim().length < 2) {
    return {
      ok: false,
      error: createPublicError(appCatalog, 'VALIDATION_ERROR', { field: 'name' }),
    };
  }

  return { ok: true, data: { savedName: name.trim() } };
}

export async function triggerUnexpectedError(): Promise<never> {
  throw new Error('Example unexpected server exception');
}
