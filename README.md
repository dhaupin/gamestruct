# gamestruct — the game-agent lane bridge

**One semantic tree. Two lanes. Four primitives.** The same surface serves a
human who uses a screen reader and a machine agent — because they need the
same thing: named, role-tagged nodes with stable handles, a linear traversal,
and an event stream.

Read the contract: [`SPEC.md`](./SPEC.md). Docs: <https://docs.creadev.org/gamestruct>.

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

## The pieces

| path | what it carries |
|------|-----------------|
| `lib/roles.mjs` | the role + action vocabulary (ARIA-aligned) |
| `lib/tree.mjs` | the semantic tree + stable handles |
| `lib/events.mjs` | the bounded event ring (announce / change / focus) |
| `lib/bridge.mjs` | the door: tree + ring + handlers, the four primitives |
| `lib/profiles/human.mjs` | the human lane: render, focus order, a11y dump, audit |
| `lib/profiles/agent.mjs` | the agent lane: MCP tool catalog, affordances, dispatch |
| `lib/bindings/http.mjs` | the HTTP door (observe/act/wait_for/events, fail-closed token) |
| `lib/bindings/mcp.mjs` | the MCP door (JSON-RPC 2.0: initialize/tools/list/tools/call) |
| `lib/adapters/synmergia.mjs` | reference WORLD adapter (a game state -> a tree) |
| `lib/adapters/vant.mjs` | reference BRAIN adapter (a client that drives any door) |
| `bin/gamestruct.mjs` | the CLI: `check` (self-checks) and `doctor` (both lanes) |

## CLI

```bash
npx gamestruct doctor   # build a demo surface, print BOTH lanes + the a11y audit
npx gamestruct check    # run the bridgeworks self-checks
```

`doctor` is the truth battery: it does not claim a surface is accessible — it
shows the a11y dump, the tool catalog, and the audit result.

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

## Verify before shipping

```bash
npm test        # the bridgeworks suite (tree, lanes, bindings, adapters)
npm run check   # node --check every module + the self-checks
npm run doctor  # print both lanes for a demo surface
```

## License

MIT. Made by [Rook @ Creadev.org](https://creadev.org).
