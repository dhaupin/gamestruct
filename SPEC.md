# gamestruct — Specification v1

> The game-agent lane bridge. One semantic tree; two lanes: a **human lane**
> (assistive technology) and an **agent lane** (machine clients). Four
> primitives. MIT.

Status: **draft, implementation-backed.** The normative rules below are
executable — `lib/` implements them and `tests/` proves them. Where prose and
code disagree, the code is the bug.

**Revision history.** The spec revision is its own axis, decoupled from the
package semver (the family rule: a spec revision freezes the contract, a
package version moves with the code). v1 freezes rules N1-N21 against the
implementation `lib/` ships. Additive rows arrive as v1.x; a rule that changes
a conforming host's behavior is v2.

---

## 1. Why this exists

A user interface that is accessible to a person using a screen reader and a
user interface that is accessible to a software agent are **the same
interface**. Both need the same four things:

1. a **semantic tree** of nodes that carry a *role*, an *accessible name*, a
   *value/state*, and the *actions* they accept;
2. **stable handles** — the same node is the same node across a re-render,
   before and after state changes;
3. a **linear traversal** (the focus order a switch or keyboard user walks,
   and the order a brain reads);
4. an **event stream** of what changed while nobody was looking (a live
   region announces; an agent polls).

Build those four once and the surface serves **both** audiences. This
document is that contract, kept small enough that a game can implement a door
in an afternoon.

The name is literal: a game (or any app) exposes a *door*; an agent brain is a
*client*; the shared vocabulary is the *bridgeworks*.

## 2. Scope

gamestruct is **transport- and language-agnostic**. It defines:

- the **vocabulary** (roles, actions, node shape) — sec 4;
- the **four primitives** — sec 3;
- the **two lanes** and their outputs — sec 5, 6;
- the **bindings** (HTTP, MCP) — sec 7;
- the **posture** (auth, identity, the gate) — sec 8.

It does **not** define: rendering, the game loop, persistence, or any
particular game. A door implements the primitives; a client consumes them.

## 3. The four primitives (NORMATIVE)

Every door exposes exactly these four operations. A door MAY expose more, but
a client that only uses these four MUST be able to operate the surface.

| Primitive | Signature | Meaning |
|-----------|-----------|---------|
| `observe` | `() -> Snapshot` | the current state of the surface for this seat |
| `act` | `(handle, verb?, value?) -> Result` | perform one action on one node |
| `wait_for` | `(predicate, timeoutMs) -> Outcome` | resolve when a condition holds, or time out honestly |
| `events` | `(sinceFrame) -> { frame, events[] }` | what happened since a cursor |

Rules:

- **N1** — `act` operates by **stable handle**, never by pixel, rect, or
  positional index.
- **N2** — `act` MUST refuse (not silently ignore) an unknown handle, a verb
  the node does not declare, and a disabled node. A refusal carries a
  human-readable `reason`.
- **N3** — `wait_for` MUST resolve with an honest timeout (`reason: "timeout"`)
  rather than hang or resolve falsely.
- **N4** — `events(sinceFrame)` MUST be an honest cursor: calling it twice with
  the same cursor returns the same events; the returned `frame` is monotonic.
- **N5** — `observe` MUST include the current focus handle and a summary.

## 4. Vocabulary (NORMATIVE)

### 4.1 Node shape

```
{
  id:          string,     // a stable handle, unique in the tree
  role:        string,     // sec 4.2
  name:        string,     // the accessible name (what a screen reader says)
  value?:      any,        // current value (slider/textbox/progressbar)
  description?: string,    // supplementary text (alt text for images)
  actions:     string[],   // sec 4.3; the verbs this node accepts
  disabled?:   boolean,
  checked?:    boolean,    // checkbox/radio/switch
  expanded?:   boolean,    // disclosure
  min?:        number,     // slider/progressbar
  max?:        number,
  level?:      number,     // heading
  parent:      string|null,
  children:    string[],   // ordered; the traversal order
  meta?:       object      // host-specific, ignored by the bridge
}
```

### 4.2 Roles

ARIA-aligned. A door SHOULD use these; a door MAY add namespaced roles
(`mygame:ammo`) and a client MUST tolerate unknown roles (treat as `group`).

`group region list listitem menu menuitem dialog tablist tab tabpanel
separator heading text image button link textbox checkbox radio slider
switch combobox progressbar status log alert`

