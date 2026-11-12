# Changelog

All notable changes to gamestruct are recorded here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### 2026-11-12 - the island sees the whole family (interop)

The `/status` family island hand-types its sibling set (`web/src/components/FamilyStatusIsland.jsx`), and the set had drifted: this site listed seven members (through `gamestruct`), missing `memstruct` - both of which already serve `/status.json` on the family-status@1 dialect. So this page could not render them at all. The island now lists every other family member, and `web/public/_headers` `connect-src` gains the two origins (the reader half: CSP governs `fetch()` before CORS, so an origin the island fetches but the CSP omits is a dark row). The reader-clause guard stays green - it pins the island's `origin:` rows to the served CSP so the two cannot drift silently again.

Found in the family release-readiness pass; the full session (the CSP sweep, the vuln/pack pass, and the railyard ledger drifts) is receipted in the parent (`dhaupin/railyard`, `CHANGELOG.md` + `labs/TASKS.md`). No version bump.


### 2026-11-12 - the family status grid lights up (CSP connect-src)

Owner report: the `/status` family grid showed a row of "not serving the dialect (Failed to fetch)" for every sibling. **Root cause (measured, not guessed):** each sibling's `/status.json` answered `200` with `access-control-allow-origin: *`, so the server half was correct; the page's own `Content-Security-Policy` carried `connect-src 'self' https://cloudflareinsights.com`, which governs `fetch()` *before* any CORS header is consulted. The browser refused every cross-origin read and the island rendered the refusal as "Failed to fetch". Receipt: headless chromium on `/status` logged `Refused to connect because it violates the document's Content Security Policy` for each sibling.

- `web/public/_headers` - `connect-src` now lists the family member origins the island fetches (`web/src/components/FamilyStatusIsland.jsx`), self excluded. `tests/status.test.mjs` pins the subset, so the island's table and the served CSP can never drift apart silently again (a missing origin now fails by name).

### 2026-11-11 - the mobile nav fits the viewport

Owner report (mobile-first): the header overflowed the phone screen and the burger - the only menu control below 640px - sat off-screen. Measured at 390px (headless probe): `document.scrollWidth` 431 vs `clientWidth` 375, the burger at x=397..431. The right cluster (GitHub icon + paint-scheme select + theme switch + burger) needs ~200px against ~144px free after the wordmark, so the row could not shrink.

- `web/src/styles.css` (the 640px block) - the badge (decorative) hides first, the gaps tighten (`.nav-inner` 22->8px, `.nav-right` 8->4px), and the wordmark may shrink (`.brand { min-width: 0; overflow: hidden; white-space: nowrap }`) so the row always fits; the burger can never land off-screen. Every control is kept.
- Receipts: rebuilt web dist probed at 320/360/375/390/414px - no horizontal overflow at any width, burger on-screen, all controls present; `npm run check` green.

### 2026-11-11 - the thesis band lands on the content grid (mobile)

The thesis band - the accent-ruled pull-quote below the hero - rendered as a full-bleed bar on mobile: bold text, block edge-to-edge, no margin.

**Root cause (measured, not guessed).** The accent was a `border-left` on `.band.thesis .wrap`, and `.wrap` is content-box. Desktop centres a 960px `.wrap`, so the rule landed on the content grid by luck; on a narrow viewport `.wrap` fills the width, so its left border sat flush at the viewport edge (x=0) - a full-height 3px accent bar hugging the screen edge, with the text pushed in by the pad. Receipt: 390px headless screenshot; the accent-column scan found the rule at x=0,1,2.

**The fix (`web/src/styles.css`).** Two geometry rules keep the rule on the grid at every width:
- `.band.thesis { padding-left: 20px; padding-right: 20px; }` - the band carries the `.wrap` gutter on both sides, so the rule can never sit flush against the viewport edge on narrow screens. The band's full-bleed background is unaffected (padding sits inside the background box).
- `.band.thesis .wrap { border-left: 3px solid var(--accent); padding-left: 17px; }` - `3px border + 17px pad = the 20px gutter` every section's `.wrap` uses, so the band box is the same width as its siblings (the old 24px pad made it 7px wider).

**Receipts.** Rebuilt web; probe at 1280px: band `.wrap` on the section grid (`RULE ON GRID: true, BOX MATCH: true`). At 390px the accent rule sits inset (was flush at x=0), no horizontal overflow.

