# Resilio

Typed error presentation policy for React, Next.js, and TanStack.

Resilio answers one application-wide question:

> When this safe domain error happens here, what should the user see?

Define the answer once as a headless policy, then reuse it across Server
Actions, forms, queries, mutations, routes, and custom UI components.

```text
unknown input
  -> runtime-safe PublicError
  -> context-aware PresentationPlan
  -> your inline / toast / modal / banner UI
```

## Why Resilio?

- **Exhaustive policies:** adding an error code without a policy fails TypeScript.
- **Runtime-safe boundaries:** unknown payloads are decoded before UI evaluation.
- **Context-aware UI:** the same error can become inline, silent, or modal by source and surface.
- **Multi-surface plans:** one occurrence can create a field error and form summary together.
- **Headless:** connect Sonner, a design system, or any project-owned component.
- **Noninterfering adapters:** retry, navigation, cache, and framework fallbacks remain owned by their frameworks.

## Install

Choose the package matching your application:

```bash
# Next.js: includes the React and Core APIs
pnpm add @resilio/next

# React without Next.js
pnpm add @resilio/react

# Framework-independent policy engine
pnpm add @resilio/core

# TanStack Query, Router, and Form adapters
pnpm add @resilio/tanstack
```

## Define a Policy

```ts
import {
  createPresentationEvaluator,
  defineErrorCatalog,
  definePresentationPolicy,
} from '@resilio/core';
import * as z from 'zod';

export const catalog = defineErrorCatalog({
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

## Connect React UI

Resilio returns decisions. Your application owns their visual design.

```tsx
import {
  ResilioPresentationHost,
  ResilioProvider,
  usePresentError,
} from '@resilio/react';

function AppProvider({ children }: { children: React.ReactNode }) {
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
  return (
    <button onClick={() => void present(publicError, { source: 'manual' })}>
      Save
    </button>
  );
}
```

## Next.js Server Actions

Return a safe `PublicActionResult` from the server. `useResilioState` decodes
expected failures and automatically dispatches them to the policy.

```tsx
'use client';

import { useResilioState } from '@resilio/next/client';

const [state, action, pending] = useResilioState(updateProfile, {
  catalog,
  presentation: { surface: 'profile-form' },
});

return <form action={action}>{/* your fields and UI */}</form>;
```

Unexpected exceptions continue to use Next.js framework fallbacks. Resilio does
not intercept `redirect()`, `notFound()`, or retry/reset control flow.

## TanStack Query

```ts
import { MutationCache, QueryCache } from '@tanstack/react-query';
import {
  createResilioMutationCacheCallbacks,
  createResilioQueryCacheCallbacks,
} from '@resilio/tanstack/query';

const queryCache = new QueryCache(createResilioQueryCacheCallbacks({ present }));
const mutationCache = new MutationCache(createResilioMutationCacheCallbacks({ present }));
```

Router and Form adapters are available from `@resilio/tanstack/router` and
`@resilio/tanstack/form`.

## Package Guide

| Package | Use it when |
|---|---|
| [`@resilio/core`](https://www.npmjs.com/package/@resilio/core) | You need the framework-independent catalog and evaluator |
| [`@resilio/react`](https://www.npmjs.com/package/@resilio/react) | You need React hosts, renderers, boundaries, or capture bridges |
| [`@resilio/next`](https://www.npmjs.com/package/@resilio/next) | You use Next.js App Router or Server Actions |
| [`@resilio/tanstack`](https://www.npmjs.com/package/@resilio/tanstack) | You use TanStack Query, Router, or Form |

## What Resilio Does Not Own

- Data fetching, cache, retry, rollback, or transactions
- Navigation, redirects, not-found handling, or framework reset semantics
- Actual toast, modal, banner, or form components
- Automatic capture of every JavaScript exception
- Sentry, OpenTelemetry, or another observability backend

## Documentation

- [Capture Matrix](https://github.com/noonnofus/resilio/blob/main/docs/capture-matrix.md)
- [v1 API and Recipes](https://github.com/noonnofus/resilio/blob/main/docs/v1-api.md)
- [Migration Guide](https://github.com/noonnofus/resilio/blob/main/docs/migration-v1.md)
- [TanStack Compatibility](https://github.com/noonnofus/resilio/blob/main/docs/tanstack-compatibility.md)
- [Publishing Guide](https://github.com/noonnofus/resilio/blob/main/docs/publishing.md)

## Compatibility

- React `>=18.3 <20`
- Next.js `>=15 <17`
- TanStack Query `>=5 <6`
- TanStack Router `>=1 <2`
- TanStack Form `>=1 <2`
- Node.js `>=18`

## Status

`0.1.x` is the first public preview. The core product direction is stable, but
public APIs may still change before `1.0.0`.

## License

MIT
