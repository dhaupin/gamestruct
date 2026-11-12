# gamestruct - session log

Operational history. Stable conventions live in `AGENTS.md`; the normative
contract lives in `SPEC.md`.

## 2026-11-11 - the thesis band lands on the content grid (mobile)

Owner report (via the family sweep): the thesis band - the accent-ruled pull-quote below the hero - read as a full-bleed bar on mobile. Bold text, block edge-to-edge, no margin, "might be missing a css parent container." Owner is mobile-first.

**Root cause (measured).** The accent was a `border-left` on `.band.thesis .wrap`, and `.wrap` is content-box. Desktop centres a 960px `.wrap`, so the rule landed on the grid by luck; a narrow `.wrap` fills the width, so its left border sat flush at x=0 - a full-height 3px accent bar on the screen edge. Receipt: 390px headless screenshot; accent-column scan found the rule at x=0,1,2.

**Fix (`web/src/styles.css`).** `.band.thesis { padding-left/right: 20px }` gives the band the gutter (rule can never reach the edge; the full-bleed background is untouched since padding is inside the background box), and `.band.thesis .wrap { padding-left: 17px }` keeps `3px border + 17px pad = 20px`, so the band box stays the same width as every section.

**Receipts.** Probe at 1280px: band `.wrap` on the section grid (`RULE ON GRID: true, BOX MATCH: true`); 390px rule inset (was x=0), no horizontal overflow.

**Parity.** memstruct carried the identical defect (the lander CSS is the family shell); the same fix lands there.

## 2026-11-04 - the marketing lander + npm in the menus (1.2.1 cut)

Session context: the owner asked for a real lander homepage on `/web` - "go
wild", market it, show how to set it up, what it does, why it matters for
players AND agents, why devs should adopt it, auto a11y - plus npm links in the
web and docs menus. Also: scrub the stale runner note (the parallel runner
has long been live; done, in both gamestruct and synmergia).

Shipped:

- **The lander** (`web/src/pages/Home.jsx`): a hero ("One tree. Two lanes.
  Every player, every agent.") over a thesis band, *who it is for* (4 cards:
  players who use assistive tech, agents, game devs, studios), *why it is
  needed* (a 3-row failure table: human lane / agent lane / both), *what you
  get* (the four primitives + the eyes, both lanes, the bindings), *how it
  works* (a 4-step adoption path + a full code block), *auto a11y*, *why devs
  adopt it* (6 cards), and the ecosystem proof (synmergia/vant/webform+dom),
  closing on a CTA band. New `.band` / `.chips` / `.section-title` styles ride
  the existing tokens (no hardcoded hex), so both themes and all three paint
  schemes carry it.
- **npm + docs in the menus**: `site.config.js` nav gains `Docs` + `npm` (the
  header/sidebar/footer all render the one vocabulary); `docs/_data/nav.yml`
  gains an npm row in Surfaces; `docs/_layouts/default.html` gains an npm icon
  beside GitHub. The landing route meta now reads for the pitch.
- **The 1.2.1 cut**: CHANGELOG `[Unreleased]` -> `[1.2.1]`, `npm version
  patch`, README H1 -> `# gamestruct 1.2.1`, `docs/discussions/announcing-v1.2.1.md`
  + the index row.

Gates: `npm test` 67/0 + 29/0, `npm run check` 20 checks OK, `web build` 8/8
pages + SEO audit clean.

## 2026-11-10 - issue #1: the client transport wall (SPEC v1.2), and the 1.2.0 cut

Session context: gamestruct's one open issue (#1, filed by the vant lane) asked
the reference `DoorClient` to become wall-injectable and to read a 409/408
refusal body verbatim. Close it, bump the SPEC revision, and cut 1.2.0.

Shipped:

- **`lib/adapters/vant.mjs`**: `DoorClient` takes an injected `fetch`
  (`target.fetch`), defaulting to the global `fetch`; every remote call in
  `_fetch` rides `this._fetchImpl`. A host (vant, a browser app, a Worker) can
  now interpose its own wall (SSRF/DNS-rebinding refusal, circuit breaker)
  without forking the reference. Zero deps preserved.
- **The refusal-as-data rule** (already the behavior via the `parsed.ok ===
  undefined` guard) is now pinned by tests: a 409 (refused `act`) and a 408
  (honest `wait_for` timeout) return the door's own `reason` verbatim.
- **`SPEC.md` v1.2** (revision history updated): N25 (transport wall) + N26
  (refusal as data = N21 carried across the wire), both binding the reference
  CLIENT, not a door; conformance section notes they are OPTIONAL for a door.
