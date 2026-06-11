# Capture Matrix

“Automatic” means a documented Resilio bridge or adapter is installed. Resilio
does not monkey-patch every JavaScript execution point.

| Source | Integration | Public UI policy | Unexpected exception |
|---|---|---:|---|
| Manual public error | `usePresentError` | Yes | Invalid input is rejected |
| Next Server Action result | `useResilioState` | Yes, automatic | Throw propagates to Next |
| TanStack Query/Mutation | cache callbacks | Yes for valid public errors | Optional reporter |
| TanStack Router | lifecycle handler | Yes for valid public errors | Existing fallback remains |
| TanStack Form | validator/mapper | Maps to field/form errors | Invalid input returns no form error |
| React render/lifecycle | `ResilioErrorBoundary` or root handlers | No | Observed; framework fallback remains |
| Browser global error | opt-in browser bridge | No | Observed |
| Event/Promise callback | `capture`, `captureAsync`, `useResilioHandler` | No | Observed and rethrown |
| Next request/render | `createResilioOnRequestError` | No | Observed with safe request context |
| Next route segment | `useResilioRouteError` | No | Observed; reset is guarded, not replaced |

Not automatically captured: arbitrary event handlers, timers, swallowed errors,
workers, process errors, or library internals that do not cross an installed
adapter.
