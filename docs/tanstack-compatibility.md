# TanStack Compatibility

## GA First-Class Adapters

| Product | Resilio integration | Preserved ownership |
|---|---|---|
| Query | `QueryCache.onError`, `MutationCache.onError`, `meta.resilio` | retry, cancellation, `throwOnError`, cache |
| Router | loader/onError/onCatch/error-component handler | navigation, reset, notFound |
| Form | form validator and public-error mapper | validation timing and form state |

Query errors default to `interaction: 'background'`; mutation errors default to
`interaction: 'foreground'`. Override through `meta.resilio.context`.
`meta.resilio.enabled: false` opts an operation out, and `mapError` converts an
application error into a safe public error candidate.

## Manual Compatibility

TanStack Table, Virtual, Store, Pacer, HotKeys, Config, Devtools, CLI, and Intent
do not expose a common application public-error lifecycle. Use
`usePresentError` or a small manual bridge without claiming automatic capture.

## Experimental, Not v1 GA

TanStack Start, DB, and AI remain post-v1 experimental candidates.
