'use client';

import { useResilioState } from '@resilio/next/client';
import { appCatalog } from './catalog';
import { updateProfile } from './actions';

export function ProfileForm() {
  const [state, action, pending] = useResilioState(updateProfile, {
    catalog: appCatalog,
  });

  return (
    <form action={action}>
      <label htmlFor="name">Name</label>
      <input id="name" name="name" />
      <button disabled={pending} type="submit">
        {pending ? 'Saving...' : 'Save'}
      </button>
      {!state.ok && <p role="alert">입력 내용을 확인해 주세요.</p>}
      {state.ok && state.data && <p>Saved: {state.data.savedName}</p>}
    </form>
  );
}
