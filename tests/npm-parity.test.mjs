// The npm parity gate (a new law ships with a test).
//
// Every family repo advertises its published package on npm, on every surface
// it ships. This proves each REQUIRED surface carries a link naming the
// package.json name, so a rename or a dropped surface reds here instead of
// shipping a package nobody can find. The npm URL is a family truth surface.
//
// Two shapes are lawful: the literal https://www.npmjs.com/package/<name>, or
// the generated {{ site.npm_url }} var whose value comes from site.config.js.
//
// The bite: the predicate is a plain function, and a mutation fixture proves it
// reports a problem when a required surface loses its link. A check that cannot
// fail is not a check.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8')
const has = (rel) => fs.existsSync(path.join(ROOT, rel))

const pkg = JSON.parse(read('package.json'))
const NPM = `https://www.npmjs.com/package/${pkg.name}`

// The surfaces that MUST carry the link. Listed explicitly rather than probed
// by "any hit wins": a docs tree has several surfaces, and a gate satisfied by
// whichever one happens to carry a link cannot notice the one that lost it.
const REQUIRED = [
  'docs/_layouts/default.html', // the docs header/footer
  'docs/_data/nav.yml', // the docs sidebar
  'site.config.js', // the landing nav source
]

const PLACEHOLDER = /\{\{\s*site\.npm_url\s*\}\}/

// The one predicate: given a surface's text, does it advertise THIS package?
// Returns null when lawful, a reason string when not.
function parityProblem(rel, text) {
  if (!text.includes(NPM) && !PLACEHOLDER.test(text)) {
    return `${rel} carries no link to ${NPM} (neither the literal nor {{ site.npm_url }})`
  }
  // A literal naming some other package is worse than a missing one: it looks
  // wired and sends the reader to the wrong place.
  const names = [...text.matchAll(/npmjs\.com\/package\/([a-z0-9@/_.-]+)/gi)].map((m) => m[1])
  for (const name of names) {
    if (name !== pkg.name) return `${rel} links the package "${name}", but package.json says "${pkg.name}"`
  }
  return null
}

test('the package is published under the name the site advertises', () => {
  assert.ok(!pkg.private, 'a private package must not advertise an npm link')
  assert.match(pkg.name, /^[a-z0-9-]+$/, 'the package name must be a plain npm name')
})

for (const rel of REQUIRED) {
  test(`${rel} advertises the package on npm`, () => {
    assert.ok(has(rel), `${rel} is missing - update the REQUIRED list if the surface moved`)
    const problem = parityProblem(rel, read(rel))
    assert.equal(problem, null, problem || '')
  })
}

test('the gate bites: a required surface that loses its link is refused', () => {
  // The regression this gate exists for: a rebrand sweep or a footer rewrite
  // drops the link. Strip it from each required surface and prove the predicate
  // - the same one the tests above use - reports it.
  for (const rel of REQUIRED) {
    const original = read(rel)
    const stripped = original
      .replace(/https:\/\/www\.npmjs\.com\/package\/[^\s"'<>]+/g, 'https://example.com/removed')
      .replace(PLACEHOLDER, 'https://example.com/removed')
    assert.notEqual(stripped, original, `the fixture must actually remove a link from ${rel}`)
    assert.notEqual(parityProblem(rel, stripped), null,
      `${rel} with its link removed must be refused, but the predicate passed it`)
  }
})

test('the gate bites: a link naming the wrong package is refused', () => {
  const rel = 'docs/_layouts/default.html'
  const stale = read(rel).replace(new RegExp(NPM, 'g'), 'https://www.npmjs.com/package/not-this-package')
  assert.notEqual(stale, read(rel), 'the fixture must actually retarget the link')
  assert.notEqual(parityProblem(rel, stale), null, 'a link naming another package must be refused')
})
