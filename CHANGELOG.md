# Changelog

All notable changes to gamestruct are recorded here. This project adheres to
[Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-11-09

The first cut: the bridgeworks library, the spec, and the two reference
adapters.

### Added

- **The contract** (`SPEC.md`): four primitives (`observe`/`act`/`wait_for`/
  `events`), the node shape, two lanes, bindings, and posture. Rules N1..N21.
- **`lib/roles.mjs`** — the ARIA-aligned role + action vocabulary.
- **`lib/tree.mjs`** — the semantic tree, stable handles, traversal, lookup.
- **`lib/events.mjs`** — the bounded event ring (announce/change/focus) with an
  honest cursor.
- **`lib/bridge.mjs`** — the door: tree + ring + handlers, the four primitives.
- **`lib/profiles/human.mjs`** — the human lane: `render`, `a11yDump`, `audit`.
- **`lib/profiles/agent.mjs`** — the agent lane: `toolCatalog`, `affordances`,
  `toolCall`.
- **`lib/bindings/http.mjs`** — the HTTP door, fail-closed token auth.
- **`lib/bindings/mcp.mjs`** — the MCP door (JSON-RPC 2.0).
- **`lib/adapters/synmergia.mjs`** — the reference WORLD adapter.
- **`lib/adapters/vant.mjs`** — the reference BRAIN adapter.
- **`bin/gamestruct.mjs`** — the CLI: `check` (self-checks) and `doctor` (both
  lanes + the a11y audit on a demo surface).
- **`tests/bridgeworks.test.mjs`** — 31 assertions over the tree, both lanes,
  both bindings, and the two adapters.
- **`docs/`** — the Jekyll docs rig (rendered at docs.creadev.org/gamestruct).
- **CI** — `test.yml` (the battery) and `docs-deploy.yml` (thin caller of the
  freestruct docs lane).

### The idea

A UI accessible to a human with assistive technology and a UI accessible to a
machine agent need the same four things. gamestruct builds those once and
serves both. The accessibility win is real for people; the agent win falls out
of the same work.
