/**
 * gamestruct — the family-status@1 reader clause (docs/status.md, eyestruct#25).
 *
 * CSP connect-src governs fetch() BEFORE any CORS header is consulted, so
 * every origin the family-status island fetches must be in the page's own
 * connect-src. A sibling missing here is a dark row at the reader with a
 * correct 200 and ACAO behind it — the exact shape that kept the grid reading
 * "Failed to fetch". This leg fails at the cause: the island's table and the
 * served CSP can never drift apart silently again.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('status: the page CSP connect-src covers every sibling origin the island fetches', () => {
  const island = readFileSync(join(REPO_ROOT, 'web', 'src', 'components', 'FamilyStatusIsland.jsx'), 'utf8');
  const siblings = [...island.matchAll(/origin:\s*'([^']+)'/g)].map((m) => m[1]);
  assert.ok(siblings.length >= 4, `island declares its siblings (found ${siblings.length})`);

  const headers = readFileSync(join(REPO_ROOT, 'web', 'public', '_headers'), 'utf8');
  const csp = headers.split('\n').find((l) => l.includes('Content-Security-Policy:'));
  assert.ok(csp, 'the served _headers carries a CSP');
  const connectSrc = csp.slice(csp.indexOf('connect-src'), csp.indexOf(';', csp.indexOf('connect-src')));

  const self = 'https://gamestruct.creadev.org';
  for (const origin of siblings) {
    if (origin === self) continue;
    assert.ok(
      connectSrc.includes(origin),
      `connect-src must carry ${origin} (the island fetches it); add it in web/public/_headers`,
    );
  }
});
