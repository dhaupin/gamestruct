/**
 * pages/About.jsx - who builds gamestruct, the struct family it belongs to,
 * and the MIT license terms. Shell conventions kept (usePageMeta in the body).
 */
import { Link } from 'react-router-dom'
import usePageMeta from '../hooks/usePageMeta.js'
import site, { routeMeta } from '../site.js'

const FAMILY = [
  { name: 'packstruct', what: 'the shared /packs spec + lint CLI', href: 'https://github.com/dhaupin/packstruct' },
  { name: 'crashtest', what: 'the adversarial lane', href: 'https://github.com/dhaupin/crashtest' },
  { name: 'eyestruct', what: 'the committed visual memory', href: 'https://github.com/dhaupin/eyestruct' },
  { name: 'poststruct', what: 'the baked-artifact audit', href: 'https://github.com/dhaupin/poststruct' },
  { name: 'govstruct', what: 'the family governance layer', href: 'https://github.com/dhaupin/govstruct' },
  { name: 'monoforge', what: 'the factory that stamps new members', href: 'https://github.com/dhaupin/monoforge' },
]

export default function About() {
  const meta = routeMeta('/about')
  usePageMeta({ siteUrl: site.url, path: '/about', title: meta.title, description: meta.description })
  return (
    <>
      <section className="hero">
        <div className="wrap">
          <p className="eyebrow">about</p>
          <h1>
            One arm of <span className="accent">the struct family.</span>
          </h1>
          <p className="lede">
            gamestruct is built by Rook @ Creadev.org and by AI agents working
            in the open. Every change lands with its gates run, and the repo
            history keeps the receipts.
          </p>
          <div className="cta-row">
            <a className="btn btn-primary" href={site.repo}>See the repo</a>
            <a className="btn btn-ghost" href={site.maker.url}>Creadev.org</a>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <h2>The struct family</h2>
          <p className="sub">
            Small, zero-dependency tools that keep a suite of repos honest
            about itself. The family shares one status contract and one pack
            grammar, so a disagreement is provable, not debated.
          </p>
          <div className="table-wrap">
            <table className="attacks">
              <thead>
                <tr><th>member</th><th>what it carries</th></tr>
              </thead>
              <tbody>
                {FAMILY.map((f) => (
                  <tr key={f.name}>
                    <td><a href={f.href} target="_blank" rel="noreferrer">{f.name}</a></td>
                    <td>{f.what}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="sub" style={{ marginTop: 18 }}>
            gamestruct is the family's lane bridge: the contract between a game
            world (a door) and an agent brain (a client). Its first consumers
            are <a href="https://github.com/dhaupin/synmergia" target="_blank" rel="noreferrer">synmergia</a> (the
            world) and <a href="https://github.com/dhaupin/vant" target="_blank" rel="noreferrer">vant</a> (the brain).
          </p>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <h2>License and provenance</h2>
          <p className="sub">
            gamestruct is MIT-licensed. The library and the site are both open
            source, so the honest summary is: read the code.
          </p>
          <div className="cta-row">
            <a className="btn btn-ghost" href="https://github.com/dhaupin/gamestruct/blob/main/LICENSE">MIT License</a>
            <a className="btn btn-ghost" href="https://github.com/dhaupin/gamestruct/blob/main/SPEC.md">SPEC.md</a>
            <Link className="btn btn-ghost" to="/status">Family status</Link>
          </div>
        </div>
      </section>
    </>
  )
}
