/**
 * pages/Start.jsx - the beginner on-ramp: describe, wire, read both lanes,
 * act, gate. Shell conventions kept (usePageMeta in the body).
 */
import { Link } from 'react-router-dom'
import usePageMeta from '../hooks/usePageMeta.js'
import site, { routeMeta } from '../site.js'

export default function Start() {
  const meta = routeMeta('/start')
  usePageMeta({ siteUrl: site.url, path: '/start', title: meta.title, description: meta.description })
  return (
    <>
      <section className="hero">
        <div className="wrap">
          <p className="eyebrow">start here</p>
          <h1>
            Describe once, <span className="accent">serve both.</span>
          </h1>
          <p className="lede">
            Never heard of gamestruct? This is the five-minute on-ramp. It ends
            with a surface that both a screen reader and an agent can operate.
          </p>
          <div className="cta-row">
            <a className="btn btn-primary" href={`${site.docs.url}/start/`}>Full walkthrough</a>
            <a className="btn btn-ghost" href={`${site.docs.url}/contract/`}>The contract</a>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <h2 className="section-title">1. Describe</h2>
          <p className="lede" style={{ marginTop: 8 }}>
            A node carries a handle (a stable id), a role (what it is), an
            accessible name (what a screen reader says), and the actions it
            accepts. Use a stable handle - it is the same one both lanes use.
          </p>
          <pre className="code"><span className="k">import</span> {'{ Bridge, ROLES }'} <span className="k">from</span> <span className="cm">'gamestruct'</span>{'\n\n'}<span className="k">const</span> bridge = <span className="k">new</span> Bridge({'{ name: '}<span className="cm">'pause menu'</span>{' }'}){'\n'}bridge.tree.<span className="k">add</span>(<span className="k">null</span>, {'{ id: '}<span className="cm">'ui:start'</span>{', role: ROLES.BUTTON, name: '}<span className="cm">'Start game'</span>{' }'}){'\n'}bridge.tree.<span className="k">add</span>(<span className="k">null</span>, {'{ id: '}<span className="cm">'ui:volume'</span>{', role: ROLES.SLIDER, name: '}<span className="cm">'Volume'</span>{', value: 50 }'})</pre>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <h2 className="section-title">2. Wire</h2>
          <p className="lede" style={{ marginTop: 8 }}>
            One handler per actionable handle. The verb is the action the node
            declares - <code>activate</code> for a button, <code>set_value</code>
            for a slider.
          </p>
          <pre className="code">bridge.<span className="k">on</span>(<span className="cm">'ui:start'</span>,  {'{ activate: () => startGame() }'}){'\n'}bridge.<span className="k">on</span>(<span className="cm">'ui:volume'</span>, {'{ set_value: (v) => setVolume(v) }'})</pre>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <h2 className="section-title">3. Read both lanes</h2>
          <p className="lede" style={{ marginTop: 8 }}>
            The same bridge now renders to a screen reader and to an MCP
            client. Either lane drives the same <code>act()</code> - there is no
            agent rail and no second protocol.
          </p>
          <pre className="code">human.<span className="k">a11yDump</span>(bridge)      <span className="cm">// the screen-reader text</span>{'\n'}agent.<span className="k">toolCatalog</span>(bridge)     <span className="cm">// the MCP tool list</span>{'\n'}<span className="k">await</span> bridge.<span className="k">act</span>(<span className="cm">'ui:start'</span>)    <span className="cm">// one code path</span></pre>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <h2 className="section-title">4. Gate it</h2>
          <p className="lede" style={{ marginTop: 8 }}>
            Run the a11y audit in CI. It flags the failures that actually break
            a screen reader: an interactive node with no name, one with no
            action, an image with no alt text.
          </p>
          <pre className="code"><span className="k">const</span> {'{ ok, problems }'} = human.<span className="k">audit</span>(bridge){'\n\n'}<span className="cm"># or see both lanes + the audit at once:</span>{'\n'}<span className="k">npx</span> gamestruct doctor</pre>
          <div className="cta-row" style={{ marginTop: 20 }}>
            <Link className="btn btn-primary" to="/what">What gamestruct is</Link>
            <a className="btn btn-ghost" href={`${site.docs.url}/human-lane/`}>The human lane</a>
            <a className="btn btn-ghost" href={`${site.docs.url}/agent-lane/`}>The agent lane</a>
          </div>
        </div>
      </section>
    </>
  )
}
