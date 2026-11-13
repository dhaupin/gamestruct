# gamestruct 1.3.0

**One semantic tree. Two lanes. Four primitives — plus the eyes.** The same
surface serves a human who uses a screen reader and a machine agent — because
they need the same thing: named, role-tagged nodes with stable handles, a
linear traversal, and an event stream.

Born in games (the first consumer is the Synmergia MMO), but not a game
contract: the reference adapters build the same tree from a plain HTML form
([`webform`](./lib/adapters/webform.mjs)) and from a live DOM subtree
([`dom`](./lib/adapters/dom.mjs)). Any surface with a door qualifies — and so
does any host: the [`tui`](./lib/hosts/tui.mjs) host renders the tree to a
terminal, so the human lane works over SSH with no pointer at all.

Read the contract: [`SPEC.md`](./SPEC.md). Site: <https://gamestruct.creadev.org>.
Docs: <https://docs.creadev.org/gamestruct>. Install: `npm install gamestruct`.
Releasing: [`DEPLOY.md`](./DEPLOY.md).

```js
import { Bridge, ROLES, human, agent } from 'gamestruct'

const bridge = new Bridge({ name: 'pause menu' })
bridge.tree.add(null, { id: 'ui:start', role: ROLES.BUTTON, name: 'Start game' })
bridge.tree.add(null, { id: 'ui:volume', role: ROLES.SLIDER, name: 'Volume', value: 50 })
bridge.on('ui:start', { activate: () => startGame() })
bridge.on('ui:volume', { set_value: (v) => setVolume(v) })

human.a11yDump(bridge)      // what a screen reader reads
agent.toolCatalog(bridge)   // what an MCP client auto-wires
await bridge.act('ui:start') // either lane can drive it — one code path
```

## Why one bridge

A screen reader, a switch, voice control, and an agent all fail on the same
UI: buttons with no accessible name, state with no text, controls with no
stable handle. gamestruct asks you to describe the surface **once** as a
semantic tree; the two lanes are two renderings of that one description.

| lane | who reads it | what it needs |
|------|--------------|---------------|
| **human** | screen readers, switch/voice control, keyboard | roles, accessible names, state, focus order, live regions |
| **agent** | MCP clients, brains, scripted tests | handles, verbs, an inputSchema, an event cursor |

Same nodes. Same handles. Same `act()`.

## Install

```bash
npm install gamestruct
```

Zero runtime dependencies. Node >= 18 (uses global `fetch` for the remote
client). The library is ESM and has no build step.

## The four primitives

| verb | meaning |
|------|---------|
| `observe()` | the surface's state for this seat |
| `act(handle, verb?, value?)` | do one thing, by stable handle |
| `waitFor(predicate, timeoutMs)` | resolve when a condition holds, or time out honestly |
| `events(sinceFrame)` | what changed while you were not looking |

## The eyes (the optional fifth primitive)

A surface that can render pixels can also be **seen**. Register a capture
function and the bridge gains eyes: `see()` returns a small descriptor — a
`path`/`url` to a PNG the agent reads with its OWN vision — never the pixel
bytes. A surface with no renderer refuses honestly and advertises no `see`
tool, so a brain never reaches for an eye that is not there.

```js
bridge.onSee(async () => ({ path: '/captures/frame.png', width: 1280, height: 720 }))
bridge.canSee                        // true
await bridge.see()                   // { ok: true, path: '/captures/frame.png', ... }
agent.toolCatalog(bridge)            // now includes the `see` tool
// HTTP: GET /see   MCP: { method: 'see' } or tools/call { name: 'see' }
```

This is the loop a game agent needs: `observe -> act -> see -> read -> act ->
re-see`. The frame stays on the host; the wire stays small.

## The pieces

