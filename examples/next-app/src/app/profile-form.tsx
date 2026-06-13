'use client';

import {
  createPublicError,
  usePresentError,
  useResilioInline,
  useResilioState,
} from '@resiliojs/next/client';
import { appCatalog } from './catalog';
import { updateProfile } from './actions';

export function ProfileForm() {
  const present = usePresentError();
  const nameError = useResilioInline({ surface: 'profile-form', target: 'name' });
  const [state, action, pending] = useResilioState(updateProfile, {
    catalog: appCatalog,
    presentation: { surface: 'profile-form' },
  });

  return (
    <form action={action}>
      <label htmlFor="name">Name</label>
      <input id="name" name="name" />
      <button disabled={pending} type="submit">
        {pending ? 'Saving...' : 'Save'}
      </button>
      <button
        onClick={() => void present(
          createPublicError(appCatalog, 'RATE_LIMIT_ERROR', { retryAfter: 5 }),
          { source: 'manual', surface: 'profile-form', interaction: 'foreground' },
        )}
        type="button"
      >
        Show custom modal
      </button>
      {nameError && <p role="alert">{nameError.decision.messageKey}</p>}
      {state.ok && state.data && <p>Saved: {state.data.savedName}</p>}
    </form>
  );
}