- **Three new battery legs** (`tests/bridgeworks.test.mjs`, 64 -> 67): the
  injected fetch is the one called (global untouched); a 409 body verbatim; a
  408 body verbatim.
- **Docs**: `docs/adapters.md` (the injectable transport), `AGENTS.md` (SPEC
  revision line), a CHANGELOG entry, and the release post
  `docs/discussions/announcing-v1.2.0.md` + its index row.

Verified this round:

- `npm test` -> version-truth PASS, bridgeworks 67/0, release ladder 29/0.
- `npm run check` -> 20 checks, all pass.
- 1.1.1 was cut earlier this session (the status-page check-count fix + the
  eyestruct arm) and shipped through the OIDC ladder (publish -> release ->
  verify all green; npm latest 1.1.1, provenance present); both served ladders
  re-verified VERIFIED.

Still open (unchanged): the `wait_for` wire key -- the door tolerates both
`timeoutMs` and `timeout_ms`; the SPEC lists `timeoutMs`. Not worth a rename
while the door accepts both.

## 2026-11-10 - the 1.1.1 cut (the release ladder, continued)

Session context: 1.1.0 shipped end-to-end through the OIDC ladder, but one
commit sat unpushed on `staging` (the status-page check-count fix, still filed
under `[Unreleased]`). Continue the ladder: cut the patch.

Shipped:

- **The 1.1.1 cut**: `CHANGELOG.md` `[Unreleased]` -> a dated `[1.1.1]`
  (2026-11-10) with a fresh empty `[Unreleased]` above it; `package.json` +
  `package-lock.json` bumped to 1.1.1 (`npm version patch`); the README H1
  moved to `# gamestruct 1.1.1`. version-truth PASS.
- **`docs/discussions/announcing-v1.1.1.md`**: the release post (one file per
  release, the file IS the post; drafted against a shipped version only).
- **`docs/discussions/index.md`**: the v1.1.0 row corrected from "staged for
  the v1.1.0 tag" to "2026-11-09 on npm" (it shipped), and the v1.1.1 row
  added.

Verified this round:

- `npm test` -> version-truth PASS, bridgeworks 64/0, release ladder 29/0.
- `npm run check` -> 20 checks, all pass.
- `npm run doctor` -> both lanes print, a11y audit clean.
- The SERVED 1.1.0 re-verified through the post-publish ladder:
  `verify-release --npm --version 1.1.0` VERIFIED (provenance present, served
  tarball sha512 == registry integrity, 0 forbidden, 21 files), and
  `verify-release --gh --tag v1.1.0 --asset gamestruct-1.1.0.tgz` VERIFIED
  (release object exists, GH source tarball == git archive, asset sha512 ==
  registry integrity).

Still open (unchanged): the `wait_for` wire key -- the door tolerates both
`timeoutMs` and `timeout_ms`, so the two agree in practice; the SPEC lists
`timeoutMs` and the door's own comment says `timeout_ms`. Not worth a rename
while the door accepts both.

## 2026-11-09 - the release-post convention, and the 1.1.0 cut

Session context: the family convention (`docs/discussions/`, one
`announcing-vX.Y.Z.md` per release, the file IS the post) had not been ported
to gamestruct. Port it, then cut 1.1.0 through the family ladder.

Shipped:

- **`docs/discussions/`** - the release-post convention, following crashtest's
  index (the family source of truth). `index.md` carries the conventions
  (one file per release, the file IS the post, draft against a RELEASED
  version only, posting mechanics stay in the index) and an index table; a
  post per shipped release: `announcing-v1.0.0.md` (against the npm tarball)
  and `announcing-v1.1.0.md` (staged for the tag).
- **CHANGELOG date fixed**: the 1.1.0 section read `2026-11-04`; every 1.1.0
  commit is `2026-11-09`, so the section date was drift. Corrected to match
  the shipped day (the release-notes extraction feeds the GH release body, so
  a wrong date is published, not cosmetic).
- **The 1.1.0 cut**: staging fast-forwarded to main, tag `v1.1.0` pushed, the
  publish ladder (publish -> release -> verify) run end-to-end.

## 2026-11-04 - the remote catalog reads a world door's own snapshot

Session context: the cross-repo drift this repo carried forward from the 1.0.0
round -- "the SPEC's HTTP wire and the `DoorClient` disagree with the REAL
synmergia door" -- resolved, at least for the catalog leg.

The drift: `DoorClient.catalog()` over the wire read `observe().nodes`, but a
game door serves its OWN snapshot (a live world: `player`, `actions[]`,
`events[]`), never a serialized tree. Against the real door the catalog
returned `{ ok:false, reason:'observe returned no nodes' }` -- so a brain could
never auto-wire tools from a live Synmergia door. Proven live (a `DoorClient`
pointed at `127.0.0.1:3799`).

