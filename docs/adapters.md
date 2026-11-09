---
permalink: adapters/
layout: default
title: Adapters
description: The synmergia (world) and vant (brain) reference adapters - how a game exposes a door and how a brain drives one.
nav_order: 6
---

# Adapters

An adapter connects a real system to the bridgeworks. Two reference adapters
ship with gamestruct, one per side of the lane.

## synmergia — the world (a door)

[Synmergia](https://github.com/dhaupin/synmergia) is a Godot MMORPG. Its adapter
builds a gamestruct tree from a world snapshot and registers handlers that
forward to the game's own verbs. It is the reference **world** adapter: a game
does not adopt gamestruct by rewriting itself — it writes ONE function that maps
its own state to a tree, and both lanes fall out.

```js
import { buildBridge } from 'gamestruct/adapters/synmergia'

const bridge = buildBridge(snapshot, {
  send: (verb, args) => door.call(verb, args),
})
// world:player:hp   progressbar "Health" =80
// world:target:wolf_1  listitem "Wolf"
// world:action:attack  button "Attack"
```

The snapshot is tolerant: a partial world still renders. Log lines feed the
event ring (`pushLog`), so the human lane's live region and the agent lane's
`events` cursor read the same stream.

## vant — the brain (a client)

[Vant](https://github.com/dhaupin/vant) is an agent brain. Its adapter is the
**client** half: it drives any gamestruct door — an in-process `Bridge`, or a
remote HTTP/MCP endpoint — through the four primitives.

```js
import { DoorClient, pursueOne } from 'gamestruct/adapters/vant'

const client = new DoorClient({ url: 'https://door.example', token: '...' })
await client.observe()
await client.find({ role: 'button', name: 'start' })   // locate a handle
await client.act('ui:start')

// play with no objective: ONE want, ONE act, the SAME lane
await pursueOne(client)
```

A brain never learns whether the world is local or remote. `pursueOne` is the
"leisure" move: pick an affordance and do it once — the lane used without a
goal, never a second protocol.
