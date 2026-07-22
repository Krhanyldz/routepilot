# Dependency security

RoutePilot pins its runtime framework versions and commits the npm lockfile so local, CI, and production installs resolve the same dependency graph.

## Current baseline

- Next.js: `16.2.11`
- React and React DOM: `19.2.8`
- Next.js transitive PostCSS override: `8.5.22`
- Next.js optional Sharp override: `0.35.3`

The narrow overrides address published vulnerabilities in the versions currently bundled by Next.js. They must be removed when a future Next.js release includes equal or newer patched versions and has passed RoutePilot's full validation suite.

## Required checks

Every dependency change must pass:

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm audit --audit-level=high
```

High or critical vulnerabilities block release. Moderate findings require impact review and a documented decision; they must not be silently ignored.

## Update policy

- Prefer supported stable releases and exact runtime dependency versions.
- Do not run automated force upgrades without reviewing breaking changes.
- Inspect transitive findings rather than assuming a direct-package upgrade fixes them.
- Keep overrides as narrow as possible and verify compatibility through production build and deterministic tests.
- Never weaken audit thresholds merely to make CI pass.
