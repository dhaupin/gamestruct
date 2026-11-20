---
permalink: discussions/announcing-v1.5.0/
layout: default
title: Announcing gamestruct v1.5.0
description: gamestruct v1.5.0 - the third binding lands, for a door in the same page as its client behind a language boundary (SPEC v1.3, N27). The file IS the announcement.
version: 1.5.0
---

# gamestruct v1.5.0

gamestruct is one semantic tree for human and agent play: the same game, the same state, driven through one door by a human client or an agent. v1.5.0 is a minor on the 1.4.x line - the door protocol is unchanged; the bridgeworks gains the binding for the one place a door and its client share a page but not a heap. This post ships with the v1.5.0 tag: npm has the tarball by the time you read it.

```bash
npm i -g gamestruct
```

## What landed

**The third binding: EMBEDDED (SPEC v1.3, rule N27).** The contract had two bindings, both wire-based: HTTP and MCP. Both assume a serializer at each end. Neither covers a door in the SAME page or process as its client but separated by a **language boundary** - Godot's `JavaScriptBridge`, Emscripten, a native addon, a Python C-extension. A boundary crossing has no serializer, and it fails silently.

This was not a thought experiment. A wasm game could not expose its agent surface at all: the hooks installed, and every call came back empty. Three laws held at once, each verified live by isolating a retained callback:

- a host callback **runs**, but its **return value does not cross back** - every type (int, String, Dictionary) arrived as `null`;
- a structured **argument** arrives as an **opaque foreign handle** - a JS object reached GDScript as a `JavaScriptObject`, never a `Dictionary`;
- an object literal **containing** host callbacks does not survive the outbound marshal - it landed as `undefined`.

So the binding's shape is not a preference, it is what the boundary allows: JSON **text** in, JSON **published** out, and the client facade **built on the client side**. A callback runs synchronously, so the facade reads the side channel back in the SAME turn - no await, no race.

**`lib/bindings/embedded.mjs`** (exported as `gamestruct/embedded`) ships two halves, mirroring `http.createHandler`. `createDoor(bridge)` is the HOST side: the three primitives returning JSON **strings**, plus `see` when the surface has eyes, ready to be published on a side channel. `createFacade({ callbacks, read })` is the CLIENT side: raw host callbacks plus an injected reader, returning parsed objects, with `wait_for` implemented by polling `observe` (a boundary callback cannot park a host thread) and an honest blind `see`. Every failure - a missing callback, a throwing callback, an empty publish, malformed JSON, no side channel - is an honest `{ ok:false, reason }` refusal, never a throw into the client's loop. The side channel is **injected, never assumed**: naming a host's global in the contract would bake one implementation into it.

**`DoorClient` gains an `embedded` target.** `new DoorClient({ embedded: facade })` drives an embedded door with the SAME code that drives a `bridge` or a `url`. A brain never learns which transport it is on - the promise N25 makes for remote, now held for embedded. Pin: `tests/bridgeworks.test.mjs`, "DoorClient drives an embedded facade like any other door".

**The tests prove the law, not just the code.** The suite carries a boundary SIMULATOR that enforces all three N27 laws, so a binding cannot pass by working in pure JavaScript. Revert-checked: making the facade trust the callback's return value - the naive implementation, the one that works everywhere except across a real boundary - fails the suite.

## Also in this round

SPEC.md gains **v1.3** and rule **N27** (section 7.3), additive and OPTIONAL: an HTTP or MCP door is conformant without it. `docs/bindings.md` carries the three laws and the two-half example, `docs/adapters.md` documents the third client target, and `gamestruct check` gains two self-checks (the battery contract in `labs/battery.json` moves to 22). The embedded binding ships in the tarball under `lib/`, and `packs/public/bridge-shapes` is unchanged and still armed on clean + broken + absent.

## Links

- Repo and docs: https://github.com/dhaupin/gamestruct / https://docs.creadev.org/gamestruct
- Changelog: https://github.com/dhaupin/gamestruct/blob/main/CHANGELOG.md
- Issues: https://github.com/dhaupin/gamestruct/issues
