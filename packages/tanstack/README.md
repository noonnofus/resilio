# @resilio/tanstack

Typed error presentation adapters for TanStack Query, Router, and Form.

## Install

```bash
pnpm add @resilio/tanstack
```

## Query

```ts
import { MutationCache, QueryCache } from '@tanstack/react-query';
import {
  createResilioMutationCacheCallbacks,
  createResilioQueryCacheCallbacks,
} from '@resilio/tanstack/query';

const queryCache = new QueryCache(createResilioQueryCacheCallbacks({ present }));
const mutationCache = new MutationCache(createResilioMutationCacheCallbacks({ present }));
```

## Subpath Exports

- `@resilio/tanstack/query`
- `@resilio/tanstack/router`
- `@resilio/tanstack/form`

Adapters preserve TanStack retry, cancellation, navigation, not-found, cache,
and validation ownership.

See the [compatibility guide](https://github.com/noonnofus/resilio/blob/main/docs/tanstack-compatibility.md).

MIT
