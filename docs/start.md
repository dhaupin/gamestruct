---
permalink: start/
layout: default
title: Start here
description: New to gamestruct? Build one semantic tree, wire a handler, and read it through both lanes - the beginner on-ramp, no prior knowledge assumed.
nav_order: 2
---

# Start here

This page assumes you have never heard of gamestruct. It takes about five
minutes and ends with a surface that both a screen reader and an agent can
operate.

## The idea in one sentence

Describe your UI **once** as a tree of named, role-tagged nodes, and you get two
things for free: a screen-reader experience and an agent tool catalog - because
they read the same description.

## 1. Describe

A node carries a **handle** (a stable id), a **role** (what it is), an
accessible **name** (what a screen reader says), and, if it is interactive, the
**actions** it accepts.

```js
import { Bridge, ROLES } from 'gamestruct'

const bridge = new Bridge({ name: 'pause menu' })
bridge.tree.add(null, { id: 'ui:start',  role: ROLES.BUTTON, name: 'Start game' })
bridge.tree.add(null, { id: 'ui:volume', role: ROLES.SLIDER, name: 'Volume', value: 50, min: 0, max: 100 })
```

The handle is the whole contract. Use a stable one (`ui:start`, not "button
number 1"); it is the same handle the human lane walks and the agent lane
drives.

## 2. Wire

Register one handler per actionable handle. The verb is the action the node
declares - `activate` for a button, `set_value` for a slider.

```js
bridge.on('ui:start',  { activate: () => startGame() })
bridge.on('ui:volume', { set_value: (v) => setVolume(v) })
```

## 3. Read both lanes

The same bridge now renders to a screen reader and to an MCP client:

```js
import { human, agent } from 'gamestruct'

human.a11yDump(bridge)      // the screen-reader text
agent.toolCatalog(bridge)   // the MCP tool list
```

```text
[*] region "pause menu"
[ ]   button "Start game" {activate}
[ ]   slider "Volume" =50 {set_value}
```

## 4. Act

Either lane drives the same code path. There is no agent rail and no second
protocol - one `act()`.

```js
await bridge.act('ui:start')            // the button
await bridge.act('ui:volume', 'set_value', 75)
```

## 5. Gate it

Run the a11y audit in CI. It flags the failures that actually break a screen
reader: an interactive node with no name, one that declares no action, an image
with no alt text.

```js
const { ok, problems } = human.audit(bridge)
```

Or run the CLI on a demo surface to see both lanes and the audit at once:

```bash
npx gamestruct doctor
```

You now serve assistive technology and agents from one description. That is the
whole on-ramp. Next: [the contract](/contract/) for the normative rules, or
[the adapters](/adapters/) to see how a real game and a real brain connect.

<div class="crosslinks">
<p><strong>More in these docs:</strong>
<a href="{{ '/contract/' | relative_url }}">the contract</a> ·
<a href="{{ '/human-lane/' | relative_url }}">the human lane</a> ·
<a href="{{ '/agent-lane/' | relative_url }}">the agent lane</a> ·
<a href="{{ '/cli/' | relative_url }}">the CLI</a> ·
<a href="{{ '/adapters/' | relative_url }}">adapters</a></p>
</div>
