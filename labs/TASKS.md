# gamestruct - session log

Operational history. Stable conventions live in `AGENTS.md`; the normative
contract lives in `SPEC.md`.

## 2026-11-09 - the first build: the library, the landing, the docs, the battery

Session context: prior session lost. The spec commit (`dfc1195`) was on `main`
and `staging`; the whole build (library, tests, docs, landing, CI) was in the
working tree, uncommitted. This round finishes and lands it.

Shipped:

- **The library** (`lib/`, zero deps, plain ESM): `roles` (ARIA-aligned
  vocabulary), `tree` (the semantic tree + stable handles), `events` (the
  bounded ring with an honest cursor), `bridge` (the door: four primitives),
  `profiles/human` (render/a11yDump/audit), `profiles/agent` (toolCatalog/
  affordances/toolCall), `bindings/http`, `bindings/mcp`, and two reference
  adapters (`adapters/synmergia` = the world; `adapters/vant` = the brain).
- **The CLI** (`bin/gamestruct.mjs`): `check` (self-checks) and `doctor` (both
  lanes + the a11y audit on a demo surface).
- **The battery** (`tests/bridgeworks.test.mjs`): 31 assertions over the tree,
  both lanes, both bindings, and both adapters.
- **The landing** (`web/`): a prestruct/Vite/React site adapted to the
  gamestruct identity, driven by `site.config.js`; SEO audit 0 failures / 0
  warnings, prerender 3/3, sitemap 3 `<loc>`, `llms.txt` emitted.
- **The docs** (`docs/`): a Jekyll rig (freestruct config generated from
  `site.config.js`), 7 pages, nav in `docs/_data/nav.yml`.
- **The site sync** (`scripts/sync-site.mjs`): emits `docs/_config.yml`,
  `docs/freestruct.config.yml`, `web/public/robots.txt`, and
  `web/public/site.webmanifest` from `site.config.js`; `--check` gates drift.
- **CI** (`.github/workflows/`): `test.yml` (the battery + web build + Jekyll
  docs build on PR), `docs-deploy.yml` (thin caller of the freestruct docs
  lane), `staging-ff-sync.yml` (FF staging to main after a promotion).

Verified this round (no full parallel runner yet - the family runners are
being reworked):

- `npm test` -> 31 pass / 0 fail.
- `npm run check` -> 17 self-checks, all pass; `node --check` clean on every
  module.
- `npm run doctor` -> both lanes print, a11y audit clean.
- `npm run build --prefix web` -> clean; SEO audit 0/0.
- `bundle exec jekyll build` (docs, Ruby 3.4 deps resolved locally) -> 7 pages
  built, nav baseurl-relative.

Finding carried forward (cross-repo, NOT fixed here): the SPEC's HTTP wire
(`/act` `{id,verb?,value?}`, `/wait_for` `{predicate,timeoutMs}`) and the
`DoorClient` in `lib/adapters/vant.mjs` disagree with the REAL synmergia door
(`/act` `{id,args}`, `/wait_for` `{predicate,timeout_ms}`) and the vant
client (`lib/adapters/synmergia.js`). The gamestruct library is internally
consistent; the drift is between the library and the two live consumers.
Decide the canonical shape (or make the binding tolerant of both) before a
real cross-repo call is trusted.
