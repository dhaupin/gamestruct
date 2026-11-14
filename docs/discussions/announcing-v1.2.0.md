---
permalink: discussions/announcing-v1.2.0/
layout: default
title: Announcing gamestruct v1.2.0
description: The gamestruct v1.2.0 release post - the file IS the announcement; copy the raw markdown from GitHub into Discussions. Technical, changelog-style.
version: 1.2.0
---

# gamestruct v1.2.0

gamestruct is the lane bridge: one semantic tree that serves both a human's assistive technology and a machine agent. v1.2.0 makes the reference client safe by default. It is on npm:

```bash
npm i gamestruct@1.2.0
```

This post covers the injectable transport, the refusal-as-data rule, and the two new SPEC rules that pin them.

## The reference client's transport is injectable

`DoorClient` talked to a remote door with a raw global `fetch`. A door URL is an operator-supplied address, and the process that talks to it is exactly the one that should not open an unguarded socket: no SSRF IP wall, no DNS-rebinding refusal, no circuit breaker. A brain that adopted the reference as written had to fork it to interpose its own policy.

v1.2.0 lets the constructor take the transport:

```js
const client = new DoorClient({ url, token, fetch: myWalledFetch })
```

Every remote call now rides the injected fetch. The default stays the global `fetch`, so the reference is still usable standalone and still zero-dependency. A host supplies its own wall; the client never has to know.

## A refusal crosses the wire as data

The HTTP binding carries a refusal as `409` (N2/N21) and an honest `wait_for` timeout as `408` (N3), each with a `{ ok:false, reason }` body. The client returns that body verbatim, so the door's own `reason` survives the trip instead of being collapsed into a generic `http 409`. This was already the behavior; v1.2.0 pins it with tests so it cannot regress.

## SPEC v1.2

Two new rules, both binding the reference client rather than a door:

- **N25 (transport wall)** - the client MUST accept an injected fetch-shaped transport and route every remote request through it.
- **N26 (refusal as data)** - a refusal body under a refusal status MUST be returned verbatim; the door's reason is never collapsed into a transport error. This is N21 carried across the wire.

Both are additive: a door is unaffected, and a host that ignores the injection point behaves exactly as it did in v1.1.

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

The contract is unchanged for a host: v1.2 is additive, and a client that does not inject a transport behaves exactly as it did in v1.1.
