# @resiliojs/core

Framework-independent typed error presentation policy engine.

## Install

```bash
pnpm add @resiliojs/core
```

## What It Provides

- Runtime-safe public error catalog and decoder
- Exhaustive, context-aware presentation policies
- `PresentationPlan` with primary and supplemental decisions
- Per-decision deduplication
- Optional decision and invalid-payload observation events

```ts
import {
  createPresentationEvaluator,
  defineErrorCatalog,
  definePresentationPolicy,
} from '@resiliojs/core';

const policy = definePresentationPolicy(catalog, {
  SESSION_EXPIRED: [{
    decide: () => ({
      channel: 'modal',
      severity: 'error',
      messageKey: 'errors.sessionExpired',
    }),
  }],
});

const evaluator = createPresentationEvaluator({ catalog, policy, fallback });
const result = await evaluator.evaluateUnknown(input, { source: 'manual' });
```

See the [full documentation](https://github.com/noonnofus/resilio#readme).

MIT
