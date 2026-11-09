# AGENTS.md — gamestruct

Cheat sheet for AI agents working on gamestruct. Keep it current; session
history goes in `labs/TASKS.md` (create it when the first session needs it).

## What this repo is

`gamestruct` is the **lane bridge**: one semantic tree that serves BOTH a
human's assistive technology (screen reader, switch, voice, a terminal) and a
machine agent (MCP client, brain). Four primitives
(`observe`/`act`/`wait_for`/`events`) plus an OPTIONAL fifth (`see`, the eyes),
two lanes, one contract. Born in games (Synmergia is the first world); not a
game contract - the `webform` and `dom` adapters prove it.

It is a **library + spec**, not a service. There is no build step; the
package is plain ESM. Node >= 18.

## Layout

```
bin/gamestruct.mjs        the CLI (check, doctor, tui, version, help)
lib/roles.mjs             role + action vocabulary (ARIA-aligned)
lib/tree.mjs              the semantic tree + stable handles
lib/events.mjs            the bounded event ring
lib/bridge.mjs            the door: tree + ring + handlers, four primitives + the eyes (see)
lib/profiles/human.mjs    the human lane (render, a11yDump, audit)
lib/profiles/agent.mjs    the agent lane (toolCatalog, affordances, toolCall, the see tool)
lib/bindings/http.mjs     the HTTP door (incl. /see)
lib/bindings/mcp.mjs      the MCP door (JSON-RPC 2.0; async, incl. see)
lib/adapters/synmergia.mjs  reference WORLD adapter
lib/adapters/vant.mjs       reference BRAIN adapter
lib/adapters/webform.mjs    reference NON-GAME adapter (a plain form; the generality receipt)
lib/adapters/dom.mjs        reference DOM adapter (a live element -> a tree)
lib/hosts/tui.mjs           the terminal host (the human lane with no pointer)
lib/selfcheck.mjs         the self-checks `gamestruct check` runs
lib/index.mjs             the barrel
tests/bridgeworks.test.mjs  the suite
web/                      the landing (prestruct + Vite + React; gamestruct.creadev.org)
docs/                     the Jekyll docs (rendered at docs.creadev.org/gamestruct)
docs/discussions/         the release-post convention (index.md + one announcing-vX.Y.Z.md per release; the file IS the GitHub Discussions post)
scripts/sync-site.mjs     generates docs/_config.yml + web public files from site.config.js
scripts/release-notes.cjs   the GH release body extractor (from CHANGELOG.md)
scripts/verify-release.cjs  the post-publish trust ladder (npm + GH release)
scripts/ship-from-download.cjs  the phone publish lane (family-reusable)
labs/battery.json         the committed self-check contract (gamestruct-battery@1)
labs/playtest.mjs         the live play-test harness (a reference brain; drives a running door through all five primitives incl. see)
labs/TASKS.md             session log (operational history)
web/scripts/build-status.mjs  the family-status@1 emitter (writes web/public/status.json)
SPEC.md                   the normative contract (spec revision v1.1, rules N1..N24; N22-N24 = the eyes)
DEPLOY.md                 the release runbook (the OIDC release ladder; the 0.9.0 bootstrap + phone lane as history)
site.config.js            the site identity (see below)
```

## House rules

1. **Zero dependencies.** The library must stay dependency-free. `fetch` is
   the only global it leans on (Node >= 18).
2. **Tabs? No — 4 spaces, ESM, single quotes, semicolons.** Match the
   existing files. `node --check` must pass on every module.
3. **The spec is normative.** If code and `SPEC.md` disagree, the code is the
   bug — or the spec needs a numbered rule change in the SAME commit.
4. **Every rule has a test.** A new N-rule in SPEC.md needs a matching
   assertion in `tests/bridgeworks.test.mjs`. `npm test` is the gate.
5. **Honesty over convenience.** A refusal is `{ ok:false, reason }`, never a
   throw across the boundary, never a silent no-op (SPEC N21).
6. **The two lanes never diverge.** If a handle is actionable in one lane it
   MUST be actionable in the other. That property is the whole product; guard
   it.
7. **`package.json` is THE single version truth.** The bin answers `--version`
   by reading it, `lib/version.mjs` derives `VERSION` from it, the MCP handler
   defaults to it, and `web/` carries NO version field. The web brand badge
   DERIVES from it too (`site.config.js` imports `package.json` and sets
   `badge: 'v' + pkg.version`), so the header can never drift. The README H1 is
   the one leg-pinned copy (`# gamestruct <v>`, the family convention). A
   release is "move package.json + the CHANGELOG + the README H1";
   `tests/version-truth.mjs` refuses any surface that drifts. The spec revision
   (`SPEC.md` v1) is its own axis.
8. **The release ladder is the family shape.** `1.0.0` was the first OIDC
   (provenance) cut and the lane is LIVE (1.0.0 + 1.1.0 shipped through it);
   `publish.yml` REFUSES 0.x. A tag drives
   publish -> release -> verify; the offline pack ladder
   (`tests/release-verify.test.cjs`) runs every push. See `DEPLOY.md`.

## Commands before any push

```bash
npm test          # version-truth + the suite + the ladder legs (must be green)
npm run check     # node --check every module + sync + the self-checks
npm run doctor    # eyeball both lanes on a demo surface
npx gamestruct tui   # eyeball the terminal host (piped prints one frame)
```

## Site identity

`site.config.js` is the ONE file an adopter edits for identity; the docs rig
derives `docs/_config.yml` from it. The site is served at
`gamestruct.creadev.org` (landing) and `docs.creadev.org/gamestruct` (docs).
Anything in `docs/` renders as docs.

The maker line is **Cairn @ Creadev.org** (`maker.label`), the synmergia brain
byline. It flows from `site.config.js` into the web footer
(`web/src/components/Footer.jsx`), the docs footer
(`docs/_layouts/default.html`, `site.maker_label`), and the README license
footer. All three footers carry a live **https://creadev.org** backlink - keep
it, the backlink is how the family grows.

## Branches

- `main` — the published line.
- `staging` — the integration line; fast-forward to `main` on promotion.

Work on `staging`, promote to `main` with a fast-forward. No PRs required for
this repo (owner-granted).
