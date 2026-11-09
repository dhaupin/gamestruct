---
permalink: what/
layout: default
title: What gamestruct is
description: One zero-dependency library, four primitives (plus the optional eyes), two lanes, one tree. What ships in the box, and the smallest surface a door and a client share.
nav_order: 9
---

# What gamestruct is

gamestruct is a zero-dependency ESM library. It defines one contract - four
primitives over one semantic tree (plus an optional fifth: the eyes) - and ships
reference renderings for both audiences plus two transport bindings.

## The four primitives

Every door exposes exactly these four operations. A client that uses only these
four can operate the surface.

| primitive | signature | meaning |
|-----------|-----------|---------|
| `observe` | `() -> Snapshot` | the surface's state for this seat |
| `act` | `(handle, verb?, value?) -> Result` | do one thing, by stable handle |
| `wait_for` | `(predicate, timeoutMs) -> Outcome` | resolve when a condition holds, or time out honestly |
| `events` | `(sinceFrame) -> { frame, events[] }` | what changed while you were not looking |

A surface that can render pixels MAY add a fifth, **optional** primitive:

| primitive | signature | meaning |
|-----------|-----------|---------|
| `see` | `(opts?) -> Capture` | a visual frame, for an agent's own vision |

`see` returns a small descriptor (`{ ok, path?, url?, mime?, bytes?, width?,
height? }`) - never the pixel bytes; the frame stays on the host. A surface
with no renderer refuses honestly and advertises no `see` tool. Register a
capture function with `bridge.onSee(fn)` to give a bridge eyes (SPEC N22-N24).

## The two lanes

Both lanes read the **same tree**. They are not two implementations of the same
feature; they are two renderings of one description.

- **human lane** (`profiles/human`) - `render`, `a11yDump`, `audit`. The
  assistive-technology view: roles, accessible names, focus order, live regions.
- **agent lane** (`profiles/agent`) - `toolCatalog`, `affordances`, `toolCall`.
  The machine view: one MCP-shaped tool per actionable node, each with an
  `inputSchema` so a client auto-wires.

## The bindings

A binding is **transport only**; it never invents state.

- **HTTP** (`bindings/http`) - `/observe`, `/act`, `/wait_for`, `/events`,
  `/see`, `/health`. Fail-closed token auth.
- **MCP** (`bindings/mcp`) - JSON-RPC 2.0: `initialize`, `tools/list`,
  `tools/call`, plus `observe`/`events`/`see` as direct methods.

## What ships in the box

| file | what it carries |
|------|-----------------|
| `lib/roles.mjs` | the ARIA-aligned role + action vocabulary |
| `lib/tree.mjs` | the semantic tree, stable handles, traversal, lookup |
| `lib/events.mjs` | the bounded event ring with an honest cursor |
| `lib/bridge.mjs` | the door: tree + ring + handlers, the four primitives + the eyes (`see`) |
| `lib/profiles/human.mjs` | the human lane (render, a11yDump, audit) |
| `lib/profiles/agent.mjs` | the agent lane (toolCatalog, affordances, toolCall) |
| `lib/bindings/http.mjs` | the HTTP door |
| `lib/bindings/mcp.mjs` | the MCP door |
| `lib/adapters/synmergia.mjs` | the reference WORLD adapter |
| `lib/adapters/vant.mjs` | the reference BRAIN adapter |
| `lib/adapters/webform.mjs` | the reference NON-GAME adapter (a plain form; the generality receipt) |
| `lib/adapters/dom.mjs` | the reference DOM adapter (a live element -> a tree; an accessible page is already a door) |
| `lib/hosts/tui.mjs` | the terminal host (the human lane with no pointer) |
| `bin/gamestruct.mjs` | the CLI: `check`, `doctor`, and `tui` |

## The smallest surface

A door and a client share exactly one vocabulary: the handle. Everything else is
a rendering.

```js
import { Bridge, ROLES, human, agent } from 'gamestruct'

const bridge = new Bridge({ name: 'pause menu' })
bridge.tree.add(null, { id: 'ui:start', role: ROLES.BUTTON, name: 'Start game' })
bridge.on('ui:start', { activate: () => startGame() })
```

That is the whole product: the rest is the two lanes reading it.

<div class="crosslinks">
<p><strong>More in these docs:</strong>
<a href="{{ '/start/' | relative_url }}">start here</a> ·
<a href="{{ '/contract/' | relative_url }}">the contract</a> ·
<a href="{{ '/bindings/' | relative_url }}">bindings</a> ·
<a href="{{ '/adapters/' | relative_url }}">adapters</a> ·
<a href="{{ '/cli/' | relative_url }}">the CLI</a></p>
</div>