- **N6** — a node whose role is interactive (`button link textbox checkbox
  radio slider switch combobox menuitem tab listitem`) MUST carry a
  non-empty accessible `name`.
- **N7** — a live role (`status log alert`) MUST announce on change;
  `alert` is assertive, `status`/`log` polite.

### 4.3 Actions

`activate focus set_value select expand collapse scroll`

- **N8** — an interactive node MUST declare at least one action (the default
  for its role, if the door names none).
- **N9** — a node's `actions` is the *complete* set it accepts; `act` with
  any other verb is refused.

## 5. The human lane (NORMATIVE output)

`render(bridge)` produces, for assistive technology:

```
{
  surface, focus,
  focusOrder: string[],   // interactive, non-disabled, traversal order
  nodes: [ { id, role, name, value?, description?, disabled?, focusable,
             actions, checked?, expanded?, live?, politeness? } ]
}
```

- **N10** — `focusOrder` MUST be the traversal order (depth-first, child
  order); a switch/keyboard user walks it top to bottom.
- **N11** — `a11yDump(bridge)` MUST render one line per node, in traversal
  order, so a surface can be *read* as text. This is the "is it describable
  at all" proof.
- **N12** — `audit(bridge)` MUST flag: an interactive node with no name, an
  interactive node with no action, and an image with no alt text. This is a
  gate (broken vs. working), not a taste score.

## 6. The agent lane (NORMATIVE output)

`toolCatalog(bridge)` produces MCP-shaped tools, one per actionable node:

```
{ name, description, inputSchema: { properties: { verb: {enum}, value? } },
  _handle, _role, _actions }
```

- **N13** — there MUST be exactly one tool per actionable (non-disabled, has
  actions) node. The tool's `inputSchema.properties.verb.enum` MUST equal the
  node's `actions`.
- **N14** — `toolCall(bridge, name, args)` MUST dispatch onto the same `act`
  the human lane uses. There is no second code path.
- **N15** — `toolName(handle)` MUST be a deterministic, MCP-safe slug, so a
  client can round-trip a handle.

## 7. Bindings (NORMATIVE where implemented)

A binding is transport only; it never invents state.

### 7.1 HTTP

| Route | Method | Maps to |
|-------|--------|---------|
| `/observe` | GET | `observe()` |
| `/act` | POST `{id,verb?,value?}` | `act(...)` |
| `/wait_for` | POST `{predicate,timeoutMs}` | `waitFor(...)` |
| `/events?since=N` | GET | `events(N)` |
| `/health` | GET | liveness |

- **N16** — when a token is configured, every route except `/health` MUST be
  refused with `401` unless the request carries it. Fail closed.

### 7.2 MCP (JSON-RPC 2.0)

`initialize`, `tools/list`, `tools/call`, plus `observe`/`events` as direct
methods. Protocol version `2024-11-05`.

- **N17** — `tools/list` MUST carry each tool's `inputSchema` (so an MCP
  client auto-wires with no bespoke code).
- **N18** — an unknown method MUST return JSON-RPC error `-32601`.

## 8. Posture (NORMATIVE)

- **N19 (identity)** — a *seat* is one authenticated actor. A door MUST NOT
  let one seat act as another. Local dev may run an open loopback posture;
  any non-loopback bind MUST require a token.
- **N20 (gate)** — a door MAY mark verbs that need human sign-off (spend,
  trade, destroy). A gated verb MUST park, not silently execute, and MUST be
  resolvable by an explicit approve/reject.
- **N21 (honesty)** — every refusal is a value (`{ ok:false, reason }`), never
  an exception thrown across the boundary and never a silent no-op.

## 9. Conformance

A door is **gamestruct-conformant** when it passes, at minimum:

- N1–N5 (primitives), N6–N9 (vocabulary), N10–N12 (human lane),
  N13–N15 (agent lane), N16–N18 (bindings), N19–N21 (posture).

`gamestruct check` runs the reference battery; `gamestruct doctor` prints both
lanes' output for a demo surface and runs the a11y audit.

## 10. Adoption in one afternoon

1. Build a tree from your existing state (`Tree` + `add`).
2. Register a handler per actionable handle (`bridge.on(handle, { verb: fn })`).
3. Mount a binding (`bindings.http.createHandler(bridge, { token })`).
4. Run `human.audit(bridge)` in CI — fix what it flags.

You now serve screen readers and agents from one description. That is the
whole product.
