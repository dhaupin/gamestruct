# gamestruct - session log

Operational history. Stable conventions live in `AGENTS.md`; the normative
contract lives in `SPEC.md`.

## 2026-11-03 - clone refreshed to v1.5.1, and the parity gate lands

The workspace clone had drifted: `feat/npm-parity-links` was based on `6e22129`, 2231
lines and several releases behind `origin/main` (`73a7844`, v1.5.1). That is why
`check-npm-tracking --live` reported the ledger's tree 1.3.0 against the registry's
1.5.1 - a stale checkout, not a ledger bug.

**Refreshed.** Fetched, then rebuilt the branch on `origin/main` rather than rebasing
the stale one: the old commit carried only four files, and three of them (CHANGELOG,
TASKS, package.json wiring) had moved on upstream. Porting forward beat merging a
2231-line reversal.

**What was actually missing.** Nothing on the surfaces - `origin/main` already links
npm in the docs header, the docs nav, and `site.config.js`. What was missing was the
test. Ported `tests/npm-parity.test.mjs` and wired it into `npm test`.

**The first port did not bite, which is the point of checking.** It used the family's
"at least one surface has a link" shape. Retargeting `docs/_data/nav.yml` to a
non-npm URL still passed 5/5, because other surfaces satisfied the check - a gate that
cannot see the surface that broke. Rewritten around a `parityProblem()` predicate over
an explicit `REQUIRED` list, then re-verified on real bytes: retargeting the nav now
reds 2 tests, restore returns 6/6. Mutation fixtures in the suite cover a stripped
surface and a wrong package name.

**Receipts.** `npm test` 90/90 + 37/37 pass; `npm run check` exit 0 (after
`npm install` - the fresh checkout had no `packstruct`, so `lint:packs` exited 127
until the dependency was installed). No version bump: repo surfaces, not the package.

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

### 2026-11-12 - session: the island sees the whole family (interop)

The family release-readiness pass (owner-driven) swept all eight island sites. One interop defect: the `/status` island hand-types its sibling set, and this site's set had drifted - this site listed seven members (through `gamestruct`), missing `memstruct`. Both members already serve the family-status@1 dialect, so this page simply could not render them.

