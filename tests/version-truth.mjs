// tests/version-truth.mjs - the version-truth census leg (the family
// ruling; poststruct#26 and eyestruct@3d8a822 are the worked examples).
// package.json is THE single version truth of this tree; every surface
// that names the CURRENT version is leg-pinned to it, so a release is
// "move package.json + the CHANGELOG" and this battery refuses the
// surface that forgot. Lawful by classification (kept as-is): dated era
// rows (CHANGELOG dated sections), range pins such as "0.9.x is the
// manual ladder" (they bind ladder COMPATIBILITY, never the current
// version), and other packages' version mentions.
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const treeRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const readJson = (p) => JSON.parse(readFileSync(join(treeRoot, p), 'utf8'))

const v = readJson('package.json').version
if (!/^\d+\.\d+\.\d+$/.test(v)) {
  console.error(`version-truth: FAIL root package.json version is not semver: ${v}`)
  process.exit(1)
}

const problems = []
const surfaces = []

// A side package.json hand-copying the tree version is the CAUGHT class:
// the web rig rides the root version, it never carries its own copy.
let webVer
try { webVer = readJson('web/package.json').version } catch { /* absent is fine */ }
if (webVer) {
  surfaces.push('web/package.json version field')
  if (webVer !== v) {
    problems.push(`web/package.json carries its own version ${webVer} but package.json says ${v} - the side package.json rides the root version (drop the copy, never hand-sync it)`)
  } else {
    problems.push(`web/package.json hand-copies the tree version (${webVer}) - drop the field; the web rig rides the root version`)
  }
}

// The README H1 status surface: "# gamestruct <v>" is leg-pinned.
const h1 = readFileSync(join(treeRoot, 'README.md'), 'utf8').match(/^# gamestruct (\d+\.\d+\.\d+)\b/m)
if (h1) {
  surfaces.push('README.md H1 status copy')
  if (h1[1] !== v) {
    problems.push(`README.md H1 names ${h1[1]} but package.json says ${v} - move package.json + the H1 together, or drop the number`)
  }
}

// The web brand badge must DERIVE, never hand-copy. site.config.js sets
// `badge: 'v' + pkg.version`; a literal like `badge: 'v0.1'` is the CAUGHT
// class (the header drifts on the next cut while the package moves).
const siteCfg = readFileSync(join(treeRoot, 'site.config.js'), 'utf8')
const badgeLine = siteCfg.match(/^\s*badge:\s*(.+?),?\s*$/m)
if (badgeLine) {
  surfaces.push('site.config.js badge derivation')
  const expr = badgeLine[1].replace(/,\s*$/, '').trim()
  if (!/pkg\.version/.test(expr)) {
    problems.push(`site.config.js badge is ${expr} - it must DERIVE from package.json (badge: 'v' + pkg.version), never a hand-copied literal that drifts`)
  }
}

// The release-post surface: docs/discussions/announcing-vX.Y.Z.md is the
// announcement for that version, and the index row is what a reader clicks.
// Both hand-name a version, so both are leg-pinned. Two classes are checked:
//   - SELF-CONSISTENCY (every post, every row): the filename, the frontmatter
//     `version:`, the title, the H1 and the index row must name ONE version.
//     A post whose title says 1.4.0 while its filename says 1.5.0 is drift
//     regardless of what package.json says.
//   - THE CURRENT PIN (the current version only): the post for the packaged
//     version must exist and agree, so a cut cannot ship without its post.
const postsDir = join(treeRoot, 'docs/discussions')
let postFiles = []
try {
  postFiles = readdirSync(postsDir).filter((f) => /^announcing-v\d+\.\d+\.\d+\.md$/.test(f)).sort()
} catch { /* absent is fine */ }

const indexPath = join(postsDir, 'index.md')
let indexRows = []
try {
  indexRows = readFileSync(indexPath, 'utf8')
    .split('\n')
    .map((line) => line.match(/^\|\s*\[[^\]]*\]\(\/gamestruct\/discussions\/(announcing-v(\d+\.\d+\.\d+))\/\)\s*\|\s*(\d+\.\d+\.\d+)\s*\|/))
    .filter(Boolean)
    .map((m) => ({ slug: m[1], fileVer: m[2], rowVer: m[3] }))
} catch { /* absent is fine */ }

if (postFiles.length) {
  surfaces.push('docs/discussions posts (filename/frontmatter/title/H1)')
}
for (const f of postFiles) {
  const fileVer = f.match(/^announcing-v(\d+\.\d+\.\d+)\.md$/)[1]
  const body = readFileSync(join(postsDir, f), 'utf8')
  const fm = body.match(/^version:\s*(\d+\.\d+\.\d+)\s*$/m)
  const title = body.match(/^title:\s*(.+)$/m)
  const h1 = body.match(/^#\s+gamestruct v(\d+\.\d+\.\d+)\b/m)
  const say = (what, got) =>
    problems.push(`${f}: ${what} names ${got} but the filename says ${fileVer} - one post, one version`)
  if (!fm) problems.push(`${f}: frontmatter has no \`version:\` line - the post must declare the version it announces`)
  else if (fm[1] !== fileVer) say('frontmatter version', fm[1])
  if (title) {
    const tm = title[1].match(/gamestruct v(\d+\.\d+\.\d+)\b/)
    if (tm && tm[1] !== fileVer) say('title', tm[1])
  }
  if (h1 && h1[1] !== fileVer) say('H1', h1[1])
}

if (indexRows.length) {
  surfaces.push('docs/discussions/index.md rows')
}
for (const row of indexRows) {
  if (row.fileVer !== row.rowVer) {
    problems.push(`docs/discussions/index.md: the row linking ${row.slug} claims version ${row.rowVer} but the slug says ${row.fileVer} - the row must name the post it links`)
  }
  if (postFiles.length && !postFiles.includes(`${row.slug}.md`)) {
    problems.push(`docs/discussions/index.md: the row linking ${row.slug} has no such post file - a row must not outlive its post`)
  }
}

// The current pin: the packaged version must have its post, and the index
// must carry the matching row. This is what makes the post/tag ordering
// visible - a cut that promotes docs without the tag still leaves a post
// claiming a version the registry has not served, which is exactly the
// "fiction by promotion" the index forbids.
const currentPost = `announcing-v${v}.md`
if (postFiles.length || indexRows.length) {
  if (!postFiles.includes(currentPost)) {
    problems.push(`docs/discussions/${currentPost} is missing - the packaged version ${v} must ship its announcement post (one file per release)`)
  }
  const row = indexRows.find((r) => r.slug === `announcing-v${v}`)
  if (!row) {
    problems.push(`docs/discussions/index.md has no row for announcing-v${v} - the packaged version ${v} must be listed`)
  } else if (row.rowVer !== v) {
    problems.push(`docs/discussions/index.md lists announcing-v${v} as version ${row.rowVer} but package.json says ${v}`)
  }
}

if (problems.length) {
  console.error(`version-truth: FAIL (single truth = package.json ${v})`)
  for (const p of problems) console.error(`  - ${p}`)
  process.exit(1)
}
console.log(`version-truth: package.json ${v} is the single truth, ${surfaces.length} living surfaces agree - PASS`)
