# Publishing

## Prerequisites

1. The publishing npm account must have publish permission in the `resiliojs`
   npm organization.
2. Enable npm 2FA for publishing, or use a granular access token permitted to
   publish.
3. Log in locally without committing credentials:

```bash
npm login --auth-type=web
npm whoami
```

## First Public Preview

Run the complete release gate:

```bash
pnpm check
```

Confirm that the target versions are not already published:

```bash
npm view @resiliojs/core@0.1.0 version
npm view @resiliojs/react@0.1.0 version
npm view @resiliojs/tanstack@0.1.0 version
npm view @resiliojs/next@0.1.0 version
```

Publish in dependency order:

```bash
pnpm publish:preview
```

`pnpm publish` is required because it replaces internal `workspace:^`
dependencies with publishable semver ranges.

## Verify the Registry

```bash
npm view @resiliojs/core version
npm view @resiliojs/react version
npm view @resiliojs/tanstack version
npm view @resiliojs/next version
```

Install the public packages in a clean consumer project before announcing the
release.

## Later Releases

Do not overwrite a published version. Increment all affected package versions,
run `pnpm check`, publish in dependency order, and create a matching Git tag.
