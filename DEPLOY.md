# DEPLOY.md - gamestruct release runbook

gamestruct is an npm library + CLI. There is no server. "Deploy" = publish to
the npm registry. The model follows [poststruct](https://github.com/dhaupin/poststruct)
and [packstruct](https://github.com/dhaupin/packstruct) exactly, which in turn
follow [prestruct](https://github.com/dhaupin/prestruct):

1. **1.x is OIDC.** Publishing is driven by the release ladder in CI: push a
   `vX.Y.Z` tag and `publish.yml` runs publish -> release -> verify with npm
   Trusted Publishing (OIDC, no stored token, SLSA provenance). CI blocks
   `workflow_dispatch`/`tag` publishing for 0.x versions - `publish.yml`
   REFUSES 0.x versions. This is the proven convention.

> The OIDC lane is LIVE: 0.9.0 was the one-time manual bootstrap (see below),
> and 1.0.0 + 1.1.0 both cut end-to-end through `publish.yml`.

## The release ladder

1. Move the `CHANGELOG.md` `[Unreleased]` section to a dated `[X.Y.Z]`, then
   bump `package.json` (`npm version minor|major`). `package.json` is the
   single version truth.
2. Run `npm test` + `npm run check` locally. Tag `vX.Y.Z` and push
   (`git push --follow-tags`).
3. `publish.yml` (`.github/workflows/publish.yml`) - the family release ladder
   (eyestruct@4e2b552), three jobs:
   - **publish** - the gate refuses 0.x and any tag that does not equal the
     packaged version, then `npm publish --provenance` (Trusted Publishing /
     OIDC, no stored token; the `prepublishOnly` battery - `npm test && npm run
     check` - rides automatically). gamestruct is zero-dependency, so there is
     no `npm ci` step and no lockfile to resolve.
   - **release** - `scripts/release-notes.cjs` extracts the release body from
     the changelog's own `[version]` section (refuses empty), cuts the GH
     release from the tag (idempotent), and attaches the served tarball
     (`npm pack gamestruct@<version>`) so the GH release and npm serve the same
     bytes.
   - **verify** - `scripts/verify-release.cjs` re-asserts the truth after the
     cut: the served tarball's sha512 == registry integrity, provenance
     present, the full pack ladder, the release object's target commit, and the
     attached asset's sha512 == registry integrity.
   - Triggers: `push: tags: [ 'v*' ]` + a `workflow_dispatch` with a
     `verify-only` mode (re-runs the trust ladder against what is already
     served, no publish/release).
4. Tool updates thereafter are just: change files, bump version, tag vX.Y.Z.

The pack ladder also runs offline on every push (`tests/release-verify.test.cjs`).

## The first publish (the 0.9.0 manual bootstrap - DONE, history)

OIDC cannot create a brand-new package (npm/cli#8544), so the first cut was
manual - one time, from anywhere with npm credentials:

1. `npm run check`   - the gate (syntax + sync + the 17 self-checks).
2. `npm test`        - version-truth + the bridgeworks suite + the ladder legs.
3. `npm publish`     - the one-time manual bootstrap (0.9.0).
4. npmjs.com -> gamestruct -> Settings -> **Trusted Publisher**: repo
   `dhaupin/gamestruct`, workflow `publish.yml`.
5. From then on, the tag drives it: `npm version minor && git push --follow-tags`
   (the major is 1.x now, so this is the standing path).

### The phone lane

The first publish can be done from a phone (Termux) without cloning. GitHub's
zip download carries no `.git` and no `node_modules`, and `/storage/emulated`
is a symlinkless FUSE mount, so installs and publishes must happen inside the
Termux home. `scripts/ship-from-download.cjs` makes that move repeatable:

```sh
NPM_TOKEN=<token> node scripts/ship-from-download.cjs \
  --target /storage/emulated/0/Download/gamestruct-main/gamestruct-main \
  --root ~/web/gamestruct-main --dry-run
```

Drop `--dry-run` to publish for real (or pass `--token-file <path>`). The lane
stages the tree inside the home, runs `npm ci`/`npm install`, then `npm publish`
- the repo's own `prepublishOnly` gate runs exactly as on any other machine.
The token rides the child env (never a file, never argv) and the staged
`.npmrc` is unlinked in a `finally`, publish failing or not. `--clean` removes
the staged root after the run. The lane is family-reusable: copy the file
as-is into any repo.

## Key facts baked in

- `package.json`: `"files"` whitelists what actually goes in the tarball
  (`bin/`, `lib/`, `SPEC.md`, `LICENSE`; README.md + package.json always ride).
  The family pack ladder FORBIDS `docs/`, `tests/`, `web/`, `labs/`, `scripts/`,
  `examples/`, `models/`, `.github/`, `node_modules/` and any `.map`/`.env`/
  `.log`/`.tgz` from a runtime tarball - the offline receipt
  (`tests/release-verify.test.cjs`) refuses a smuggle by name.
- `engines.node: ">=18"` runtime floor.
- **`package.json` is THE single version truth** (the family rule). The bin
  answers `--version` by reading it, `lib/version.mjs` derives `VERSION` from
  it, and the web rig carries NO version field of its own.
  `tests/version-truth.mjs` refuses any surface that drifts.
- The spec revision (`SPEC.md` "v1") is its own axis, decoupled from the
  package semver.
- Tagged CR = the docs/CHANGELOG npm convention stays exact.

## Landing site (Cloudflare Pages, gamestruct.creadev.org)

- The landing deploys as a **Cloudflare Pages project** named `gamestruct`
  with the production custom domain `gamestruct.creadev.org`.
- The landing is the `web/` tree (Vite + React, prerendered by the prestruct
  build). The CF config lives entirely inside `web/`, matching the rest of the
  family: `web/public/_headers`, `web/public/_redirects`, and `web/functions/`.
  There is no root `wrangler.toml` - the contract lives in this runbook and the
  dashboard settings (the family shape).
- **Pages project settings (the build contract, set once in the dashboard):**
  - Root directory: `web`.
  - Build command: `npm run build` (runs `node scripts/build-status.mjs` then
    `prestruct build`; emits `web/dist/`).
  - Build output directory: `dist`.
  - `functions/` is resolved relative to the root directory, so
    `web/functions/api/health.js` serves `GET /api/health`.
- `web/public/status.json` is GENERATED at build time (the `family-status@1`
  emitter, `web/scripts/build-status.mjs`) and gitignored: regeneration is the
  freshness. The `/status` page reads every family member's served
  `/status.json` live - no server, no guessed numbers.
- The landing build product is `web/dist/`, gitignored (`web/.gitignore`).

## Docs site (GitHub Pages via Actions, docs.creadev.org/gamestruct)

- Pipeline: `.github/workflows/docs-deploy.yml` is a thin caller of the
  freestruct docs lane. Docs-truth gates run first (ported house checkers:
  frontmatter 5-field law, resolvable links, style law incl. no-dashes-in-prose,
  English-only prose), then Jekyll (`docs/`), then the freestruct SEO layer
  (basePath-aware: `/gamestruct`; broken links fail the build), then
  `pagefind --site _site`, then the official Pages artifact deploy
  (`upload-pages-artifact` -> `deploy-pages`, `id-token: write`).
- `docs/freestruct.config.yml` pins the URL math: site.url + basePath =>
  https://docs.creadev.org/gamestruct/<page>. It is GENERATED from
  `site.config.js` by `scripts/sync-site.mjs` (as are `docs/_config.yml`,
  `web/public/robots.txt`, and `web/public/site.webmanifest`); `npm run
  sync:check` gates the drift in CI.
- First run needs the Pages source flipped to "GitHub Actions" in repo settings
  (Settings -> Pages); the workflow triggers on `docs/`-shaped pushes and
  manual dispatch.

## CI

- `test.yml` - the battery on every push/PR to `main`/`staging`: the node:test
  spine, `npm run check` (syntax + sync + the self-checks), `npm run doctor`,
  the web build, and the Jekyll docs build.
- `docs-deploy.yml` - the docs lane (pushes only).
- `staging-ff-sync.yml` - fast-forwards `staging` to `main` after a promotion.
- `publish.yml` - the release ladder (tags + manual dispatch).
