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

## Posture

- **identity** - a *seat* is one authenticated actor; a door must not let one
  seat act as another. Local dev may run an open loopback posture; any
  non-loopback bind must require a token.
- **the gate** - a door may mark verbs that need human sign-off (spend, trade,
  destroy). A gated verb parks, never silently executes.