**Parity.** memstruct carried the identical defect (the lander CSS is the family shell); the same fix lands there. No version bump; the play contract is unchanged.

### 2026-11-03 - breadcrumbs on (engine + this site)

Google Search Console showed the family's properties under a breadcrumbs enhancement with 0 results. Recon split the fleet: the docs sites run freestruct (auto BreadcrumbList since 1.1.0); the product sites run prestruct, whose `buildJsonLd()` is site-wide by contract and could never emit a per-route trail. prestruct gained engine-level `breadcrumb: true` (injectMeta owns the route path), and this repo turned the discovery surface on in its configs.

- `scripts/sync-site.mjs` renders `breadcrumb: true` into `docs/freestruct.config.yml`; regenerated, sync:check PASS.
- `web/ssr.config.js` - `breadcrumb: true` (active once the prestruct engine feature ships).
- Receipts: docs config validates against the pinned engine; docs sync:check PASS where generated.
- No version bump; a discovery-surface opt-in.

### Added

- **`DoorClient` carries a `principal` (multi-agent doors).** A world that
  seats more than one body behind one door (synmergia's agent-play lane) names
  WHICH body a primitive drives with a `principal` (absent/'' = the local seat).
  `observe({ principal })` rides the door's own `?principal=` query and
  `act(id, verb, value, { principal })` rides a top-level `principal` on the
  `/act` body -- top-level because the door folds a dictionary `value` into its
  args, so a principal folded into `value` would be swallowed whenever `value`
  is a scalar. Remote-only: an in-process bridge has one seat, and every
  no-principal call keeps its byte-identical reference shape. Pin:
  `tests/bridgeworks.test.mjs` "DoorClient carries a principal on the remote
  wire".

## [1.2.1] - 2026-11-04

### Added

- **The landing is a real lander now (marketing homepage).** `web/src/pages/Home.jsx`
  grew from a hero into the full pitch: a thesis band ("one missing
  description"), *who it is for* (players who use assistive tech, agents,
  game devs, studios), *why it is needed* (the human/agent/both failure table),
  *what you get* (the four primitives + the eyes, both lanes, the bindings),
  *how it works* (the four-step adoption path), *auto a11y*, *why devs adopt it*
  (six cards), and the ecosystem proof (synmergia/vant/webform+dom), closing on
  a CTA band. New `.band` / `.chips` / `.section-title` styles ride the existing
  tokens (no hardcoded hex), so both themes and all three paint schemes carry it.
- **npm + docs links in the menus.** `site.config.js` nav gains `Docs` and
  `npm` (the header, sidebar, and footer all render the one vocabulary), and the
  docs rig gains an npm row in `docs/_data/nav.yml` plus an npm icon in the docs
  header beside GitHub.

### Changed

- **The landing route meta** (`site.config.js`) reads for the pitch
  ("one tree, two lanes, every player and agent") instead of the spec summary.
- **Stale runner note scrubbed.** `labs/TASKS.md` no longer says the family
  runners are "being reworked" - the parallel runner has long been live.

## [1.2.0] - 2026-11-10

### Added

- **The reference client's transport is injectable (issue #1, SPEC v1.2,
  N25–N26).** `DoorClient` accepts a `fetch` in its constructor and routes
  every remote call through it (default: global `fetch`), so a brain can
  interpose its own wall (SSRF/DNS-rebinding refusal, circuit breaker, egress
  policy) without forking the reference. SPEC v1.2 adds N25 (the transport
  wall) and N26 (a refusal body crosses the wire as data — N21 carried across
  the wire); the refusal-verbatim behavior was already correct and is now
  pinned by tests. Three new battery legs (bridgeworks 64 -> 67).

## [1.1.1] - 2026-11-10

### Added

