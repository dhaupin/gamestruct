# gamestruct

The game-agent lane bridge: one contract any game can implement as a **door**
and any brain can drive as a **client**. MIT.

Read the spec: [`SPEC.md`](./SPEC.md).

First consumers: [synmergia](https://github.com/dhaupin/synmergia) (the world)
and [vant](https://github.com/dhaupin/vant) (the brain). Part of the struct
family, beside [packstruct](https://github.com/dhaupin/packstruct) and
[memstruct](https://github.com/dhaupin/memstruct).

## The shape

A door exposes four primitives and nothing else is required:

| Verb | Meaning |
|------|---------|
| `observe()` | the current world state for this seat |
| `act(id, args)` | do one thing, by a **stable handle** (never a pixel) |
| `wait_for(predicate, timeoutMs)` | block until a condition holds or an honest timeout |
| `events(sinceFrame)` | what happened while you were not looking |

Two transport bindings: plain **HTTP** (the door) and **MCP** (the brain's
auto-wiring). See `SPEC.md` sec 3.
