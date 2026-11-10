/**
 * pages/Status.jsx - the live family-status@1 surface. Same honest-data rule
 * as the dialect: the island fetches the siblings' served /status.json at
 * load, no server, no guessed numbers. gamestruct's own row is served from
 * its own generated /status.json, which this page also links.
 * Shell conventions kept (usePageMeta in the body).
 */
import usePageMeta from '../hooks/usePageMeta.js'
import site, { routeMeta } from '../site.js'

export default function Status() {
  const meta = routeMeta('/status')
  usePageMeta({ siteUrl: site.url, path: '/status', title: meta.title, description: meta.description })
  return (
    <>
      <section className="hero">
        <div className="wrap">
          <p className="eyebrow">status</p>
          <h1>
            The committed memory, <span className="accent">live.</span>
          </h1>
          <p className="lede">
            gamestruct serves its own verdicts at <code>/status.json</code>,
            generated from its committed battery on every web build. This page
            reads its own file and the family's, the way a fresh agent session
            would - no server, no numbers fresher than the commits. Refresh to
            re-read.
          </p>
          <div className="cta-row">
            <a className="btn btn-ghost" href="/status.json">/status.json</a>
            <a className="btn btn-ghost" href={`${site.repo}/blob/main/labs/battery.json`}>labs/battery.json</a>
            <a className="btn btn-ghost" href={`${site.repo}/actions/workflows/test.yml`}>CI runs</a>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <h2>What you are looking at</h2>
          <p className="sub">Each number is a receipt from a CI leg, not a marketing claim.</p>
          <div className="grid">
            <div className="card">
              <h3><span className="glyph">◉</span> the selfcheck leg</h3>
              <p>The bridgeworks' own battery (<code>lib/selfcheck.mjs</code>):
              the same checks <code>gamestruct check</code> runs - the tree,
              both lanes, both bindings, and the invariant that the SAME handle
              drives both.</p>
            </div>
            <div className="card">
              <h3><span className="glyph">⇄</span> the committed contract</h3>
              <p><code>labs/battery.json</code>: the expected shape of that
              battery. A check that silently disappears reads RED, never a
              smaller green; an unlisted live check reads RED too.</p>
            </div>
            <div className="card">
              <h3><span className="glyph">✗</span> packs shipped</h3>
              <p>gamestruct ships no packstruct@1 packs yet, so its
              <code> packs</code> array is empty - honestly empty, not omitted.
              The slot wakes the day a pack lands.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <h2>The family, one dialect</h2>
          <p className="sub">
            Every member serves the same status contract: one schema, one fixed
            path, receipt-derived numbers only.
          </p>
          <pre-island data-pre-island="family-status" data-pre-load="idle">
            <span className="island-loading">Reading the family's served status files...</span>
          </pre-island>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <h2>When it goes red</h2>
          <p className="sub">
            A red gate names its leg and its ledger. The dialect and the
            verdict rule live in the docs.
          </p>
          <div className="cta-row">
            <a className="btn btn-primary" href={`${site.docs.url}/status/`}>Status dialect</a>
            <a className="btn btn-ghost" href={`${site.docs.url}/cli/`}>The CLI</a>
            <a className="btn btn-ghost" href={`${site.docs.url}/`}>Read the docs</a>
          </div>
        </div>
      </section>
    </>
  )
}
