/**
 * pages/Why.jsx - why gamestruct exists: a screen reader and a machine agent
 * fail on the same UI. Shell conventions kept (usePageMeta in the component
 * body - calling it inside another effect is an invalid hook call).
 */
import { Link } from 'react-router-dom'
import usePageMeta from '../hooks/usePageMeta.js'
import site, { routeMeta } from '../site.js'

export default function Why() {
  const meta = routeMeta('/why')
  usePageMeta({ siteUrl: site.url, path: '/why', title: meta.title, description: meta.description })
  return (
    <>
      <section className="hero">
        <div className="wrap">
          <p className="eyebrow">why</p>
          <h1>
            The same absence, <span className="accent">twice.</span>
          </h1>
          <p className="lede">
            A screen reader, a switch, voice control, and a machine agent all
            fail on the <strong>same</strong> UI: buttons with no accessible
            name, state with no text, controls with no stable handle. That is
            not four problems. It is one missing description.
          </p>
          <div className="cta-row">
            <Link className="btn btn-primary" to="/what">What gamestruct is</Link>
            <a className="btn btn-ghost" href={`${site.docs.url}/`}>Read the docs</a>
            <a className="btn btn-ghost" href={site.repo}>See the repo</a>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <h2 className="section-title">The problem: the surface is invisible twice</h2>
          <p className="lede" style={{ marginTop: 8 }}>
            Most games ship with no accessibility layer and no agent surface.
            Those look like two gaps, but they are one gap seen from two sides:
            a person using a screen reader hears "button" with no name and
            cannot act; an agent brain sees pixels with no handle and cannot
            act either.
          </p>
          <p className="lede" style={{ marginTop: 8 }}>
            Both need the same four things - a semantic tree, stable handles, a
            linear traversal, and an event stream - which is the whole reason a
            single contract can serve both.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <h2 className="section-title">The thesis: describe once, render twice</h2>
          <p className="lede" style={{ marginTop: 8 }}>
            Describe the surface once as a semantic tree, and the two lanes are
            two renderings of that one description. The human lane hands the
            tree to the platform accessibility API (ARIA, AccessKit,
            NSAccessibility). The agent lane hands the same tree to an MCP
            client. Same nodes, same handles, same <code>act()</code>.
          </p>
          <pre className="code"><span className="cm">// one tree, both audiences</span>{'\n'}human.<span className="k">a11yDump</span>(bridge)      <span className="cm">// what a screen reader reads</span>{'\n'}agent.<span className="k">toolCatalog</span>(bridge)     <span className="cm">// what an MCP client auto-wires</span>{'\n'}<span className="k">await</span> bridge.<span className="k">act</span>(<span className="cm">'ui:start'</span>)    <span className="cm">// either lane, one code path</span></pre>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <h2 className="section-title">Why it is small on purpose</h2>
          <p className="lede" style={{ marginTop: 8 }}>
            An accessibility layer that is a separate feature rots: it drifts
            from the real UI the day someone forgets to update both.
            gamestruct is one tree, so there is nothing to drift from. A game
            does not adopt gamestruct by rewriting itself - it writes one
            function that maps its own state to a tree, and both lanes fall
            out.
          </p>
          <div className="cta-row" style={{ marginTop: 20 }}>
            <Link className="btn btn-primary" to="/start">Start here</Link>
            <a className="btn btn-ghost" href={`${site.docs.url}/contract/`}>The contract</a>
          </div>
        </div>
      </section>
    </>
  )
}
