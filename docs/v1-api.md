# v1 API and Recipes

## Core

- `PresentationEvaluator` is the recommended API for expected, user-facing
  public errors.
- `ExceptionReporter` and `ErrorSink` are the recommended APIs for unexpected
  exception observation.
- `PolicyEngine` remains available for compatibility; new code should not use
  it as the presentation policy center.
- `defineErrorCatalog`: allow-list and runtime schema for public error payloads.
- `decodePublicError`: validates unknown values at trust boundaries.
- `definePresentationPolicy`: exhaustive code-to-plan policy.
- `createPresentationEvaluator`: evaluates context, validates plans, deduplicates
  each decision, and optionally emits observation events.
- `PresentationPlan`: one primary decision and optional supplements under one
  `occurrenceId`.

Default interruptive channels are `modal` and `toast`; a plan may contain at
most one. Override `interruptiveChannels` for project-defined channels.

## React

- `ResilioProvider`
- `usePresentError`, `useResilioInline`
- `ResilioPresentationHost`, custom renderer registry
- `ResilioErrorBoundary`, `createResilioRootHandlers`
- `capture`, `captureAsync`, `useResilioHandler`
- `installResilioBrowserErrorBridge`, `useResilioBrowserErrorBridge`

Pass `evaluator` to own user-facing presentation. Pass `reporter` only for
exception paths that are not already owned by Sentry or another framework
integration. The legacy `engine` prop remains supported for compatibility.

Renderers are side effects owned by the app. Renderer failures are isolated from
the user flow. `dismissOccurrence` removes every active UI item derived from the
same error occurrence.

## Next.js

- Server imports: `@resiliojs/next`
- Client imports: `@resiliojs/next/client`
- `useResilioState`: automatic expected-error decode and presentation dispatch.
- `useResilioRouteError`: route fallback observation and reset-loop guard.
- `createResilioOnRequestError`: `instrumentation.ts` server observability.

## TanStack

- `@resiliojs/tanstack/query`: QueryCache and MutationCache callbacks.
- `@resiliojs/tanstack/router`: lifecycle handlers for loader/onCatch/error UI.
- `@resiliojs/tanstack/form`: presentation-to-field/form mapper and validator.

Every adapter preserves the host framework’s retry, navigation, reset, and
validation ownership.
