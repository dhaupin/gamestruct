# AGENTS.md — gamestruct

Cheat sheet for AI agents working on gamestruct. Keep it current; session
history goes in `labs/TASKS.md` (create it when the first session needs it).

## What this repo is

`gamestruct` is the **game-agent lane bridge**: one semantic tree that serves
BOTH a human's assistive technology (screen reader, switch, voice) and a
machine agent (MCP client, brain). Four primitives
(`observe`/`act`/`wait_for`/`events`), two lanes, one contract.

It is a **library + spec**, not a service. There is no build step; the
package is plain ESM. Node >= 18.

## Layout

```
bin/gamestruct.mjs        the CLI (check, doctor, version, help)
lib/roles.mjs             role + action vocabulary (ARIA-aligned)
lib/tree.mjs              the semantic tree + stable handles
lib/events.mjs            the bounded event ring
lib/bridge.mjs            the door: tree + ring + handlers, four primitives
lib/profiles/human.mjs    the human lane (render, a11yDump, audit)
lib/profiles/agent.mjs    the agent lane (toolCatalog, affordances, toolCall)
lib/bindings/http.mjs     the HTTP door
lib/bindings/mcp.mjs      the MCP door (JSON-RPC 2.0)
lib/adapters/synmergia.mjs  reference WORLD adapter
lib/adapters/vant.mjs       reference BRAIN adapter
lib/selfcheck.mjs         the self-checks `gamestruct check` runs
lib/index.mjs             the barrel
tests/bridgeworks.test.mjs  the suite
web/                      the landing (prestruct + Vite + React; gamestruct.creadev.org)
docs/                     the Jekyll docs (rendered at docs.creadev.org/gamestruct)
scripts/sync-site.mjs     generates docs/_config.yml + web public files from site.config.js
labs/TASKS.md             session log (operational history)
SPEC.md                   the normative contract (N1..N21)
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

## Commands before any push

```bash
npm test          # the suite (must be green)
npm run check     # node --check every module + the self-checks
npm run doctor    # eyeball both lanes on a demo surface
```

## Site identity

`site.config.js` is the ONE file an adopter edits for identity; the docs rig
derives `docs/_config.yml` from it. The site is served at
`gamestruct.creadev.org` (landing) and `docs.creadev.org/gamestruct` (docs).
Anything in `docs/` renders as docs.

## Branches

- `main` — the published line.
- `staging` — the integration line; fast-forward to `main` on promotion.

Work on `staging`, promote to `main` with a fast-forward. No PRs required for
this repo (owner-granted).
