# Migration to the v1 Policy Layer

## Product Boundary

Legacy `Result`, retry, normalize, emitter, and `PolicyEngine` APIs remain
temporarily available for compatibility, but they are not the v1 product
center. New code should use the public catalog, presentation evaluator, and
framework adapters.

## Migration Steps

1. Define a safe `defineErrorCatalog` without UI strings or raw exceptions.
2. Replace legacy feedback policy with exhaustive `definePresentationPolicy`.
3. Create one evaluator and inject it into `ResilioProvider`.
4. Connect project UI through renderers or `ResilioPresentationHost`.
5. Replace manual Next `onError -> present()` wiring with `useResilioState`.
6. Add only the capture bridges and TanStack adapters used by the app.

Single decisions remain accepted as shorthand and are normalized into a
`PresentationPlan`. For multi-UI feedback, return `{ primary, supplements }`.

## Do Not Migrate

Do not move retry, cache, redirects, `notFound`, navigation, validation timing,
or domain recovery into Resilio. Do not convert unexpected exceptions into
public errors merely to show a toast.
