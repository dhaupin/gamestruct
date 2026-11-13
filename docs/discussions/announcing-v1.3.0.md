---
permalink: discussions/announcing-v1.3.0
layout: default
title: Announcing gamestruct v1.3.0
description: gamestruct v1.3.0 - the DoorClient gains a principal for multi-agent doors, plus the family floor moves and the site-shell catch-up. The file IS the announcement.
version: 1.3.0
---

# gamestruct v1.3.0

gamestruct is one semantic tree for human and agent play: the same game, the same state, driven through one door by a human client or an agent. v1.3.0 is a minor on the 1.2.x line - the door protocol is unchanged; the reference client learns to name which body it drives. This post ships with the v1.3.0 tag: npm has the tarball by the time you read it.

```bash
npm i -g gamestruct
```

## What landed

**`DoorClient` carries a `principal` (multi-agent doors).** A world that seats more than one body behind one door - the agent-play lane where several agents share one door - needs to say WHICH body a primitive drives. `DoorClient` now takes a `principal`: `observe({ principal })` rides the door's own `?principal=` query, and `act(id, verb, value, { principal })` rides a top-level `principal` on the `/act` body. Top-level, not folded into `value`, because the door folds a dictionary `value` into its args - a principal folded into `value` would be swallowed whenever `value` is a scalar. It is remote-only: an in-process bridge has one seat, and every no-principal call keeps its byte-identical reference shape, so existing worlds do not move. Pin: `tests/bridgeworks.test.mjs`, "DoorClient carries a principal on the remote wire".

**The family floors move.** The `prestruct` declaration floor is `^1.3.0` (the SSRF-guard security round) - `scripts/check-prestruct-pins.cjs` refuses any declaration below it, and the guard's battery gains the inverse case (the old `^1.2.0` floor now fails). The family devDependency pins advance to the current cuts in the same pass.

**The site follows the family shell.** The `/status` family island now lists every other family member (it had drifted, missing `memstruct`), and the served CSP `connect-src` gains the member origins so the rows render instead of failing closed. The mobile nav fits the phone viewport (the header overflowed and the burger sat off-screen below 640px), and the thesis band's accent rule lands on the content grid at every width instead of hugging the viewport edge on mobile.

## Also in this round

The docs site gains the breadcrumb trail (`breadcrumb: true`). `.github/dependabot.yml` lands with the family flow, a `staging` fast-forward sync job keeps the integration branch a mirror of `main`, and the `.gitignore` docs block carries the in-tree Jekyll and pagefind products so a local build leaves no untracked noise.

## Links

- Repo and docs: https://github.com/dhaupin/gamestruct / https://docs.creadev.org/gamestruct
- Changelog: https://github.com/dhaupin/gamestruct/blob/main/CHANGELOG.md
- Issues: https://github.com/dhaupin/gamestruct/issues
