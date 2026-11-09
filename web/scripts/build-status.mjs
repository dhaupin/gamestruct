#!/usr/bin/env node
/**
 * scripts/build-status.mjs - the family-status@1 emitter.
 *
 * Generates web/public/status.json from gamestruct's own committed battery
 * contract (labs/battery.json) plus a LIVE run of the bridgeworks' own
 * self-checks (lib/selfcheck.mjs - the same checks `gamestruct check` runs).
 * Zero deps, zero hand-editing: regenerated on every web build, so the served
 * dialect can never lag the code.
 *
 * The dialect (family-status@1, docs/status.md):
 *   { schema:1, contract:"family-status@1", repo, site, docs, asOf,
 *     legs:[{leg, verdict, cases, counts, ledger}],
 *     packs:[{name, spec, profile, manifest, cases}] }
 *
 * Verdict rule (additive-first): every live check verdict is PASSED or
 * REFUSED -> "PASS". A check that fails, a committed check that did not run,
 * or a live check not in the contract -> "RED". Verdicts come from the live
 * run reconciled against the committed list, never from prose.
 *
 * gamestruct ships no packs yet, so `packs` is [] - honestly empty, not
 * omitted.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(HERE, '..', '..')
const OUT_PATH = join(REPO_ROOT, 'web', 'public', 'status.json')

const REPO = 'dhaupin/gamestruct'
const SITE = 'https://gamestruct.creadev.org/status'
const DOCS = 'https://docs.creadev.org/gamestruct/status'

function legOf(rows, { leg, ledger }) {
    const counts = {}
    let verdict = 'PASS'
    for (const row of rows) {
        const v = row.verdict
        if (v === undefined || v === null) {
            verdict = 'RED'
            continue
        }
        if (v !== 'PASSED' && v !== 'REFUSED') verdict = 'RED'
        counts[v] = (counts[v] || 0) + 1
    }
    return { leg, verdict, cases: rows.length, counts, ledger }
}

async function selfcheckLeg() {
    const contractPath = join(REPO_ROOT, 'labs', 'battery.json')
    let contract
    try {
        contract = JSON.parse(readFileSync(contractPath, 'utf8'))
    } catch (err) {
        throw new Error(`labs/battery.json unreadable (${err.message}) - the selfcheck leg refuses a status it cannot count`)
    }
    const committed = Array.isArray(contract.checks) ? contract.checks : null
    if (!committed || !committed.length) {
        throw new Error('labs/battery.json carries no check list - the selfcheck leg refuses an empty contract')
    }

    const { runSelfChecks } = await import(join(REPO_ROOT, 'lib', 'selfcheck.mjs'))
    const res = await runSelfChecks()
    const live = new Map(res.rows.map((r) => [r.name, r.ok]))

    const rows = []
    // Every committed check must have run and passed. A missing check is a
    // silently-shrunk battery - RED, never a smaller green.
    for (const name of committed) {
        if (!live.has(name)) rows.push({ id: name, verdict: 'MISSING' })
        else rows.push({ id: name, verdict: live.get(name) ? 'PASSED' : 'FAILED' })
    }
    // Any live check not in the contract is unaccounted-for coverage - RED.
    const committedSet = new Set(committed)
    for (const [name, ok] of live) {
        if (!committedSet.has(name)) rows.push({ id: name, verdict: ok ? 'UNLISTED' : 'FAILED' })
    }

    return legOf(rows, { leg: 'selfcheck', ledger: 'labs/battery.json' })
}

export async function build(root = REPO_ROOT) {
    const leg = await selfcheckLeg()
    return {
        schema: 1,
        contract: 'family-status@1',
        repo: REPO,
        site: SITE,
        docs: DOCS,
        asOf: new Date().toISOString().slice(0, 10),
        legs: [leg],
        packs: [],
    }
}

// CLI: write the file when run directly.
const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (invokedDirectly) {
    try {
        const status = await build()
        mkdirSync(dirname(OUT_PATH), { recursive: true })
        writeFileSync(OUT_PATH, JSON.stringify(status, null, 2) + '\n')
        const red = status.legs.some((l) => l.verdict !== 'PASS')
        console.log(`wrote web/public/status.json (${status.legs.map((l) => `${l.leg} ${l.cases} ${l.verdict}`).join(', ')})`)
        process.exit(red ? 1 : 0)
    } catch (err) {
        console.error(`build-status: FAIL (${err.message})`)
        process.exit(1)
    }
}
