# Sentry Integration

Resilio and Sentry should have one telemetry owner for each exception path.
Sentry's framework integrations should own unhandled exceptions. A Resilio
`ExceptionReporter` should only capture exceptions that the application handles
or that do not cross a Sentry-managed boundary.

## Sink Adapter

```ts
import * as Sentry from '@sentry/nextjs';
import {
  createExceptionReporter,
  type ErrorSink,
} from '@resiliojs/next';

const sentrySink: ErrorSink<AppCatalog> = {
  report(event) {
    if (event.kind !== 'exception') return;

    Sentry.captureException(event.error, {
      tags: {
        'resilio.source': event.source,
        'resilio.occurrence_id': event.occurrenceId,
      },
      contexts: {
        resilio: event.context ?? {},
      },
    });
  },
};

export const reporter = createExceptionReporter(sentrySink);
```

Connect the reporter only where Resilio owns capture:

```tsx
<ResilioProvider evaluator={evaluator} reporter={reporter}>
  {children}
</ResilioProvider>
```

## Ownership Rules

| Exception path | Recommended owner |
|---|---|
| Unhandled Next.js request/render error | Sentry Next.js integration |
| Unhandled browser error or rejection | Sentry browser integration |
| React root or Error Boundary error | Choose Sentry integration or Resilio reporter, not both |
| Handled event/async error rethrown through `capture` | Resilio reporter |
| Public error presentation decision | Resilio `PresentationObserver`; do not call `captureException` |

`occurrenceId`, `source`, and a public error `code` are useful Sentry tags.
Sentry `fingerprint` controls issue grouping; it is not a transport-level
deduplication mechanism. Use `beforeSend` filtering only as a final guard after
capture ownership is explicit.

Never attach raw credentials, request headers, cookies, tokens, or database
connection strings to Resilio context. Sentry scrubbing rules remain the
application's responsibility.