| path | what it carries |
|------|-----------------|
| `lib/roles.mjs` | the role + action vocabulary (ARIA-aligned) |
| `lib/tree.mjs` | the semantic tree + stable handles |
| `lib/events.mjs` | the bounded event ring (announce / change / focus) |
| `lib/bridge.mjs` | the door: tree + ring + handlers, the four primitives + the eyes (`see`) |
| `lib/profiles/human.mjs` | the human lane: render, focus order, a11y dump, audit |
| `lib/profiles/agent.mjs` | the agent lane: MCP tool catalog, affordances, dispatch (+ the `see` tool) |
| `lib/bindings/http.mjs` | the HTTP door (observe/act/wait_for/events/see, fail-closed token) |
| `lib/bindings/mcp.mjs` | the MCP door (JSON-RPC 2.0: initialize/tools/list/tools/call/see) |
| `lib/adapters/synmergia.mjs` | reference WORLD adapter (a game state -> a tree) |
| `lib/adapters/vant.mjs` | reference BRAIN adapter (a client that drives any door) |
| `lib/adapters/webform.mjs` | reference NON-GAME adapter (a plain form -> a tree; the generality receipt) |
| `lib/adapters/dom.mjs` | reference DOM adapter (a live element -> a tree; an accessible page is already a door) |
| `lib/hosts/tui.mjs` | the terminal host (the human lane with no pointer: render, key-driven focus, `run()`) |
| `bin/gamestruct.mjs` | the CLI: `check`, `doctor`, and `tui` |

## CLI

```bash
npx gamestruct doctor   # build a demo surface, print BOTH lanes + the a11y audit
npx gamestruct check    # run the bridgeworks self-checks
npx gamestruct tui      # drive the demo surface from the terminal (no pointer)
```

`doctor` is the truth battery: it does not claim a surface is accessible — it
shows the a11y dump, the tool catalog, and the audit result. `tui` renders the
same tree as a text frame and drives it with keys (`tab`, `enter`); on a pipe
it prints one frame and exits, so CI can read it.

## Adopt it in an afternoon

1. **Describe** — build a tree from state you already have.
2. **Wire** — `bridge.on(handle, { verb: fn })` per actionable node.
3. **Mount** — `bindings.http.createHandler(bridge, { token })`.
4. **Gate** — run `human.audit(bridge)` in CI and fix what it flags.

You now serve assistive technology and agents from one description.

## The struct family

gamestruct sits beside [packstruct](https://github.com/dhaupin/packstruct)
(packaging) and [memstruct](https://github.com/dhaupin/memstruct) (memory).
First consumers: [synmergia](https://github.com/dhaupin/synmergia) (the world)
and [vant](https://github.com/dhaupin/vant) (the brain).

## The ecosystem, and what lives where

gamestruct owns the **generic** lane: the four primitives, the semantic tree,
the two profiles (human + agent), and the protocol projections — the HTTP
binding and the MCP binding (JSON-RPC 2.0: `initialize` / `tools/list` /
`tools/call`). A world implements the door; a brain implements the client.

That ownership is deliberate, and it is what lets a world stay small. When
Synmergia's agent door first shipped it hand-rolled the whole generic protocol
— MCP JSON-RPC, a tool catalog, a vant-shaped exec route — inside the game.
After the debloat the door serves only the four primitives plus its own
multi-agent extension (`/coord`); the protocol layer has ONE owner, and the
door is primitive-transport:

| owner | what it owns |
|-------|--------------|
| **gamestruct** | the primitives, the tree, the profiles, HTTP + MCP bindings, the adapters, the hosts, the eyes (`see`) |
| **synmergia** | the world: the door (`/observe` `/act` `/wait_for` `/events` `/see` `/coord`), the seats, the sign-off gate |
| **vant** | the brain: the roster, work items, delegation, leisure — driving the door as a gamestruct client |

A second world that speaks the four primitives works with a gamestruct client
and needs no protocol code of its own. That is the point of the split.

## Verify before shipping

```bash
npm test        # the bridgeworks suite (tree, lanes, bindings, adapters)
npm run check   # node --check every module + the self-checks
npm run doctor  # print both lanes for a demo surface
```

## License

MIT. Made by [Cairn @ Creadev.org](https://creadev.org).
