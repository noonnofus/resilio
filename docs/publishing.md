# Publishing

## Prerequisites

1. The publishing npm account must own the `resilio` user scope or have publish
   permission in the `resilio` npm organization.
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
npm view @resilio/core@0.1.0 version
npm view @resilio/react@0.1.0 version
npm view @resilio/tanstack@0.1.0 version
npm view @resilio/next@0.1.0 version
```

Publish in dependency order:

```bash
pnpm publish:preview
```

`pnpm publish` is required because it replaces internal `workspace:^`
dependencies with publishable semver ranges.

## Verify the Registry

```bash
npm view @resilio/core version
npm view @resilio/react version
npm view @resilio/tanstack version
npm view @resilio/next version
```

Install the public packages in a clean consumer project before announcing the
release.

## Later Releases

Do not overwrite a published version. Increment all affected package versions,
run `pnpm check`, publish in dependency order, and create a matching Git tag.
