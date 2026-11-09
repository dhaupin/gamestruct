---
permalink: contract/
layout: default
title: The contract
description: The four primitives (observe, act, wait_for, events), the optional fifth (see, the eyes), and the node shape every gamestruct door exposes.
nav_order: 2
---

# The contract

A door exposes exactly four primitives. A client that uses only these four can
operate the surface.

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
height? }`) - never the pixel bytes; the frame stays on the host and the agent
reads the file itself. A surface with no renderer refuses `see` honestly
(`{ ok: false, reason: 'this surface has no eyes' }`) and advertises no `see`
tool. Register a capture function to give a bridge eyes:

```js
bridge.onSee(async () => ({ path: '/captures/frame.png', width: 1280, height: 720 }))
bridge.canSee            // true
await bridge.see()       // { ok: true, path: '/captures/frame.png', ... }
```

That is SPEC rules N22-N24 (the eyes, v1.1).

## Stable handles

An `act` names a **handle** - a stable id like `ui:start` or
`world:target:wolf_1`. Never a pixel, a rect, or a positional index. The whole
point is that the same handle works before and after a re-render, for the human
lane and the agent lane alike.

```js
import { mintHandle } from 'gamestruct'
mintHandle('ui', 'start')   // 'ui:start'
```

## The node shape

```json
{
  id:          'ui:volume',     // stable handle, unique in the tree
  role:        'slider',        // ARIA-aligned role
  name:        'Volume',        // the accessible name
  value:       50,              // current value
  actions:     ['set_value'],   // the verbs this node accepts
  min:         0,
  max:         100,
  parent:      'root',
  children:    [],
}
```

Interactive roles (`button link textbox checkbox radio slider switch combobox
menuitem tab listitem`) must carry a non-empty `name` and at least one action.
Live roles (`status log alert`) announce on change.

## Honesty

Every refusal is a value, never a thrown exception and never a silent no-op:

```js
bridge.act('ui:nope')
// { ok: false, reason: 'no such handle: ui:nope' }
```

That is SPEC rule N21. A door that fails quietly is worse than one that fails
loudly - an agent cannot recover from silence.
