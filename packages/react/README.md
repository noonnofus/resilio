# @resiliojs/react

Headless React bindings for Resilio typed error presentation policies.

## Install

```bash
pnpm add @resiliojs/react
```

## What It Provides

- `ResilioProvider`
- `ResilioPresentationHost` and custom renderer registry
- `usePresentError` and `useResilioInline`
- Multi-surface presentation and occurrence-level dismiss
- `ResilioErrorBoundary` and React root handlers
- Explicit `capture`, `captureAsync`, and browser observability bridges

```tsx
<ResilioProvider evaluator={evaluator}>
  <App />
  <ResilioPresentationHost>
    {({ active, dismiss }) => active.map((item) => (
      <ProjectErrorUI
        key={item.id}
        decision={item.decision}
        onClose={() => dismiss(item.id)}
      />
    ))}
  </ResilioPresentationHost>
</ResilioProvider>
```

Actual toast, modal, banner, and form components remain owned by your app.

See the [full documentation](https://github.com/noonnofus/resilio#readme).

MIT