Shipped:

- **`doorNodes(snapshot)`** (`lib/adapters/synmergia.mjs`, exported): the ONE
  normalizer that folds the door's flat `actions[]` (each carrying a `kind` and
  a STABLE `ui:`/`world:` id) into the SPEC node shape. It reuses the SAME
  role mapping (`roleForKind`) and verb affordance (`actionsForRole`) the local
  `buildBridge` uses, so the remote catalog and the live tree can never drift.
- **`DoorClient({ mapNodes })`** (`lib/adapters/vant.mjs`): an optional
  normalizer; when present, `catalog()` folds the wire snapshot through it.
  Omit it and a door that serves no `nodes` refuses honestly, as before.
- Two new test legs (bridgeworks 62 -> 64): `doorNodes` shape + the remote
  catalog over a REAL world-door wire (a server serving `actions[]`, not
  `nodes`), including the honest no-`mapNodes` refusal. `npm test` 64/0 + 29/0,
  `npm run check` 20/0.
- **`labs/playtest.mjs`** -- the live play-test harness: a reference BRAIN that
  drives a RUNNING door through all five primitives. This is where `see` earns
  its keep -- the harness captures a frame at every step and reports the path,
  so a person can look at what the agent saw. It reads the door's OWN handles
  live (never a hardcoded id) and treats a refusal as a skipped step.

Verified live against the running Synmergia door: the remote catalog reads the
door's own handles (`ui:Login/.../UsernameField` with `set_value`,
`ui:.../LoginButton`, ...) and advertises the `see` tool; the harness drove
CharacterSelect -> GlobeWorld (`in_world: true`, 45 handles, 67 events) with
five captured frames.

Still open (unchanged): the `wait_for` wire key -- the door tolerates both
`timeoutMs` and `timeout_ms`, so the two agree in practice; the SPEC lists
`timeoutMs` and the door's own comment says `timeout_ms`. Not worth a rename
while the door accepts both.

## 2026-11-09 - 1.0.0: the terminal host, the DOM adapter, and the ecosystem split

Session context: the prior session landed the webform generality receipt
(f55d71d). This round makes the "one semantic tree, two lanes" claim real
across more surfaces and closes the debloat loop with the world.

Shipped:

- **The DOM adapter** (`lib/adapters/dom.mjs`): `fromElement(el)` walks a live
  DOM subtree into the tree, reading the ARIA attributes an accessible page
  already carries (`role`, `aria-*`, `alt`, `title`, `label[for]`) and falling
  back to tag/text. Duck-types the element interface, so it runs on a real DOM
  in a browser and a plain fixture in Node (zero deps, no jsdom). The sharpest
  generality receipt: an accessible page is ALREADY a door.
