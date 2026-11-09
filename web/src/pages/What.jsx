/**
 * pages/What.jsx - what ships in the box: four primitives, two lanes, two
 * bindings, one tree. Shell conventions kept (usePageMeta in the body).
 */
import { Link } from 'react-router-dom'
import usePageMeta from '../hooks/usePageMeta.js'
import site, { routeMeta } from '../site.js'

export default function What() {
  const meta = routeMeta('/what')
  usePageMeta({ siteUrl: site.url, path: '/what', title: meta.title, description: meta.description })
  return (
    <>
      <section className="hero">
        <div className="wrap">
          <p className="eyebrow">what</p>
          <h1>
            Four primitives, <span className="accent">two lanes.</span>
          </h1>
          <p className="lede">
            A zero-dependency ESM library. One contract - four primitives over
            one semantic tree - plus reference renderings for both audiences
            and two transport bindings.
          </p>
          <div className="cta-row">
            <a className="btn btn-primary" href={site.repo}>See the repo</a>
            <a className="btn btn-ghost" href={`${site.docs.url}/what/`}>Read the docs</a>
          </div>
          <pre className="code"><span className="k">npm</span> install gamestruct</pre>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <h2>The four primitives</h2>
          <p className="sub">
            Every door exposes exactly these four. A client that uses only
            these four can operate the surface.
          </p>
          <div className="grid">
            <div className="card">
              <h3><span className="glyph">1</span>observe</h3>
              <p><code>() -&gt; Snapshot</code> - the surface's state for this seat.</p>
            </div>
            <div className="card">
              <h3><span className="glyph">2</span>act</h3>
              <p><code>(handle, verb?, value?) -&gt; Result</code> - do one thing, by stable handle.</p>
            </div>
            <div className="card">
              <h3><span className="glyph">3</span>wait_for</h3>
              <p><code>(predicate, timeoutMs) -&gt; Outcome</code> - resolve when a condition holds, or time out honestly.</p>
            </div>
            <div className="card">
              <h3><span className="glyph">4</span>events</h3>
              <p><code>(sinceFrame) -&gt; {'{ frame, events[] }'}</code> - what changed while you were not looking.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <h2>The two lanes</h2>
          <p className="sub">
            Both read the SAME tree - two renderings of one description, not
            two implementations of one feature.
          </p>
          <div className="grid">
            <div className="card">
              <h3><span className="glyph">◧</span> human lane</h3>
              <p><code>render</code>, <code>a11yDump</code>, <code>audit</code> - the assistive-technology view: roles, accessible names, focus order, live regions.</p>
            </div>
            <div className="card">
              <h3><span className="glyph">◨</span> agent lane</h3>
              <p><code>toolCatalog</code>, <code>affordances</code>, <code>toolCall</code> - the machine view: one MCP-shaped tool per actionable node, each with an inputSchema so a client auto-wires.</p>
            </div>
            <div className="card">
              <h3><span className="glyph">⇄</span> the bindings</h3>
              <p>Transport only: <code>bindings/http</code> (<code>/observe</code>, <code>/act</code>, <code>/wait_for</code>, <code>/events</code>, <code>/health</code>, fail-closed auth) and <code>bindings/mcp</code> (JSON-RPC 2.0).</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <h2>The smallest surface</h2>
          <p className="sub">
            A door and a client share exactly one vocabulary: the handle.
            Everything else is a rendering.
          </p>
          <pre className="code"><span className="k">import</span> {'{ Bridge, ROLES, human, agent }'} <span className="k">from</span> <span className="cm">'gamestruct'</span>{'\n\n'}<span className="k">const</span> bridge = <span className="k">new</span> Bridge({'{ name: '}<span className="cm">'pause menu'</span>{' }'}){'\n'}bridge.tree.<span className="k">add</span>(<span className="k">null</span>, {'{ id: '}<span className="cm">'ui:start'</span>{', role: ROLES.BUTTON, name: '}<span className="cm">'Start game'</span>{' }'}){'\n'}bridge.<span className="k">on</span>(<span className="cm">'ui:start'</span>, {'{ activate: () => startGame() }'})</pre>
          <div className="cta-row" style={{ marginTop: 20 }}>
            <Link className="btn btn-primary" to="/start">Start here</Link>
            <a className="btn btn-ghost" href={`${site.docs.url}/bindings/`}>Bindings</a>
            <a className="btn btn-ghost" href={`${site.docs.url}/adapters/`}>Adapters</a>
          </div>
        </div>
      </section>
    </>
  )
}
