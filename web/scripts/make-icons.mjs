#!/usr/bin/env node
/**
 * web/scripts/make-icons.mjs - the gamestruct mark + icon set.
 *
 * The mark is the product: TWO LANES (the human lane and the agent lane) joined
 * by ONE BRIDGE (the shared semantic tree). It is authored here as vector
 * geometry, then rasterized to the full icon set so the whole family gets the
 * same one-command rebrand.
 *
 * Source is authored SVG (no raster source, no tracer): the mark is geometry,
 * not a traced bitmap, so it stays crisp at 16px and 512px alike.
 *
 *   cd web && node scripts/make-icons.mjs
 *
 * Output (web/public/ and docs/ kept byte-identical for the two faces):
 *   favicon-32.png, icon-192.png, icon-512.png, apple-touch-icon.png,
 *   icon.svg, og-image.png, public/brand/mark.svg
 *
 * Zero runtime deps beyond @resvg/resvg-js (a build-local helper; the lockfile
 * is untouched - run `npm i --no-save @resvg/resvg-js`).
 */
import { Resvg } from '@resvg/resvg-js'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const WEB = path.join(HERE, '..')
const REPO = path.join(WEB, '..')

const INK = '#e7eaf1'
const ACCENT = '#6d8cff'
const TILE = '#10131a'

/** The mark at a given size: two lanes + one bridge + a keystone node. */
function mark(size, { tile = true } = {}) {
    // Authored on a 64-unit grid, scaled by viewBox (no manual math).
    const lanes = `
    <rect x="10" y="20.5" width="44" height="4.2" rx="2.1" fill="${INK}"/>
    <rect x="10" y="39.3" width="44" height="4.2" rx="2.1" fill="${INK}"/>`
    // The bridge: a vertical arch joining the two lanes, plus its keystone.
    const bridge = `
    <path d="M25.5 39.3 C25.5 25.5 38.5 25.5 38.5 39.3"
          fill="none" stroke="${ACCENT}" stroke-width="3.4" stroke-linecap="round"/>
    <circle cx="32" cy="27.4" r="3.1" fill="${ACCENT}"/>`
    // Lane-end nodes: the two audiences meeting the bridge.
    const nodes = `
    <circle cx="15" cy="22.6" r="2.5" fill="${ACCENT}"/>
    <circle cx="49" cy="41.4" r="2.5" fill="${ACCENT}"/>`
    const bg = tile ? `<rect width="64" height="64" rx="14" fill="${TILE}"/>` : ''
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${size}" height="${size}">
  ${bg}${lanes}${bridge}${nodes}
</svg>`
}

/** The OG card: the mark + the wordmark, on the petrol ground. */
function ogCard() {
    const accent = 'game'
    const rest = 'struct'
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <rect width="1200" height="630" fill="${TILE}"/>
  <g transform="translate(150 205) scale(3.4)">
    ${mark(64, { tile: false }).replace(/^[\s\S]*?<svg[^>]*>/, '').replace('</svg>', '')}
  </g>
  <text x="150" y="560" font-family="ui-monospace, SFMono-Regular, Menlo, monospace"
        font-size="96" font-weight="700" fill="${INK}"><tspan fill="${ACCENT}">${accent}</tspan>${rest}</text>
  <text x="150" y="600" font-family="system-ui, sans-serif" font-size="30" fill="${INK}" opacity="0.7">One semantic tree. Two lanes. Four primitives.</text>
</svg>`
}

const SVG_HEADER = (body) => body

function render(svg, size) {
    const r = new Resvg(svg, { fitTo: { mode: 'width', value: size } })
    return r.render().asPng()
}

const OUT = []
function write(rel, data) {
    const abs = path.join(REPO, rel)
    fs.mkdirSync(path.dirname(abs), { recursive: true })
    fs.writeFileSync(abs, data)
    OUT.push(rel)
}

// icon.svg -> both faces (the two must stay byte-identical).
const svg = SVG_HEADER(mark(64))
write('web/public/icon.svg', svg)
write('docs/icon.svg', svg)
write('web/public/brand/mark.svg', svg)

// The raster set.
write('web/public/favicon-32.png', render(svg, 32))
write('web/public/icon-192.png', render(svg, 192))
write('web/public/icon-512.png', render(svg, 512))
write('web/public/apple-touch-icon.png', render(svg, 180))
write('web/public/og-image.png', render(ogCard(), 1200))

console.log('gamestruct icons written (' + OUT.length + '):')
for (const f of OUT) console.log('  ' + f)