- **The battery carries the eyestruct arm (issue #35).** `test.yml` gains an ARM-GATED row (pinned `eyestruct@1.1.0`, gated on `labs/.eyes/manifest.yml` existing) that runs the browserless, read-only `eyestruct gate` (exit 1 on unexplained visual drift). Canon stays CI-cut (eyestruct's own ratify lane); this battery only refuses drift, and an unseeded repo stays parked instead of fake-red.

### Fixed

- **Status-page check count.** `docs/status.md` and `web/src/pages/Status.jsx`
  said the selfcheck leg was "the same 17 checks `gamestruct check` runs";
  the battery has been 20 since the eyes landed (SPEC v1.1, N22-N24). The
  prose now reads "the same checks" (no hardcoded count), so it cannot
  drift again when a check is added.

## [1.1.0] - 2026-11-09

### Added

- **The eyes: `see()`, the OPTIONAL fifth primitive (SPEC v1.1, N22-N24).**
  A surface that can render pixels can now be *seen* by an agent. Register a
  capture function (`bridge.onSee(fn)`) and the bridge gains eyes: `see()`
  returns a small descriptor (`{ ok, path, url, mime, bytes, width, height }`)
  - a `path`/`url` to a frame the agent reads with its OWN vision, never the
  pixel bytes, so the wire stays small. A surface with no renderer refuses
  honestly (`{ ok:false, reason:'this surface has no eyes' }`) and advertises
  no `see` tool; a sighted surface advertises exactly one `see` tool and
  records a ring event so both lanes observe the capture.
  - **Bridge:** `onSee(fn)` / `canSee` / `see(opts)`.
  - **HTTP binding:** `GET|POST /see` (`{label, full}`) -> `see(...)`; `404`
    when the surface is blind.
  - **MCP binding:** the `see` tool in `tools/list`, a direct `see` method, and
    `tools/call { name: 'see' }`; the handler is now async (the eyes are).
  - **agent lane:** `toolCatalog` appends the `see` tool when `bridge.canSee`;
    `toolCall(bridge, 'see', ...)` dispatches onto `bridge.see()`.
  - **synmergia adapter:** pass a `see` sender and the bridge forwards the
    door's own `/see` verb; omit it and the world is honestly blind.
  - **vant adapter:** `DoorClient.see(opts)` - the brain's sight, local or
    remote.
  - Ten new test legs + four new self-checks (blind refusal, sighted capture,
    no-image refusal, throwing capture, HTTP 404/200, MCP tool + method, blind
    MCP error, adapter + client forwarding).

### Fixed

- **A remote catalog reads a WORLD door's own snapshot.** `DoorClient.catalog()`
  over the wire read `observe().nodes`, but a game door serves its own flat
  `actions[]` (a live world, not a serialized tree), so the catalog failed
  against the real Synmergia door -- the cross-repo drift the family carried
  forward. The synmergia adapter now exports `doorNodes(snapshot)`, the ONE
  normalizer that folds the door's wire shape into the SPEC node shape (reusing
  the same role mapping + verb affordance the local bridge build uses, so the
  two never drift), and `DoorClient` takes an optional `mapNodes` normalizer
  (`new DoorClient({ url, mapNodes: doorNodes })`). Omit it and a door that
  serves no `nodes` refuses honestly, as before. Verified live: the remote
  catalog reads the door's own `ui:` handles (including `set_value` on a text
  field) and advertises the `see` tool.

- **The Synmergia adapter wires `set_value`.** A settable control (text box,
  slider, combo, checkbox, switch) now advertises `set_value` and its handler
  forwards `{ id, verb: 'set_value', value }` to the door; everything else
  keeps advertising `activate`. Before this, a text field advertised
  `ACTIVATE`, so an agent driving a login form had no way to type -- the gap a
  live play-test caught (the door could press buttons but not fill a field).
  Companion door change: Synmergia's `A11yService` gained the value write and
  the driver now branches on the wire verb.

## [1.0.0] - 2026-11-09

### Added

- **The DOM adapter: `gamestruct/adapters/dom`.** `fromElement(el)` walks a
  live DOM subtree into the same tree the game and form adapters build,
  reading the attributes an accessible page already carries (`role`,
  `aria-*`, `alt`, `title`, `label[for]`) and falling back to the tag name
  and text. The receipt is sharper than the form's: a page that is already
  accessible to a screen reader is, with no extra markup, ALREADY a door an
  agent can drive. Zero dependencies (it duck-types the element interface, so
  it runs against a real DOM in a browser and a plain fixture in Node).

