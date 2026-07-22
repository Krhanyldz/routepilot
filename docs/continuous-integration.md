# Continuous integration

RoutePilot runs GitHub Actions for every pull request and every push to `main`.

## Required gates

The quality job installs the committed lockfile with `npm ci`, then runs lint, TypeScript validation, deterministic tests, and a high-severity production dependency audit. The production-build job runs only after quality succeeds.

Both jobs:

- use the Node major version declared in `.nvmrc`;
- have a 15-minute timeout;
- use only read access to repository contents; and
- cancel superseded runs for the same branch or pull request.

The CI workflow is covered by a deterministic contract test so required commands and safety settings cannot be removed accidentally without changing tests.

## Dependency updates

Dependabot opens grouped weekly pull requests for production and development npm dependencies. Dependabot PRs must pass the same quality, audit, and build gates; they are not auto-merged.

## Local parity

Use Node 24 and run:

```bash
npm ci
npm run check
npm run audit:production
```

Repository branch protection should require both `Quality and security` and `Production build` checks before merging. Branch protection is a GitHub repository administration setting and is not changed by this code milestone.
