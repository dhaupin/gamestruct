---
permalink: human-lane/
layout: default
title: The human lane
description: Roles, accessible names, focus order, and the a11y audit - the assistive-technology rendering of the gamestruct tree.
nav_order: 3
---

# The human lane

The human lane renders the semantic tree for **assistive technology**: a screen
reader, a switch, voice control, or a keyboard alone. It produces three things.

## render(bridge)

A platform-agnostic AT description of every node plus the linear focus order -
the walk a switch or keyboard user makes.

```js
import { human } from 'gamestruct'

const r = human.render(bridge)
r.focusOrder   // ['ui:start', 'ui:volume', 'ui:mute'] - the tab/switch walk
r.nodes        // [{ id, role, name, value?, focusable, actions, live?, ... }]
```

A host maps this record onto its own AT API: ARIA on the web, AccessKit in
Godot, `NSAccessibility` on macOS. The fields are the fields every platform
already understands.

## a11yDump(bridge)

A flat text dump - one line per node, in traversal order, with the focus
marked. This is the "is this surface describable at all" proof.

```text
[*] region "demo"
[ ]   button "Start game" {activate}
[ ]   slider "Volume" =50 {set_value}
[ ]   checkbox "Mute" [ ] {activate}
[ ]   status "Ready"
```

If a surface cannot produce this, it cannot produce a screen-reader
experience. It is the cheapest possible gate.

## audit(bridge)

A gate, not a grade. It flags the failures that actually break a screen reader:

- an interactive node with no accessible name;
- an interactive node that declares no action;
- an image with no alt text.

```js
const { ok, problems } = human.audit(bridge)
// problems: [{ id: 'ui:oops', problem: 'interactive node has no accessible name' }]
```

Run it in CI. A surface that passes `audit` is not merely "more accessible" -
it is *usable* by a person who cannot see it.
