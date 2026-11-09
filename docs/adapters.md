---
permalink: adapters/
layout: default
title: Adapters
description: The synmergia (world), vant (brain), webform, and dom reference adapters - how any surface exposes a door, and how a brain drives one.
nav_order: 6
---

# Adapters

An adapter connects a real system to the bridgeworks. Reference adapters ship
for the two sides of the game lane (a world, a brain) and for two surfaces that
are not games at all (an HTML form, a live DOM subtree).

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
// world:player:hp            progressbar "Health" =80 (max 100)
// world:target               status "Target" =Wolf
// world:wolf_1               listitem "Attack Wolf"   (the door's own handle)
// ui:MainMenu/.../StartButton button "Start game"     (the door's own handle)
```

The snapshot is the door's REAL `observe()` shape (player / target / party /
actions / events); a partial world still renders. **The handle law:** the door's
`actions[].id` is already a stable handle (`ui:<path>` / `world:<id>`) the door
resolves itself, so the adapter reuses it UNCHANGED - `act(handle)` forwards the
exact string the door's `activate_by_id` matches. Events feed the ring
(`pushLog`), so the human lane's live region and the agent lane's `events`
cursor read the same stream.

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

## dom - the second non-game surface (an accessible page is already a door)

The sharpest generality receipt is the DOM itself. `fromElement(el)` walks a
live element subtree into the same tree, reading the attributes an accessible
page already carries - `role`, `aria-*`, `alt`, `title`, and a `label[for]`
that names its field - and falling back to the tag name and text when they are
absent. A page that is already accessible to a screen reader needs NO extra
markup to become a door an agent can drive: the two lanes are one tree read two
ways.

```js
import { fromElement } from 'gamestruct/adapters/dom'

const bridge = fromElement(document.querySelector('form#login'), {
  act: (handle, verb, value) => callDoor(handle, verb, value),
})
// dom:user  textbox "Username" {set_value}
// dom:go    button "Log in" {activate}
```

The walk duck-types the element interface (`tagName`, `children`,
`getAttribute`, `textContent`), so it runs against a real DOM in a browser and
against a plain fixture in Node - zero dependencies, no jsdom.