- **The TUI host** (`lib/hosts/tui.mjs`): the human lane with no pointer.
  `render` draws a text frame; `key` drives it (tab walks the focus order,
  `enter` runs the node's DEFAULT action, typing sets a value) using the SAME
  handles the agent lane uses. New `gamestruct tui` command; on a pipe it
  prints one frame and exits.
- **The Synmergia adapter is now pinned to the REAL door** (`lib/adapters/
  synmergia.mjs`): it maps the door's actual `observe()` snapshot and reuses the
  door's own handles (`ui:<path>` / `world:<id>`) UNCHANGED, so `act(handle)`
  forwards the exact string the door's `activate_by_id` matches. Five legs.
- **Ten new test legs** (`tests/bridgeworks.test.mjs` now 47): DOM (both lanes,
  label[for], aria-hidden pruned, role/name order, act routing) + TUI (frame,
  focus order, default action incl. a slider, hint).
- **Framing + version**: README/SPEC/docs/AGENTS say "the lane bridge"; the
  ecosystem split is explicit (gamestruct owns the generic lane; a world owns
  its door; a brain owns its client). Bumped to **1.0.0** (version-truth PASS).

The debloat (the world side, synmergia staging `7ac65e47`):

- The Synmergia AgentDoor dropped its hand-rolled generic protocol - MCP
  JSON-RPC (`/call`), a tool catalog with inputSchema, a vant-shaped
  `/mcp/exec` - because gamestruct now owns it. The door (332 -> 288 lines)
  serves only the four primitives plus its own `/coord` multi-agent extension.
  `/act` accepts the gamestruct `{id, verb, value}` body. The web client's dead
  `/tools` call is gone; its `/coord` call (which the door never served) now
  works. Receipts: driver 25/0, coordinator 30/0. Vant's client followed
  (`/mcp/exec` -> `/coord`, `timeoutMs`), test 17/0.

Gates: `npm run check` 17/0, bridgeworks 47/0, release ladder 29/0,
version-truth PASS, offline pack ladder VERIFIED (21 files, bin --version
1.0.0), web build 8/8 pages + SEO clean.

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

Verified this round:

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


## 2026-11-10 - the adopter sweep reaches gamestruct: #35

Propagates the coreforge adopter-sweep fixes (dhaupin/coreforge#52).

- **#35** - `test.yml` gains the arm-gated eyestruct row (pinned `eyestruct@1.1.0`, gated on `labs/.eyes/manifest.yml` existing) running the browserless, read-only `eyestruct gate`. Canon stays CI-cut; the battery only refuses drift. An unseeded repo stays parked instead of fake-red.
- **#48 / #49 - already correct here.** The `.gitignore` docs block already carried `docs/.jekyll-cache/`, `docs/.jekyll-metadata`, `docs/pagefind/`, `docs/pagefind*`, and `docs-deploy.yml` already triggers on `site.config.js` + `scripts/sync-site.mjs`. No change needed.
- **Receipt:** edited YAML parses. No version bump; v1.0.0 still held.

---

### 2026-11-03 - session: breadcrumbs on (engine + this site)

Google Search Console showed the family's properties under a breadcrumbs enhancement with 0 results. Recon split the fleet: the docs sites run freestruct (auto BreadcrumbList since 1.1.0); the product sites run prestruct, whose `buildJsonLd()` is site-wide by contract and could never emit a per-route trail. prestruct gained engine-level `breadcrumb: true` (injectMeta already owns the route path); this repo turned the discovery surface on.

- `scripts/sync-site.mjs` renders `breadcrumb: true` into `docs/freestruct.config.yml` (regenerated, sync:check PASS); `web/ssr.config.js` - `breadcrumb: true`.
- Receipts: docs config validates against the pinned engine; docs sync:check PASS where generated; prestruct's own `example/` build proves emission (BreadcrumbList on a sub-route, none on `/`).
- No version bump; a discovery-surface opt-in.

---

## 2026-11-11 - the mobile nav fits the viewport

Owner report (mobile-first): the header overflowed the phone screen and the burger - the only menu control below 640px - sat off-screen. Measured at 390px (headless probe): `document.scrollWidth` 431 vs `clientWidth` 375; the burger at x=397..431. The right cluster (GitHub icon + paint-scheme select + theme switch + burger) needs ~200px against ~144px free after the wordmark.

- **Fix (`web/src/styles.css`, the 640px block).** The decorative badge hides, the gaps tighten (`.nav-inner` 22->8px, `.nav-right` 8->4px), and the wordmark may shrink (`.brand { min-width: 0; overflow: hidden; white-space: nowrap }`). Every control is kept; the row can always fit, so the burger is always reachable.
- **Receipts.** Rebuilt dist probed at 320/360/375/390/414px - no overflow at any width, burger on-screen, all controls present. `npm run check` green.
- **Fleet.** The same defect + fix landed in all 9 sites carrying the family shell (coreforge, crashtest, govstruct, monoforge, poststruct, eyestruct, packstruct, memstruct, gamestruct); coreforge's `templates/site/` carries the same block, so a stamped repo inherits it.

---

## 2026-11-12 - the family status grid lights up (the CSP connect-src fix)

Owner report: the `/status` page's family grid showed a bunch of rows reading "not serving the dialect (Failed to fetch)".

**Root cause (measured, not guessed).** The server half was already correct: every sibling's `/status.json` answered `200` with `access-control-allow-origin: *`. The failure was the page's own `Content-Security-Policy`, whose `connect-src` was `'self' https://cloudflareinsights.com` (the generic template value). `connect-src` governs `fetch()` BEFORE any CORS header is consulted, so the browser refused every cross-origin read and the island rendered the refusal as "Failed to fetch" - a dark row with a correct 200 behind it. Receipt: headless chromium on `/status` logged `Refused to connect because it violates the document's Content Security Policy` for each sibling origin; the same probe against the served files showed 200 + ACAO `*`.

**Fix (`web/public/_headers`).** `connect-src` now lists the family member origins the island fetches (`web/src/components/FamilyStatusIsland.jsx`), self excluded. The list must stay a superset of the island's table minus self.

**The guard (a new law ships with a fixture that breaks it).** `tests/status.test.mjs` gains the reader-clause leg: it reads the island's `origin:` rows and the served CSP, and fails by name for any sibling origin the CSP omits. Proved both ways - removing an origin from the CSP fails the leg; restoring it passes.

**Scope.** The same defect + fix landed in gamestruct (the sibling whose island also fetches the full family). The other island repos already carried the sibling origins in their `connect-src`.
