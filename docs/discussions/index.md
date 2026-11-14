---
permalink: discussions
layout: default
title: Release Posts
description: The family docs/discussions release-post convention for gamestruct - one file per release, the file IS the post, drafted against shipped versions only.
nav_order: 140
---

# Release posts (docs/discussions)

The release trail lives in the same tree as the changelog it summarizes. One file per release announcement, dropped into a GitHub Discussions post when the release goes live.

## Conventions (family-level, from crashtest's index)

Source of truth (link-not-copy): https://github.com/dhaupin/crashtest/blob/main/docs/discussions/index.md

- **One file per release**: `docs/discussions/announcing-vX.Y.Z.md`.
- **The file IS the post**: below the frontmatter, the body is the announcement itself - no wrapper prose, no nested code fences. View the file, strip the frontmatter, paste. Posting mechanics stay HERE, in this index, never inside a post.
- **Draft against a RELEASED version only.** A post describing a version that is not on the registry yet is fiction by promotion.
- Frontmatter shape follows crashtest's first post: https://github.com/dhaupin/crashtest/blob/main/docs/discussions/announcing-v1.0.0.md

## Index

| post | version | live |
| --- | --- | --- |
| [Announcing gamestruct v1.3.0](/gamestruct/discussions/announcing-v1.3.0/) | 1.3.0 | 2026-11-13 on npm |
| [Announcing gamestruct v1.2.1](/gamestruct/discussions/announcing-v1.2.1/) | 1.2.1 | 2026-11-10 on npm |
| [Announcing gamestruct v1.2.0](/gamestruct/discussions/announcing-v1.2.0/) | 1.2.0 | 2026-11-10 on npm |
| [Announcing gamestruct v1.1.1](/gamestruct/discussions/announcing-v1.1.1/) | 1.1.1 | 2026-11-10 on npm |
| [Announcing gamestruct v1.1.0](/gamestruct/discussions/announcing-v1.1.0/) | 1.1.0 | 2026-11-09 on npm |
| [Announcing gamestruct v1.0.0](/gamestruct/discussions/announcing-v1.0.0/) | 1.0.0 | 2026-11-09 on npm |

To publish one: open the file, copy the raw markdown (GitHub: **Raw**), strip the frontmatter block at the top, and paste it into a GitHub Discussions announcement for that version.
