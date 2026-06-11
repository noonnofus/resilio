# Resilio

Resilio is a typed Error Presentation Policy Layer for React, Next.js, and TanStack.
It decodes safe public errors and turns them into headless UI decisions such as
`inline`, `toast`, `modal`, `banner`, or project-defined channels.

Resilio does not own fetching, retry, navigation, validation timing, or actual UI
components. Unexpected exceptions remain in the framework fallback path and can
optionally be reported through observability bridges.

## Packages

| Package | Purpose |
|---|---|
| `@resilio/core` | Catalog, runtime decoder, exhaustive policy, plans, dedupe |
| `@resilio/react` | Provider, hosts, renderers, boundary, capture bridges |
| `@resilio/next` | Server/client facade, Server Action and route bridges |
| `@resilio/tanstack` | Query, Router, and Form lifecycle adapters |

## Core Policy

```ts
import {
  createPresentationEvaluator,
  defineErrorCatalog,
  definePresentationPolicy,
} from '@resilio/core';
import * as z from 'zod';

const catalog = defineErrorCatalog({
  EMAIL_TAKEN: { params: z.object({ email: z.string().email() }) },
  SESSION_EXPIRED: {},
});

const policy = definePresentationPolicy(catalog, {
  EMAIL_TAKEN: [{
    decide: () => ({
      primary: {
        channel: 'inline',
        severity: 'error',
        messageKey: 'errors.emailTaken',
        target: 'email',
      },
      supplements: [{
        channel: 'banner',
        severity: 'warning',
        messageKey: 'errors.reviewForm',
      }],
    }),
  }],
  SESSION_EXPIRED: [{
    decide: () => ({
      channel: 'modal',
      severity: 'error',
      messageKey: 'errors.sessionExpired',
    }),
  }],
});

export const evaluator = createPresentationEvaluator({
  catalog,
  policy,
  fallback: () => ({
    channel: 'silent',
    severity: 'error',
    messageKey: 'errors.fallback',
  }),
});
```

## React

```tsx
import {
  ResilioPresentationHost,
  ResilioProvider,
  usePresentError,
} from '@resilio/react';

function Root({ children }: { children: React.ReactNode }) {
  return (
    <ResilioProvider evaluator={evaluator}>
      {children}
      <ResilioPresentationHost>
        {({ active, dismiss }) => active.map((item) => (
          <YourProjectUI
            key={item.id}
            decision={item.decision}
            onClose={() => dismiss(item.id)}
          />
        ))}
      </ResilioPresentationHost>
    </ResilioProvider>
  );
}

function SaveButton() {
  const present = usePresentError();
  return <button onClick={() => void present(publicError, { source: 'manual' })}>Save</button>;
}
```

Use `ResilioErrorBoundary`, `createResilioRootHandlers`, `capture`,
`captureAsync`, `useResilioHandler`, and `useResilioBrowserErrorBridge` only at
the explicit capture points you want to observe. They do not convert exceptions
into public UI decisions.

## Next.js

Server Actions return a safe `PublicActionResult`. `useResilioState` decodes a
failure and automatically dispatches it to the presentation policy.

```tsx
'use client';

const [state, action, pending] = useResilioState(updateProfile, {
  catalog,
  presentation: { surface: 'profile-form' },
});

return <form action={action}>{/* project UI */}</form>;
```

Connect a route segment fallback without replacing Next.js reset or masking:

```tsx
'use client';

import { useResilioRouteError } from '@resilio/next/client';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const route = useResilioRouteError(error, reset);
  return <button onClick={route.reset} disabled={route.resetBlocked}>Retry</button>;
}
```

Use `createResilioOnRequestError` in `instrumentation.ts` for server request
observability. Resilio does not intercept `redirect()`, `notFound()`, or
unexpected Server Action throws.

## TanStack

```ts
import { QueryCache, MutationCache } from '@tanstack/react-query';
import {
  createResilioMutationCacheCallbacks,
  createResilioQueryCacheCallbacks,
} from '@resilio/tanstack/query';

const queryCache = new QueryCache(createResilioQueryCacheCallbacks({ present }));
const mutationCache = new MutationCache(createResilioMutationCacheCallbacks({ present }));
```

Router and Form adapters are exported from `@resilio/tanstack/router` and
`@resilio/tanstack/form`.

## Documentation

- [Capture Matrix](docs/capture-matrix.md)
- [v1 API and recipes](docs/v1-api.md)
- [Migration guide](docs/migration-v1.md)
- [TanStack compatibility](docs/tanstack-compatibility.md)

## Support

- React: `>=18.3 <20`
- Next.js: `>=15 <17`
- Node.js: `>=18`