- **The TUI host: `gamestruct/hosts/tui`.** The human lane on a device with no
  pointer. `render(bridge)` draws the tree as a text frame; `key(bridge, k)`
  drives it (`tab` walks the focus order, `enter` runs the node's DEFAULT
  action, typing sets a value) using the SAME handles the agent lane uses. The
  new `gamestruct tui` command runs it; on a pipe it prints one frame and
  exits, so CI can read it.

- **Ten new test legs** (`tests/bridgeworks.test.mjs`, now 47): the DOM adapter
  (a real element -> both lanes; `label[for]` naming; `aria-hidden` pruned;
  ARIA role/name order; act routing) and the TUI host (text frame; tab order;
  `enter` runs the default action, incl. a slider's `set_value`; the status
  hint).

- **The generality receipt: `gamestruct/adapters/webform`.** A plain HTML form
  -> a gamestruct tree, with no game loop, player, or HP. It proves the
  contract is not a game contract - the same four primitives and the same two
  lanes operate a contact form, a kiosk, or a checkout. Field edits are local,
  the door call fires once at submit, and an invalid submit refuses by name +
  announces on the live region.

### Changed

- **Framing widened from "the game-agent lane bridge" to "the lane bridge."**
  Games are the first consumer, not the boundary. `SPEC.md` sec 1-2, the
  README pitch, and `site.config.js` now say so; the reference adapters are
  the world, the brain, and the non-game form.

- **The web brand badge now DERIVES from `package.json`** (`site.config.js`
  imports it and sets `badge: 'v' + pkg.version`), closing the last hand-copied
  version surface - the header can no longer drift on a cut. `tests/version-truth.mjs`
  gained the badge-derivation leg that refuses a literal.
- **Attribution corrected to `Cairn @ Creadev.org`** (the synmergia brain
  byline) across the site config, README, and docs. The maker line flows from
  `site.config.js` into all three footers.
- **A live `https://creadev.org` backlink is present in all three footers** -
  the web footer (`Footer.jsx`), the docs footer (`docs/_layouts/default.html`),
  and the README license line.
- **README** carries the version-pinned H1 (the family convention) and a
  `DEPLOY.md` link.

- **The Synmergia adapter is pinned to the REAL door, not an invented shape.**
  `lib/adapters/synmergia.mjs` now maps the door's actual `observe()` snapshot
  (player / target / party / actions / events) and reuses the door's own
  handles (`ui:<path>` / `world:<id>`) UNCHANGED, so `act(handle)` forwards the
  exact string the door's `activate_by_id` matches. Five legs pin it.

- **The ecosystem split is now explicit.** gamestruct owns the generic lane
  (primitives, tree, profiles, HTTP + MCP bindings, adapters, hosts); a world
  owns its door; a brain owns its client. The worked example is the Synmergia
  door's debloat: it dropped its hand-rolled MCP JSON-RPC + tool catalog
  (`/call`, `/tools`, `/mcp/exec`) and now serves only the four primitives plus
  its own `/coord` extension. The protocol layer has ONE owner.

## [0.9.0] - 2026-11-09

The first publishable cut: the bridgeworks library, the spec, the two
reference adapters, the landing + docs surfaces, and the family release
ladder. 0.9.x is the manual npm lane (DEPLOY.md); 1.0.0 flips to OIDC trusted
publishing, which `publish.yml` gates for.

### Added

- **The contract** (`SPEC.md`, spec revision v1): four primitives
  (`observe`/`act`/`wait_for`/`events`), the node shape, two lanes, bindings,
  and posture. Rules N1-N21. The spec revision is its own axis, decoupled from
  the package semver.
- **`lib/roles.mjs`** - the ARIA-aligned role + action vocabulary.
- **`lib/tree.mjs`** - the semantic tree, stable handles, traversal, lookup.
- **`lib/events.mjs`** - the bounded event ring (announce/change/focus) with an
  honest cursor.
- **`lib/bridge.mjs`** - the door: tree + ring + handlers, the four primitives.
- **`lib/profiles/human.mjs`** - the human lane: `render`, `a11yDump`, `audit`.
- **`lib/profiles/agent.mjs`** - the agent lane: `toolCatalog`, `affordances`,
  `toolCall`.
