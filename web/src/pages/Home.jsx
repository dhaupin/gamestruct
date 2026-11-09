/**
 * pages/Home.jsx - the gamestruct landing.
 *
 * usePageMeta lives in the component BODY (calling it inside another effect
 * was an invalid hook call - React #321 tore the tree down; keep it here).
 * The .code pre carries the token classes the docs Rouge output shares
 * (.k/.cm); CTAs compose .btn + a color modifier.
 */
import usePageMeta from '../hooks/usePageMeta.js'
import site, { routeMeta } from '../site.js'

export default function Home() {
  const meta = routeMeta('/')
  usePageMeta({ siteUrl: site.url, path: '/', title: meta.title, description: meta.description })
  return (
    <section className="hero">
      <div className="wrap">
        <p className="eyebrow">{site.name} {site.badge}</p>
        <h1>
          One semantic tree. <span className="accent">Two lanes.</span> Four primitives, plus the eyes.
        </h1>
        <p className="lede">
          A UI that is accessible to a person using a screen reader and a UI that
          is accessible to a software agent are the same UI. gamestruct is the small,
          dependency-free contract that serves both from one description: named,
          role-tagged nodes with stable handles, a linear traversal, and an event stream.
        </p>
        <div className="cta-row">
          <a className="btn btn-primary" href={site.repo}>See the repo</a>
          <a className="btn btn-ghost" href={`${site.docs.url}/`}>Read the docs</a>
        </div>
        <pre className="code"><span className="cm"># one tree, both audiences</span>{'\n'}human.<span className="k">a11yDump</span>(bridge)   <span className="cm"># what a screen reader reads</span>{'\n'}agent.<span className="k">toolCatalog</span>(bridge)  <span className="cm"># what an MCP client auto-wires</span>{'\n'}<span className="k">await</span> bridge.<span className="k">act</span>(<span className="cm">'ui:start'</span>) <span className="cm"># one code path</span></pre>
      </div>
    </section>
  )
}
