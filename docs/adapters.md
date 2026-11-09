---
permalink: adapters/
layout: default
title: Adapters
description: The synmergia (world), vant (brain), and webform reference adapters - how any surface exposes a door, and how a brain drives one.
nav_order: 6
---

# Adapters

An adapter connects a real system to the bridgeworks. Three reference adapters
ship with gamestruct: two sides of the game lane (a world, a brain), and one
that is not a game at all.

## synmergia - the world (a door)

[Synmergia](https://github.com/dhaupin/synmergia) is a Godot MMORPG. Its adapter
builds a gamestruct tree from a world snapshot and registers handlers that
forward to the game's own verbs. It is the reference **world** adapter: a game
does not adopt gamestruct by rewriting itself - it writes ONE function that maps
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

## vant - the brain (a client)

[Vant](https://github.com/dhaupin/vant) is an agent brain. Its adapter is the
**client** half: it drives any gamestruct door - an in-process `Bridge`, or a
remote HTTP/MCP endpoint - through the four primitives.

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
"leisure" move: pick an affordance and do it once - the lane used without a
goal, never a second protocol.

## webform - the surface that is not a game (the generality receipt)

gamestruct was born in games, but the contract is not a game contract: it is
the contract between ANY surface and both audiences. The `webform` adapter
proves it by taking the most ordinary surface there is - a plain HTML form -
and building the SAME tree the game adapter builds. No game loop, no player,
no HP: labeled fields, a submit, and a status region.

```js
import { buildBridge, readValues, validate } from 'gamestruct/adapters/webform'

const bridge = buildBridge({
  surface: 'contact',
  fields: [
    { id: 'name',  label: 'Your name', type: 'text',  required: true },
    { id: 'email', label: 'Email',     type: 'email', required: true },
    { id: 'plan',  label: 'Plan',      type: 'radio',  options: ['Free', 'Pro'] },
    { id: 'body',  label: 'Message',   type: 'textarea' },
  ],
  submit: { label: 'Send' },
}, { send: (verb, args) => fetch('/contact', { method: 'POST', body: JSON.stringify(args) }) })

// form:field:name   textbox "Your name" {set_value}
// form:field:plan   group "Plan"  ->  radio "Free" / radio "Pro"
// form:submit       button "Send"
```

An HTML `type` maps to a gamestruct role (`text`/`textarea` -> textbox,
`select` -> combobox, `radio` -> a group of radios, `range` -> slider). Field
edits are **local** - a change mutates the node and records a ring event both
lanes can read - and the door call fires **once, at submit**. Submit refuses an
invalid form by name (`required`, a malformed email) and announces the refusal
on the live region, so the human lane hears it and the agent lane reads it as
an event. Same four primitives, same two lanes, a surface that is not a game.
