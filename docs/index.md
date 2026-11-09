---
permalink: /
layout: default
title: gamestruct docs
description: The game-agent lane bridge - one semantic tree serves a human's assistive technology and a machine agent. Start here.
nav_order: 1
---

# gamestruct docs

**One semantic tree. Two lanes. Four primitives.** gamestruct is the shared
contract between a game world (a *door*) and an agent brain (a *client*) — built
so the **same** surface serves a person using a screen reader and a machine
agent.

The insight is simple and load-bearing: a UI that is accessible to a human with
assistive technology and a UI that is accessible to an agent need the *same*
four things — a semantic tree, stable handles, a linear traversal, and an event
stream. Build those once, and both audiences are served.

## Start here

| page | what it covers |
|------|----------------|
| [The contract](./contract/) | the four primitives and the node shape (SPEC sec 3-4) |
| [The human lane](./human-lane/) | roles, accessible names, focus order, the a11y audit |
| [The agent lane](./agent-lane/) | the MCP tool catalog, affordances, dispatch |
| [Bindings](./bindings/) | HTTP + MCP, fail-closed auth |
| [Adapters](./adapters/) | the synmergia (world) and vant (brain) reference adapters |
| [CLI](./cli/) | `gamestruct check` and `gamestruct doctor` |

The normative spec lives in [`SPEC.md`](https://github.com/dhaupin/gamestruct/blob/main/SPEC.md).

## The shape, in one block

```js
import { Bridge, ROLES, human, agent } from 'gamestruct'

const bridge = new Bridge({ name: 'pause menu' })
bridge.tree.add(null, { id: 'ui:start', role: ROLES.BUTTON, name: 'Start game' })
bridge.on('ui:start', { activate: () => startGame() })

human.a11yDump(bridge)       // what a screen reader reads
agent.toolCatalog(bridge)    // what an MCP client auto-wires
await bridge.act('ui:start')  // one code path for both
```

## Why it matters

Most games have no accessibility layer at all, and most have no agent surface
at all. Those are the same absence. gamestruct is a small, dependency-free
contract that closes both gaps at once — the accessibility win is real for
people, and the agent win falls out of the same work.