- **The fix.** `web/src/components/FamilyStatusIsland.jsx` now lists every other family member, and `web/public/_headers` `connect-src` gains `https://gamestruct.creadev.org` and `https://memstruct.creadev.org` (the reader half - CSP governs `fetch()` before any CORS header). The reader-clause guard stays green.
- **The sibling census (receipts).** Eight sites carry the island: eyestruct, crashtest, poststruct, packstruct, govstruct, monoforge, gamestruct, memstruct. Only `memstruct` listed all eight; the rest were missing the two newest members. All eight are now aligned (self handled per each site's own convention - crashtest/govstruct/monoforge exclude self, the rest include it).
- **Battery.** `npm test` green after the change.
- **The parent receipt.** The full pass (CSP sweep = no live bug remains; `npm audit --omit=dev` = 0 vulnerabilities across all eleven packages; `npm pack --dry-run` clean; two railyard ledger drifts fixed) lives in `dhaupin/railyard` (`CHANGELOG.md` + `labs/TASKS.md`).
- **No version bump.**


### 2026-11-12 - session: the Dependabot flow lands (railyard#31)

- **Change.** Added `.github/dependabot.yml` (weekly Monday, grouped minor/patch, majors alone, plus the `github-actions` ecosystem). npm directories `/web`.
- **Shape (receipt).** `dhaupin/creadev` PR #38 (`fca49c6`); the family-wide rollout is tracked on `dhaupin/railyard#31`.
- **Guard.** railyard's `scripts/check-dependabot.cjs` (the shape) + `scripts/check-dependabot.test.cjs` (it bites), wired into railyard CI.
- **No version bump.**

### 2026-11-12 - session: the v1.3.0 cut

The family release-readiness pass (owner-driven). This repo's cut:

- **Version.** `1.2.1 -> 1.3.0` (package.json + the README H1 status copy, leg-pinned by `tests/version-truth.mjs`). A minor: `DoorClient` gains a `principal` for multi-agent doors.
- **Changelog.** `## [Unreleased]` cut to `## [1.3.0] - 2026-11-12`; entries stay verbatim.
- **Announcement.** `docs/discussions/announcing-v1.3.0.md` + the index row.
- **Release.** Branch -> PR -> `staging` -> PR -> `main`, then the `v1.3.0` tag drives the OIDC ladder.

---

### 2026-11-13 - session: the /web family matrix (React 19 + Vite 8, prestruct ^1.5.0)

Unblocked by prestruct 1.5.0 (it widened its peer ceilings `react`/`react-dom` `>=18 <20`, `vite` `>=5 <9` after the example-lane bake proved React 19 + vite 8). This repo's own landing site moves onto the matrix.

- **web/package.json.** `react`/`react-dom` `-> ^19.3.1`, `vite` `-> ^8.3.7`, `@vitejs/plugin-react` `-> ^6.3.0`, `prestruct` `-> ^1.5.0`; `engines.node >=20.19` (vite 8's floor).
- **web/vite.config.js.** `manualChunks` is a FUNCTION (the object form vite <=7 accepted is rejected by rolldown); `minify: 'esbuild'` dropped (esbuild unbundled, oxc default).
- **Proof.** The site bakes 8/8 pages, audit 0 failures, on the new matrix; the repo's own battery + `check` stay green.
- **No version bump** (the repo's own landing site, not the shipped surface; the crashtest `deps: web toolchain` precedent).


---

### 2026-11-13 (cont.) - the release posts were invisible to the sitemap (permalink shape)

Every `docs/discussions/announcing-vX.Y.Z.md` carried a dotted, slashless permalink; Jekyll emits the page extensionless (Ruby reads the `.0` as a file extension) and freestruct's `.html`/`.htm` scanner never sees it - no sitemap `<loc>`, no og/canonical, though the pages serve 200. The live sitemap listed none of them. Fix: trailing-slash every permalink; rebuild the index (rows link the slash form, newest first, stale "staged for the tag" markers corrected against the registry). Two biting tests in the post-permalinks test. Ported from eyestruct.

---

### 2026-11-15 - session: the v1.4.0 cut (the packs surface)

The family release-readiness pass (owner-driven). This repo's cut:

- **Version.** `1.3.0 -> 1.4.0` (package.json + the README H1 status copy, leg-pinned by `tests/version-truth.mjs`). A minor: the packs surface lands (`lib/packs.mjs` + `packs/public/bridge-shapes/`), packstruct@1 parity with the family.
- **Changelog.** `## [Unreleased]` cut to `## [1.4.0] - 2026-11-15`; entries stay verbatim.
- **Announcement.** `docs/discussions/announcing-v1.4.0.md` + the index row.
- **Release.** Branch -> PR -> `staging` -> PR -> `main`, then the `v1.4.0` tag drives the OIDC ladder.

## 2026-11-17 - the third binding: EMBEDDED (SPEC v1.3, N27) - PR #34 -> staging

**Context.** Synmergia's wasm build could not expose `window.SynmergiaAgent` at
all: the hooks installed, but every call came back `undefined`/`null`. Root-
caused to three marshalling laws that hold at once across a language boundary,
each live-verified by isolating a retained callback:

1. a host callback **runs**, but its **return value never crosses back** --
   every type (int/String/Dictionary) arrived as `null`;
2. a structured **argument** arrives as an **opaque foreign handle** -- a JS
   object reached GDScript as a `JavaScriptObject`, never a `Dictionary`;
3. an object literal **containing** host callbacks does not survive the
   outbound marshal -- `window.SynmergiaAgent = {...}` landed as `undefined`.

**Diagnosis that shaped the work.** These are not Synmergia quirks; they are
what a language boundary does. gamestruct defined two bindings, both wire-based
(HTTP, MCP), and both assume a serializer at each end. A boundary crossing has
none, and it fails SILENTLY. So the missing thing was a third binding, not a
patch to the game.

**Shipped (PR #34).**
- `lib/bindings/embedded.mjs` (exported `gamestruct/embedded`): `createDoor`
  (host half: JSON strings out) + `createFacade({callbacks, read})` (client
  half: parsed objects in, injected side channel). Every failure is an honest
  `{ok:false, reason}`; the side channel is injected, never assumed.
- SPEC **v1.3**, rule **N27 (the boundary carries text)** + section 7.3.
- `DoorClient` gains an `embedded` transport, so a brain never learns which
  transport it is on.
- 9 tests including a **boundary simulator** that enforces all three laws;
  revert-checked (trusting the return value -> 77 pass / 1 fail).
- Docs + 2 self-checks.

**Gates:** `npm test` 116/0; `npm run check` 22/22 + packs 5/5 + lint +
conformance 10/10; CI `battery` + `Cloudflare Pages` green at `906cc7c`.

**Lesson (the battery).** `gamestruct check` and CI's `battery` leg are NOT the
same gate: `web/scripts/build-status.mjs` reconciles the live self-check run
against the committed `labs/battery.json`, and a live check not listed there
reads `UNLISTED -> RED`. I added checks without editing the contract, so CI
went red while everything passed locally. The contract's own note says it:
"Edit this file in the same commit that adds or removes a check." Verify with
`node web/scripts/build-status.mjs` (the emitter itself), not `gamestruct check`.

**Next (outside-in).** Wire Synmergia's `web/shared/agent-client.js` and
`web_input_bridge.gd` onto `gamestruct/embedded` so the in-page lane stops
hand-rolling the side channel and inherits N27 by construction; then re-pin.

## 2026-11-20 - release: v1.5.0 (the embedded binding ships)

**Merged first.** PR #34 (feat/embedded-binding) merged into `staging` at
`66dbeb7`. Full gate green on the merged tip before the release branch was cut:
`npm test` 116/0, `npm run check` 22/22 + packs + lint + conformance 10/10,
status emitter "selfcheck 22 PASS".

**What the release commit carries** (the ladder, matching `release/v1.4.0`):
- `CHANGELOG.md` - `## [1.5.0] - 2026-11-20` inserted under `[Unreleased]`, the
  existing `### 2026-11-17 - the third binding` sub-heading riding along.
- `package.json` + `README.md` H1 -> 1.5.0 (version-truth pins both).
- `docs/discussions/announcing-v1.5.0.md` + the index row.
- This log entry.

**Version call: minor, 1.5.0.** Additive only - a new module, a new export, a
new optional client target, and a SPEC rule explicitly marked OPTIONAL. No
existing HTTP/MCP door changes behavior. 1.5.0 was unclaimed on npm (latest was
1.4.0), so no collision.

**Packs audit (asked, verified).** `packs/public/bridge-shapes` ships COMPLETE
in the tarball - `tar -tzf` matches `find packs -type f` byte for byte, all 6
files including the clean + broken conformance fixtures and `test/fixtures/run.mjs`
(the manifest's `armedCoverage`). Verified against an INSTALLED tarball, not just
a dry-run listing: `packstruct lint --deep` passes and the fixtures run green
("all 5 check(s) armed on clean + broken + absent - PASS"). The `files` field
ships `packs/` wholesale, so no fixture is silently dropped by `.npmignore`.

**Pre-existing, not ours.** The web build prints `WARN what/index.html:
description 166 chars (outside 70-165)`. Confirmed by building at tag `v1.4.0` -
it warns there too. A warning, not a failure; left alone.

**Known gap (follow-up, not blocking).** `tests/version-truth.mjs` claims to pin
"every surface that names the CURRENT version" but pins only 3 (web/package.json,
README H1, the site.config badge derivation). The discussions post frontmatter
`version:` and the index table version are hand-edited and unguarded - the exact
"silently-shrunk battery" class `labs/battery.json` exists to refuse, but for
version strings.

## 2026-11-20 - v1.5.0 tagged and published (and the ladder lesson)

**Tagged and shipped.** `v1.5.0` (annotated, `gamestruct 1.5.0`, matching the
v1.3.0/v1.4.0 message form) on `02b6225`. `publish` job green: npm `latest` is
`1.5.0`. GH release published with the registry tarball attached
(`gamestruct-1.5.0.tgz`, 53,819 bytes). The registry tarball, the release asset
and a local `npm pack` are byte-identical (`sha256 7d4677e3...`). `staging`
fast-forwarded to `main` by the sync job.

**The ladder failed, not the release.** `publish` succeeded, then `release` and
`verify` failed. The attach step polls `npm pack gamestruct@V` for 60x5s (5 min);
the registry read replica took ~6 min, so the step gave up. Because the release
object is cut BEFORE the tarball attach, the failure left a PUBLISHED release
with ZERO assets, and verify then correctly refused.

Recovered by hand: attached the registry tarball to the release, re-ran the
failed jobs -> all three green. Verified independently rather than trusting the
workflow's own report.

**Fixed properly (PR #37, merged).** Bound 60 -> 90 attempts with a 5s -> 30s
backoff (43 min worst case, far inside the job limit). Validated with `bash -n`
and by driving the loop with a fake `npm` that fails twice (recovers on attempt
3, backoff visible). Lesson for the next cut: a *published* release can carry
zero assets, so "npm has it" is not the whole check - assert the asset too.

**Process note (this round's real drift).** `docs-deploy.yml` deploys on push to
`main`, NOT on the tag, so merging the promote PR published the announcement
post while npm still served the previous version - the exact "fiction by
promotion" the discussions index forbids. The window closed when the tag was
pushed. If a future cut wants zero window, gate the docs deploy on the tag or
land the post in a follow-up commit after publish. Not changed here: the current
order (promote, then tag within minutes) is the established flow.

**Still open (follow-up).** `tests/version-truth.mjs` pins only 3 surfaces while
claiming "every surface that names the CURRENT version". The post frontmatter
`version:` and the discussions index row are hand-edited and unguarded.
