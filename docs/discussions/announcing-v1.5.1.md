---
permalink: discussions/announcing-v1.5.1/
layout: default
title: Announcing gamestruct v1.5.1
description: gamestruct v1.5.1 - a patch on the embedded binding where three defects let a dead door answer ok true (SPEC N3, N27). The file IS the announcement.
version: 1.5.1
---

# gamestruct v1.5.1

gamestruct is one semantic tree for human and agent play: the same game, the same state, driven through one door by a human client or an agent. v1.5.1 is a patch on the 1.5.0 line. The door protocol is unchanged. Three defects in the embedded binding are fixed, and all three were the same class: a door that was dead, or that never ran the call, answered `ok: true`.

```bash
npm i -g gamestruct
```

## Why a patch, and not a "small cleanup"

The embedded binding crossed a language boundary, so it reads its answer off a side channel instead of a return value. That channel is stateful. It keeps the last publish until the next one overwrites it. Every defect below is a consequence of trusting that channel, or of trusting a snapshot that was never a state.

**The side channel is stateful (SPEC N27).** A host callback that dies without publishing - a throw, a collected `create_callback`, a capture that never rendered - leaves the PREVIOUS result sitting on the channel. A naive read hands it back as fresh. An agent calls `act('move')`, the host fails silently, and the facade returns the previous `observe` snapshot as `ok: true`. The agent believes the click landed when nothing ran.

`createFacade` now takes `opts.clear` and calls it **before** every invoke. It never compares values afterwards, and that is deliberate: two identical `observe` polls are legitimate, so "same as last time" cannot tell fresh from stale.

**`see()` was the one verb that skipped invalidation.** It is also the only primitive that may publish **asynchronously**, because a capture renders a frame. A dead capture therefore returned the previous image. Fixed.

**A refusal is not a state (SPEC N3).** `observe()` answers `{ ok: false, reason }` when the door is down - no driver, no tree, a dead hook. That snapshot has no fields at all. `matchesSnapshot` treated it as a state anyway, so the **empty predicate** `{}` matched it (the key loop never runs) and `wait_for` resolved `ok: true` at once while the surface was not even running. On the one verb an agent uses to WAIT, that is a false success.

`matchesSnapshot` now short-circuits on `!snap || snap.ok === false`. The `summary` sub-object is guarded the same way, so a field-less snapshot cannot throw.

## Tests

Four new regression tests in `tests/bridgeworks.test.mjs`. Each one was verified to **fail** with its guard removed, so none is vacuous. The suite is 90 + 31 pass, and `npm run check` is clean with conformance 10/10.

## What this means for a host

If you publish a side channel, publish a way to clear it and pass it as `opts.clear`. If you do not, the facade falls back to assigning `undefined`, which is still honest - it refuses rather than returning a stale value.

Nothing else in the contract moved. An HTTP or MCP door is unaffected. `wait_for` still polls `observe` and still times out honestly, and now a dead door times out instead of reporting success.
