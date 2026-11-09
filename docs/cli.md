---
permalink: cli/
layout: default
title: The CLI
description: gamestruct check and gamestruct doctor - the self-checks and the both-lanes demo.
nav_order: 7
---

# The CLI

gamestruct ships one command with two useful verbs.

## gamestruct doctor

Builds a demo surface, then prints **both lanes** for it and runs the a11y
audit. It is the truth battery: it never claims a surface is accessible - it
*shows* you the screen-reader text, the MCP tool catalog, and the audit result.

```bash
npx gamestruct doctor
```

```text
=== HUMAN LANE (what a screen reader reads) ===
[*] region "demo"
[ ]   button "Start game" {activate}
[ ]   slider "Volume" =50 {set_value}
[ ]   checkbox "Mute" [ ] {activate}
[ ]   status "Ready"

focus order: ui:start -> ui:volume -> ui:mute

=== AGENT LANE (what an MCP client auto-wires) ===
  act__ui__start  - Perform "activate" on button "Start game"
  act__ui__volume  - Perform "set_value" on slider "Volume" (current: 50)
  act__ui__mute  - Perform "activate" on checkbox "Mute"

a11y audit: clean
```

## gamestruct check

Runs the bridgeworks' own self-checks: the tree, both lanes, both bindings, and
the invariant that the SAME handle drives both lanes.

```bash
npx gamestruct check
```

Exit 0 when every check passes, 1 otherwise. It is wired into `npm run check`,
so it runs on every `prepublishOnly`.

## version / help

```bash
npx gamestruct version
npx gamestruct help
```
