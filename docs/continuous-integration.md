# Continuous integration

RoutePilot runs GitHub Actions for every pull request and every push to `main`.

## Required gates

The quality job installs the committed lockfile with `npm ci`, then runs lint, TypeScript validation, deterministic tests, and a high-severity production dependency audit. The production-build job runs only after quality succeeds, starts the built artifact in explicit demo mode, and verifies the deployment smoke contract. The browser end-to-end job runs after both gates, installs only Chromium, starts RoutePilot in isolated live mode, and exercises provider APIs through deterministic browser-level mocks.

Both jobs:

- use the Node major version declared in `.nvmrc`;
- have a 15-minute timeout;
- use only read access to repository contents; and
- cancel superseded runs for the same branch or pull request.

The CI workflow is covered by a deterministic contract test so required commands, browser coverage, and safety settings cannot be removed accidentally without changing tests. Playwright reports are retained for 14 days, including failure traces and screenshots where available.

## Dependency updates

Dependabot groups compatible minor and patch npm version updates into separate weekly production and development pull requests. Major version updates remain individual pull requests so incompatible toolchain changes cannot be bundled together. Security updates remain independent of this version-update grouping. Every Dependabot pull request must pass the same quality, audit, and build gates; updates are not auto-merged.

## Local parity

Use Node 24 and run:

```bash
npm ci
npm run check
npm run test:e2e
npm run audit:production
npm run smoke -- https://your-deployment.example
```

Repository branch protection requires `Quality and security`, `Production build`, and `Browser end-to-end`. The production build gate includes the smoke contract.
