# Changelog

All notable changes to gamestruct are recorded here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

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
