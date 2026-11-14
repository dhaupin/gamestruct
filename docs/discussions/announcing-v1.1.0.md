---
permalink: discussions/announcing-v1.1.0/
layout: default
title: Announcing gamestruct v1.1.0
description: The gamestruct v1.1.0 release post - the file IS the announcement; copy the raw markdown from GitHub into Discussions. Technical, changelog-style.
version: 1.1.0
---

# gamestruct v1.1.0

gamestruct is the lane bridge: one semantic tree that serves both a human's assistive technology and a machine agent. v1.1.0 adds the optional eyes and closes the drift between the SPEC wire and the real door. It is on npm now:

```bash
npm i gamestruct@1.1.0
```

This post covers the optional fifth primitive, the two wire fixes that make a live game door drivable, and the play-test harness that proved them. Repo links at the end.

## The eyes: `see()`, the optional fifth primitive

Four primitives move a tree; none of them can tell you what the surface *looks like*. v1.1.0 adds an OPTIONAL fifth. Register a capture function on the bridge and it gains eyes:

```js
bridge.onSee(async ({ label, full }) => captureFrame(label, full))
```

`see()` then returns a small descriptor - `{ ok, path, url, mime, bytes, width, height }` - a path or URL to a frame the agent reads with its own vision. The pixel bytes never cross the wire, so the lane stays small. A surface with no renderer refuses honestly (`{ ok:false, reason:'this surface has no eyes' }`) and advertises no `see` tool; a sighted surface advertises exactly one, and records a ring event so both lanes observe the capture.

The eyes project through every surface: `bridge.onSee/canSee/see`, `GET|POST /see` on the HTTP binding (`404` when blind), the `see` tool in MCP `tools/list` plus a direct method and `tools/call`, and `DoorClient.see(opts)` on the brain side. SPEC v1.1 carries the three new rules (N22-N24).

## The remote catalog now reads a world door's own snapshot

`DoorClient.catalog()` over the wire read `observe().nodes`, but a game door serves its own flat snapshot - a live world of a player, actions, and events, never a serialized tree. Against the real Synmergia door the catalog failed. v1.1.0 fixes it with `doorNodes(snapshot)`, the one normalizer that folds the door's wire shape into the SPEC node shape, reusing the same role mapping and verb affordance the local bridge build uses so the two cannot drift. `DoorClient` takes it as an optional normalizer:

```js
const client = new DoorClient({ url, mapNodes: doorNodes })
```

Omit it and a door that serves no `nodes` refuses honestly, as before.

## A text field advertises `set_value`

A settable control (text box, slider, combo, checkbox, switch) now advertises `set_value`, and its handler forwards `{ id, verb: 'set_value', value }` to the door; everything else keeps advertising `activate`. Before this a text field advertised `ACTIVATE`, so an agent driving a login form could press buttons but had no way to type - a gap a live play-test caught.

## The play-test harness

`labs/playtest.mjs` is a reference brain that drives a running door through all five primitives. It reads the door's own handles live (never a hardcoded id), treats a refusal as a skipped step, and captures a frame at every step so a person can look at what the agent saw - this is where the eyes earn their keep. Run it with `npm run playtest` against a live door.

## Provenance

Releases publish from GitHub Actions via npm Trusted Publishing (OIDC) - no publish tokens anywhere. Provenance attestations are signed automatically. Verify an install:

```bash
npm audit signatures
```

## Links

- npm: <https://www.npmjs.com/package/gamestruct>
- Docs: <https://docs.creadev.org/gamestruct>
- Site: <https://gamestruct.creadev.org>
- GitHub: <https://github.com/dhaupin/gamestruct>
- Issues: <https://github.com/dhaupin/gamestruct/issues>
- Full changelog: <https://github.com/dhaupin/gamestruct/blob/main/CHANGELOG.md>

The contract is unchanged for a host that ignores the eyes: v1.1 is additive, and a surface with no renderer behaves exactly as it did in v1.0.
