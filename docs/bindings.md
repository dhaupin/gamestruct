---
permalink: bindings/
layout: default
title: Bindings
description: The HTTP and MCP transport bindings - how the primitives (and the optional eyes) reach a runtime, and how auth fails closed.
nav_order: 5
---

# Bindings

A binding is **transport only**. It maps the primitives onto a wire and never
invents state.

## HTTP

| route | method | maps to |
|-------|--------|---------|
| `/observe` | GET | `observe()` |
| `/act` | POST `{id,verb?,value?}` | `act(...)` |
| `/wait_for` | POST `{predicate,timeoutMs}` | `waitFor(...)` |
| `/events?since=N` | GET | `events(N)` |
| `/see?label=&full=` | GET or POST | `see(...)` (404 when the surface is blind) |
| `/health` | GET | liveness |

```js
import { bindings } from 'gamestruct'

const handle = bindings.http.createHandler(bridge, { token: process.env.DOOR_TOKEN })
// handle({ method, url, headers, body }) -> { status, headers, body }
```

The handler is runtime-agnostic: wire it to `node:http`, a Worker, or a test
harness. When a token is set, every route except `/health` fails closed with
`401` unless the request carries `Authorization: Bearer <token>`.

## MCP (JSON-RPC 2.0)

`initialize`, `tools/list`, `tools/call`, plus `observe`, `events`, and `see` as
direct methods. Protocol version `2024-11-05`.

```js
const mcp = bindings.mcp.createHandler(bridge)
await mcp({ id: 1, method: 'initialize' })
await mcp({ id: 2, method: 'tools/list' })     // carries each tool's inputSchema
await mcp({ id: 3, method: 'tools/call', params: { name: 'act__ui__start', arguments: { verb: 'activate' } } })
await mcp({ id: 4, method: 'tools/call', params: { name: 'see', arguments: { label: 'boot' } } })
```

`tools/list` carries the full `inputSchema` so an MCP client auto-wires. A
surface with eyes lists a `see` tool; a blind surface does not. An unknown
method returns JSON-RPC error `-32601`. The handler is async (the eyes are).

## Embedded (the third binding)

A door in the SAME page or process as its client, behind a **language
boundary** that cannot marshal structured values: Godot's `JavaScriptBridge`,
Emscripten, a native addon, a Python C-extension. HTTP and MCP assume a
serializer at both ends; a boundary crossing has none, and it fails SILENTLY.

Three laws, live-verified on a wasm host at once:

1. a host callback **runs**, but its **return value never crosses back** (every
   type arrived as `null`);
2. a structured **argument** arrives as an **opaque foreign handle**, not a
   dictionary;
3. an object literal **containing** host callbacks does not survive the
   outbound marshal (it lands as `undefined`).

So the payload crosses as JSON **text**, the host **publishes** its JSON on a
side channel, and the facade is **built on the client side**. A callback runs
synchronously, so the facade reads the side channel back in the same turn.

```js
import { createDoor, createFacade } from 'gamestruct/embedded'

// HOST side (Godot, wasm, FFI): three primitives returning JSON strings.
const door = createDoor(bridge)
// publish door.observe() / door.act(json) / door.events(json) on your side
// channel from your host callbacks -- never return them.

// CLIENT side (the page, the brain): wrap the raw callbacks + a reader.
const facade = createFacade({
  callbacks: { observe, act, events },   // each (jsonString) => void
  read: () => window.__synAgentResult,   // YOUR side channel, injected
})
const snap = facade.observe()            // a parsed object
await facade.act('ui:start')             // JSON in, JSON published out
```

The side channel is **injected, never assumed** - naming a host's global in
the contract would bake one implementation into it. The reference client
accepts the facade directly, so a brain never learns which transport it is on:

```js
const client = new DoorClient({ embedded: facade })
await client.observe()      // identical code to a bridge or a remote url
```

A missing callback, a throwing callback, an empty publish, or unparseable text
is an honest `{ ok:false, reason }` refusal (N2/N21), never a throw into the
client's loop.

## Posture

- **identity** - a *seat* is one authenticated actor; a door must not let one
  seat act as another. Local dev may run an open loopback posture; any
  non-loopback bind must require a token.
- **the gate** - a door may mark verbs that need human sign-off (spend, trade,
  destroy). A gated verb parks, never silently executes.
