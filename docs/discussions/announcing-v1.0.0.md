---
permalink: discussions/announcing-v1.0.0/
layout: default
title: Announcing gamestruct v1.0.0
description: The gamestruct v1.0.0 release post - the file IS the announcement; copy the raw markdown from GitHub into Discussions. Technical, changelog-style.
version: 1.0.0
---

# gamestruct v1.0.0

gamestruct is the lane bridge: one semantic tree that serves both a human's assistive technology and a machine agent. v1.0.0 is the first stable release. It is on npm now:

```bash
npm i gamestruct
# or run the CLI without installing:
npx gamestruct doctor
```

This post covers what the library actually does, the two lanes and the four primitives, and the adapters that prove it is not a game contract. Repo links at the end.

## Why it exists

A UI a person can drive with a screen reader and a UI a machine agent can drive need the same four things: named, role-tagged nodes, stable handles, a linear traversal, and an event stream. Teams usually build those twice - accessibility as an audit checkbox, an agent surface as a separate automation layer - and the two drift apart. gamestruct builds them once, over one tree, and serves both lanes from the same contract. The accessibility win is real for people; the agent win falls out of the same work.

## One tree, two lanes, four primitives

A **door** is any surface that builds a tree and wires handlers. A **client** drives it. Both go through the same four primitives:

1. **`observe()`** - a snapshot of the tree: nodes with a role, a name, a stable handle, and affordances.
2. **`act(handle, verb, value)`** - do the thing, by stable handle, never by pixel.
3. **`wait_for(predicate, timeoutMs)`** - block until a predicate holds, or time out honestly.
4. **`events(sinceFrame)`** - the bounded event ring (announce / change / focus) since a cursor.

The **human lane** (`gamestruct/human`) renders the tree, dumps it in an assistive-technology shape (`a11yDump`), and audits it. The **agent lane** (`gamestruct/agent`) turns the same tree into an MCP tool catalog, so an MCP client auto-wires it. The property the whole product rests on: if a handle is actionable in one lane it is actionable in the other.

## Not a game contract

gamestruct was born in games - the first consumer is the Synmergia MMO - but it is not one. v1.0.0 ships reference adapters for a **world** (`gamestruct/adapters/synmergia`), a **brain** (`gamestruct/adapters/vant`), a plain HTML form (`gamestruct/adapters/webform`), and a live DOM subtree (`gamestruct/adapters/dom`). The DOM adapter is the sharpest receipt: a page that is already accessible to a screen reader is, with no extra markup, already a door an agent can drive.

The human lane is not tied to a screen, either. The **TUI host** (`gamestruct/hosts/tui`) draws the tree as a text frame and drives it with `tab` and `enter` - the same handles the agent lane uses - so the human lane works over SSH with no pointer at all. `gamestruct tui` runs it; on a pipe it prints one frame and exits, so CI can read it.

## Zero dependencies, by design

Zero runtime dependencies. Plain Node ESM, `fetch` as the only global, Node >= 18. No build step to run, test, or publish. The suite is the wall: 64 bridgeworks assertions plus the self-check battery and the offline release ladder.

## Two protocol bindings

The same bridge projects onto HTTP (`gamestruct/http`: `GET /observe`, `POST /act`, `POST /wait_for`, `GET /events`, fail-closed token auth) and MCP (`gamestruct/mcp`: JSON-RPC 2.0 with `initialize`, `tools/list` carrying `inputSchema`, and `tools/call`). A remote agent enters from its own process; the door's posture is fail-closed.

## Provenance

Releases publish from GitHub Actions via npm Trusted Publishing (OIDC) - no publish tokens anywhere. Provenance attestations are signed automatically. The GH release attaches the exact tarball the registry serves, and the post-publish verify job asserts the registry version, the tarball integrity, and the release asset all agree. Verify an install:

```bash
npm audit signatures
```

## What v1 does not do

- No rendering of its own: gamestruct is the tree and the transport, never the pixels. A surface that can render registers a capture function for the optional eyes (v1.1); without one it refuses honestly.
- No game logic, no world state: a door owns its world; gamestruct owns the lane.

## Links

- npm: <https://www.npmjs.com/package/gamestruct>
- Docs: <https://docs.creadev.org/gamestruct>
- Site: <https://gamestruct.creadev.org>
- GitHub: <https://github.com/dhaupin/gamestruct>
- Issues: <https://github.com/dhaupin/gamestruct/issues>
- Full changelog: <https://github.com/dhaupin/gamestruct/blob/main/CHANGELOG.md>

The contract is stable from here: `SPEC.md` freezes the four primitives and the node shape, breaking changes get a major bump, and a spec revision is its own axis. If you build a door - a game, a form, a kiosk, a checkout - tell us what it taught you.