- **`lib/bindings/http.mjs`** - the HTTP door, fail-closed token auth.
- **`lib/bindings/mcp.mjs`** - the MCP door (JSON-RPC 2.0).
- **`lib/adapters/synmergia.mjs`** - the reference WORLD adapter.
- **`lib/adapters/vant.mjs`** - the reference BRAIN adapter.
- **`bin/gamestruct.mjs`** - the CLI: `check` (self-checks) and `doctor` (both
  lanes + the a11y audit on a demo surface).
- **The release ladder** (the family shape): `scripts/release-notes.cjs`
  (extracts the GH release body from the changelog), `scripts/verify-release.cjs`
  (the post-publish trust ladder), and `scripts/ship-from-download.cjs` (the
  phone publish lane). `.github/workflows/publish.yml` drives
  tag -> publish -> release -> verify, with the offline pack ladder
  (`tests/release-verify.test.cjs`) running on every push as a standing receipt.
- **`labs/battery.json`** - the committed contract for the bridgeworks'
  self-check battery (`gamestruct-battery@1`). The status emitter reconciles
  the live run against it: a check that silently disappears reads RED, never a
  smaller green.
- **`web/scripts/build-status.mjs`** - the `family-status@1` emitter. Runs the
  self-checks at web-build time and writes `web/public/status.json` (generated,
  gitignored - regeneration is the freshness). Wired into `npm run build`.
- **`web/src/components/FamilyStatusIsland.jsx`** + **`web/src/pages/Status.jsx`**
  - the `/status` surface: reads every family member's served `/status.json`
  live, no server, no guessed numbers.
- **Docs pages** - `start.md`, `why.md`, `what.md`, `about.md`, `status.md`
  (the `family-status@1` dialect), and `search.md` (Pagefind). The docs nav is
  regrouped (Start / The two lanes / Reference / Surfaces).
- **Web pages** - `/start`, `/why`, `/what`, `/about`, `/status`, each with
  route meta and prerendered HTML.
- **`DEPLOY.md`** - the release runbook (the manual 0.9.x lane, the OIDC flip,
  the phone lane, the landing + docs hosting contracts).

### Changed

- **`package.json` is THE single version truth.** `lib/version.mjs` derives
  `VERSION` from it, the bin answers `--version` by reading it, the MCP handler
  defaults to it, and the web rig carries no version field of its own.
  `tests/version-truth.mjs` refuses any surface that drifts.
- The tarball ships `bin/` + `lib/` + `SPEC.md` + `LICENSE` only (the family
  pack law forbids `docs/`, `tests/`, and the other tree dirs from a runtime
  tarball).
- Docs brought to the family voice: hyphen-only (no em/en dashes), every code
  fence tagged, and index links made root-absolute (`relative_url`).
- `.gitignore` (root + `web/`) carries the family docs block; generated
  `status.json` is ignored.

### The idea

A UI accessible to a human with assistive technology and a UI accessible to a
machine agent need the same four things. gamestruct builds those once and
serves both. The accessibility win is real for people; the agent win falls out
of the same work.

## [0.1.0] - 2026-11-09

The scaffold: the spec, the bridgeworks library, and the two reference
adapters (the pre-release tree; superseded by 0.9.0).

### Added

- **The contract** (`SPEC.md`): four primitives, the node shape, two lanes,
  bindings, and posture.
- **`lib/`** - roles, tree, events, bridge, the human + agent profiles, the
  HTTP + MCP bindings, and the synmergia (world) + vant (brain) adapters.
- **`bin/gamestruct.mjs`** - `check` and `doctor`.
- **`tests/bridgeworks.test.mjs`** - 31 assertions over the tree, both lanes,
  both bindings, and the two adapters.
- **`web/`** - the landing site (prestruct + Vite + React), driven by
  `site.config.js`; prerendered, with sitemap + `llms.txt` and a clean SEO
  audit.
- **`docs/`** - the Jekyll docs rig (rendered at docs.creadev.org/gamestruct).
- **`scripts/sync-site.mjs`** - generates `docs/_config.yml`,
  `docs/freestruct.config.yml`, and the web public files (`robots.txt`,
  `site.webmanifest`) from `site.config.js`; `--check` gates drift.
- **CI** - `test.yml` (the battery + the web build + the Jekyll docs build),
  `docs-deploy.yml` (thin caller of the freestruct docs lane), and
  `staging-ff-sync.yml` (fast-forward staging to main after a promotion).
