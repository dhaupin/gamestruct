# gamestruct - session log

Operational history. Stable conventions live in `AGENTS.md`; the normative
contract lives in `SPEC.md`.

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

Verified live against the running Synmergia door: the remote catalog reads the
door's own handles (`ui:Login/.../UsernameField` with `set_value`,
`ui:.../LoginButton`, ...) and advertises the `see` tool.

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
