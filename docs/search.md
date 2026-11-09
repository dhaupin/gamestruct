---
permalink: search/
layout: default
title: Search
description: Static full-text search over the gamestruct docs, powered by Pagefind indexing the final baked HTML.
nav_order: 30
---

# Search

<div id="search"></div>
<link href="{{ '/pagefind/pagefind-ui.css' | relative_url }}" rel="stylesheet">
<script src="{{ '/pagefind/pagefind-ui.js' | relative_url }}"></script>
<script>
  new PagefindUI({ element: '#search', showSubResults: true })
</script>

The index is built by the docs deploy lane over the final baked HTML
(`pagefind --site _site`), so search covers exactly what shipped - nothing
hand-maintained.

<div class="crosslinks">
<p><strong>More in these docs:</strong>
<a href="{{ '/' | relative_url }}">home</a> ·
<a href="{{ '/contract/' | relative_url }}">the contract</a> ·
<a href="{{ '/bindings/' | relative_url }}">bindings</a> ·
<a href="{{ '/adapters/' | relative_url }}">adapters</a></p>
</div>
