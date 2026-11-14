---
permalink: discussions/announcing-v1.2.1/
layout: default
title: Announcing gamestruct v1.2.1
description: The gamestruct v1.2.1 release post - the file IS the announcement; copy the raw markdown from GitHub into Discussions. The marketing lander + npm in the menus.
version: 1.2.1
---

# gamestruct v1.2.1

gamestruct is the lane bridge: one semantic tree that serves both a human's assistive technology and a machine agent. v1.2.1 is the front-door release - the library is unchanged, but the landing finally sells the idea. It is on npm:

```bash
npm i gamestruct@1.2.1
```

This post covers the new lander, the npm links in the menus, and what it means for adopters.

## The landing is a real lander now

The homepage used to be a hero and a promise. It is now the full pitch, written for four readers at once:

- **Players who use assistive tech** - every control gets a role, an accessible name, and a stable handle.
- **Agents and AI players** - one MCP tool per actionable node, auto-wired from an inputSchema.
- **Game developers** - write one function that maps your state to a tree; both lanes fall out.
- **Studios and live-ops** - one contract across every surface, proven by the committed battery.

The page walks the whole story: the thesis ("one missing description"), a failure table for the human lane, the agent lane, and both, the four primitives plus the eyes, a four-step adoption path, an auto-a11y section, six reasons devs adopt it, and the ecosystem proof (synmergia the world, vant the brain, webform + dom the generality receipt). It closes on a call to action.

It is the same token system as before - light and dark, all three paint schemes - so nothing about the library changed to carry it.

## npm in both menus

The install surface was buried. Now:

- The landing nav (header, sidebar, and footer, all from one vocabulary) carries **Docs** and **npm**.
- The docs rig carries an npm row in its Surfaces group and an npm icon in the header beside GitHub.

## What this means for an adopter

Nothing to migrate. `1.2.1` is `1.2.0` with a better front door and two more links. A door, a client, and the SPEC are untouched.

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

The contract is unchanged: v1.2.1 is docs and site only.
