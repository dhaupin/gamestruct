---
permalink: agent-lane/
layout: default
title: The agent lane
description: The MCP tool catalog, affordances, and dispatch - the machine rendering of the same gamestruct tree.
nav_order: 4
---

# The agent lane

The agent lane renders the **same tree** for a machine: an agent brain, an MCP
client, or a scripted test. It answers the two questions an agent always asks -
"what can I do here?" and "how do I do it?" - from the one description.

## toolCatalog(bridge)

One MCP-shaped tool per actionable node, each with an `inputSchema`. An MCP
client reads this list and auto-wires the surface with no bespoke code.

```js
import { agent } from 'gamestruct'

agent.toolCatalog(bridge)
// [
//   { name: 'act__ui__start',
//     description: 'Perform "activate" on button "Start game"',
//     inputSchema: { properties: { verb: { enum: ['activate'], default: 'activate' } } },
//     _handle: 'ui:start' },
//   ...
// ]
```

The `_handle` field is the stable handle the tool drives - the *same* handle
the human lane walks. That identity is the whole point.

## the see tool (the eyes)

When the surface can render pixels, the catalog also carries one synthetic tool
that is not tied to a node - `see`. It captures a frame and returns a small
descriptor (`{ ok, path, url, bytes, width, height }`); the brain reads the file
with its own vision. A blind surface lists no `see` tool at all, so a brain
never reaches for an eye that is not there.

```js
agent.toolCatalog(bridge).find((t) => t.name === 'see')
// { name: 'see', description: 'Capture a visual frame of the surface (the eyes)...',
//   inputSchema: { properties: { label: {type:'string'}, full: {type:'boolean'} } },
//   _handle: 'surface:eyes', _role: 'image', _actions: ['see'] }

await agent.toolCall(bridge, 'see', { label: 'boot' })
// { ok: true, path: '/captures/frame.png', width: 1280, height: 720 }
```

The loop it closes: `observe -> act -> see -> read -> act -> re-see`.

## affordances(bridge)

The flat "you can X, Y, Z" list a brain reads before choosing an act.

```js
agent.affordances(bridge)
// [{ handle: 'ui:start', role: 'button', name: 'Start game', actions: ['activate'] }, ...]
```

## toolCall(bridge, name, args)

Dispatch an MCP `tools/call` onto the bridge. Accepts either the tool name
(`act__ui__start`) or the raw handle (`ui:start`).

```js
agent.toolCall(bridge, 'act__ui__start', { verb: 'activate' })
// { ok: true, id: 'ui:start', verb: 'activate' }
```

There is no second code path. The tool call lands on the same `act()` the human
lane uses - which is exactly why the two lanes cannot diverge.
