# @resilio/next

Next.js facade for Resilio. Includes the React and Core APIs plus Server Action
and App Router integrations.

## Install

```bash
pnpm add @resilio/next
```

Use `@resilio/next` in Server Components and Server Actions. Use
`@resilio/next/client` in Client Components.

```tsx
'use client';

import { useResilioState } from '@resilio/next/client';

const [state, action, pending] = useResilioState(updateProfile, {
  catalog,
  presentation: { surface: 'profile-form' },
});
```

Expected Server Action failures are decoded and dispatched automatically.
Unexpected exceptions, `redirect()`, `notFound()`, and framework reset semantics
remain owned by Next.js.

See the [full documentation](https://github.com/noonnofus/resilio#readme).

MIT
