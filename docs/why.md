---
permalink: why/
layout: default
title: Why gamestruct
description: A screen reader and a machine agent fail on the same UI. Why one semantic tree serves both lanes - accessibility and an agent surface are one absence.
nav_order: 8
---

# Why gamestruct

A screen reader, a switch, voice control, and a machine agent all fail on the
**same** UI: buttons with no accessible name, state with no text, controls with
no stable handle. That is not four problems. It is one missing description.

## The problem: the surface is invisible twice

Most games ship with no accessibility layer and no agent surface. Those look
like two gaps, but they are the same gap seen from two sides:

- a person using a screen reader hears "button" with no name, and cannot act;
- an agent brain sees pixels with no handle, and cannot act either.

Both need the same four things: a **semantic tree** of nodes that carry a role,
an accessible name, a value/state, and the actions they accept; **stable
handles** that survive a re-render; a **linear traversal**; and an **event
stream** of what changed while nobody was looking.

## The thesis: build the description once, render it twice

The whole idea fits in one sentence: describe the surface **once** as a semantic
tree, and the two lanes are two renderings of that one description. The human
lane hands the tree to the platform accessibility API (ARIA, AccessKit,
`NSAccessibility`). The agent lane hands the same tree to an MCP client. Same
nodes, same handles, same `act()`.

```js
const bridge = new Bridge({ name: 'pause menu' })
bridge.tree.add(null, { id: 'ui:start', role: ROLES.BUTTON, name: 'Start game' })
bridge.on('ui:start', { activate: () => startGame() })

human.a11yDump(bridge)       // what a screen reader reads
agent.toolCatalog(bridge)    // what an MCP client auto-wires
await bridge.act('ui:start') // either lane can drive it - one code path
```

## Why it is small on purpose

An accessibility layer that is a separate feature rots: it drifts from the real
UI the day someone forgets to update both. gamestruct is one tree, so there is
nothing to drift from. A game does not adopt gamestruct by rewriting itself; it
writes **one function** that maps its own state to a tree, and both lanes fall
out.

The accessibility win is real for people. The agent win is not a second product
bolted on top - it is the same work, read through a different lens.

<div class="crosslinks">
<p><strong>More in these docs:</strong>
<a href="{{ '/what/' | relative_url }}">what gamestruct is</a> ·
<a href="{{ '/start/' | relative_url }}">start here</a> ·
<a href="{{ '/human-lane/' | relative_url }}">the human lane</a> ·
<a href="{{ '/agent-lane/' | relative_url }}">the agent lane</a> ·
<a href="{{ '/contract/' | relative_url }}">the contract</a></p>
</div>
