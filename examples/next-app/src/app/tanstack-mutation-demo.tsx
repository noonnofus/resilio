'use client';

import { useMutation } from '@tanstack/react-query';
import { createPublicError } from '@resilio/next/client';
import { appCatalog } from './catalog';

export function TanStackMutationDemo() {
  const mutation = useMutation({
    mutationFn: async () => {
      throw createPublicError(appCatalog, 'RATE_LIMIT_ERROR', { retryAfter: 10 });
    },
    meta: {
      resilio: {
        context: { surface: 'tanstack-demo' },
      },
    },
  });

  return (
    <button onClick={() => mutation.mutate()} type="button">
      Trigger TanStack mutation
    </button>
  );
}
