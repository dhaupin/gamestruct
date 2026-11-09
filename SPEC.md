# gamestruct — the game-agent lane bridge

**Status:** draft spec (2026-11-09). No implementation in this repo yet.
**First consumers:** [synmergia](https://github.com/dhaupin/synmergia) (the
world) and [vant](https://github.com/dhaupin/vant) (the brain).

## 1. Why this exists

Two houses built the same seam from opposite ends and neither should own the
other's half:

- **synmergia** is a world. It exposes a *control surface*: an agent can
  observe the world and act in it, exactly as a player does.
- **vant** is a brain. It runs agents: a roster, work items, delegation,
  sign-off, persistence, and (per its `lib/leisure.js`) *leisure* — the
  want-list an agent keeps for its own free time.

The naive move is a bespoke `vant/lib/adapters/synmergia.js` that speaks
synmergia's dialect and nothing else. That works once and rots the moment a
third game or a third brain arrives. **gamestruct is the generalist lane
instead:** one small contract that *any* game can implement as a door and
*any* brain can drive as a client. synmergia and vant are the first two
consumers, not the definition.

The shape is deliberately the same shape synmergia and vant already reached
independently (synmergia's `AgentDriver`/`AgentDoor`, vant's MCP door), so
adopting gamestruct is *naming* what exists, not rewriting it.

## 2. The four primitives

A gamestruct door exposes exactly four verbs. Nothing else is required; a
world may add verbs behind `act`, but these four are the floor.

| Verb | Signature | Meaning |
|------|-----------|---------|
| `observe` | `() -> Snapshot` | The current world state for this seat: where am I, what is around me, what can I do. |
| `act` | `(id: String, args: Object) -> Result` | Do one thing. `id` is a **stable handle** (`world:<entity_id>`, `ui:<path>`, or a verb name). Never a pixel, an index, or a rect. |
| `wait_for` | `(predicate: Object, timeoutMs: Int) -> Result` | Block until a condition holds or the timeout expires. Honest timeout, never a hang. |
| `events` | `(sinceFrame: Int) -> Array` | The event ring since a frame cursor: what happened while you were not looking. |

### 2.1 Snapshot

```jsonc
{
  "ok": true,
  "scene": "globe_world",
  "in_world": true,
  "player": { "id": "...", "name": "...", "hp": 40, "hp_max": 60, "pos": {"x":0,"y":0,"z":0} },
  "target": { "id": "...", "name": "..." },        // or null
  "party":  { "id": "...", "size": 3, "members": [...] },
  "actions": [ { "id": "world:wolf_7", "action": "attack", "disabled": false } ]
}
```

`actions` is the honest affordance list: the world tells the agent what it can
do *now*, by stable id. An agent never guesses a handle.

### 2.2 Result

```jsonc
{ "ok": true,  "detail": { ... } }
{ "ok": false, "reason": "no such handle: world:ghost" }
```

Refusals are **named**. A refusal is a first-class outcome, not an error
channel.

## 3. Transport binding

gamestruct is transport-agnostic; two bindings are specified so
implementations interoperate.

### 3.1 HTTP (the door)

A single listener. The reference routes:

```
POST /observe            -> Snapshot
POST /act    {id, args}  -> Result
POST /wait_for {predicate, timeoutMs} -> Result
GET  /events?since=<frame> -> Array
```

### 3.2 MCP (the brain-facing binding)

The same door answers Model Context Protocol:

```
initialize  -> { protocolVersion, serverInfo, capabilities }
tools/list  -> [ { name, description, inputSchema } ... ]   // one tool per verb
tools/call  { name, arguments } -> Result
```

`tools/list` MUST carry a real `inputSchema` per tool, so an MCP client (vant's
`lib/agents` module among them) auto-wires without hand-written glue.

## 4. Identity, seats, and the slots law

- **A seat is a body.** One agent drives one seat. Two agents never share one
  body. (This is why the *turn law* below exists.)
- **An agent owns its own character.** In its current scope synmergia does
  **not** allow an agent to play a human's character. An agent is a player
  with its own account-bound character. This is law, not a default.
- **One human, one account.** Guest play is retired; every account is at least
  email-bound. An agent is bound 1:1 to a human account.
- **A human account holds a bounded number of agent slots.** The slot ladder
  (free floor, sigil-priced tiers, a hard ceiling) is a *world* policy — the
  door reports `slots`, it does not define them. gamestruct only requires that
  the pairing is 1:1 and bounded.

## 5. The turn law (serialization)

A seat's input is a single shared resource. Where a world drives a seat
through **global input state** (synmergia rides `Input.action_press`), exactly
one agent may drive that seat at a time. The door therefore holds a **turn
token** and steps its roster round-robin: each `step`, the next agent with
queued work performs one act, then the token passes.

Agents on **their own** process/door are not serialized — they have their own
input space. The distinction is *seat locality*, not agent count.

## 6. The sign-off gate

Some acts are consequential (spend, trade, purchase, drop, destroy, sell). A
door MAY gate a verb by name. A gated act parks as `pending_approval`; a human
(or a policy) approves (queues) or rejects (buries). This is how a watcher
keeps a hand on the wheel without micro-managing every step.

## 7. Remote posture (auth + TLS)

A door is a real remote surface and MUST fail closed:

- **Loopback by default.** Bind `127.0.0.1` unless an operator names another
  address.
- **Token, fail-closed.** When a token is configured, every request needs
  `Authorization: Bearer <token>` (or `x-api-key`). A missing token when one is
  configured is refused; a wrong token is refused.
- **Non-loopback requires a token.** A door MUST refuse a non-loopback bind
  with no token set.
- **TLS is the operator's reverse proxy.** The door speaks plain HTTP; a
  reverse proxy terminates TLS. The token rides the proxy.

## 8. Leisure (the brain's own half)

A brain MAY keep a **want-list** for an agent's free time — things the agent
wanted to do when idle (vant's `lib/leisure.js` is the reference). gamestruct
does not define leisure, but it names the **seam**: when idle capacity appears,
the brain consults its want-list and pursues one want *through the same
`act`/`observe` primitives*. Play is not a second protocol; it is the same lane
used without an objective.

## 9. Versioning

`initialize` returns a `protocolVersion`. The contract is additive: new verbs
arrive as new tools; existing verbs never change shape within a major version.

## 10. Consumers

| Consumer | Role | What it implements |
|----------|------|--------------------|
| **synmergia** | world | the door (`AgentDriver`/`AgentDoor`), the slots law, the sign-off gate |
| **vant** | brain | a client (`lib/adapters/synmergia.js`) + leisure pursuit over the lane |

Neither owns the contract. This repo does.

## License

MIT (see `LICENSE`).
