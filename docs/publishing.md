# Publishing

## Release Prerequisites

Configure npm Trusted Publishing for every `@resiliojs/*` package:

- Provider: GitHub Actions
- Repository owner: `noonnofus`
- Repository: `resilio`
- Workflow filename: `release.yml`
- Environment: `npm`

Create a protected GitHub environment named `npm`. The release workflow uses
OIDC trusted publishing and does not require a long-lived npm token.

## Release Flow

1. Increment the root and all package versions to the same version.
2. Run `pnpm check`.
3. Merge the release changes into protected `main`.
4. Create a GitHub Release with a matching `vX.Y.Z` tag from `main`.
5. The `release.yml` workflow validates the tag, reruns the full gate, packs
   each package, and publishes in dependency order with npm provenance.

The release workflow rejects mismatched tags and package versions. It publishes
the exact tarballs tested by the workflow rather than rebuilding between test
and publish.

Do not create a Git tag for `0.1.0`; it was published manually without
provenance and cannot be retroactively attested.

## Verify the Registry

```bash
npm view @resiliojs/core version
npm view @resiliojs/react version
npm view @resiliojs/tanstack version
npm view @resiliojs/next version
```

Install the public packages in a clean consumer project before announcing the
release.

## Emergency Manual Publishing

Use `pnpm publish:preview` only if Trusted Publishing is unavailable. Manual
publishing requires npm authentication and does not provide the same
repository-to-artifact provenance guarantees.
