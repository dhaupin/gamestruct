---
permalink: discussions/announcing-v1.1.1
layout: default
title: Announcing gamestruct v1.1.1
description: The gamestruct v1.1.1 release post - the file IS the announcement; copy the raw markdown from GitHub into Discussions. Technical, changelog-style.
version: 1.1.1
---

# gamestruct v1.1.1

gamestruct is the lane bridge: one semantic tree that serves both a human's assistive technology and a machine agent. v1.1.1 is a patch release. It is on npm:

```bash
npm i gamestruct@1.1.1
```

This post covers the one fix in it.

## The status page no longer names a check count

`docs/status.md` and `web/src/pages/Status.jsx` described the self-check leg as "the same 17 checks `gamestruct check` runs". The battery has been 20 since the eyes landed (SPEC v1.1, N22-N24), so the prose was stale by three. Both surfaces now read "the same checks" - no hardcoded count - so the copy cannot drift again the next time a check is added.

No library code changed. The contract, the SPEC revision, and every surface are byte-identical to v1.1.0.

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

The contract is unchanged: v1.1.1 is a docs patch, and a host that ignores it behaves exactly as it did in v1.1.0.
