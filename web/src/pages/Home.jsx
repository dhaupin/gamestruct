/**
 * pages/Home.jsx - the gamestruct landing (the marketing pitch).
 *
 * The one-liner: one semantic tree serves a person's assistive technology AND
 * a machine agent. This page sells that to four readers at once - the game dev
 * deciding whether to adopt it, the player who uses assistive tech, the studio
 * lead asking why it matters, and the agent engineer wiring a brain. Every
 * claim links to a receipt.
 *
 * Shell conventions kept: usePageMeta lives in the component BODY (calling it
 * inside another effect was an invalid hook call - React #321 tore the tree
 * down; keep it here). The .code pre carries the token classes the docs Rouge
 * output shares (.k/.cm/.gp); CTAs compose .btn + a color modifier.
 */
import { Link } from 'react-router-dom'
import usePageMeta from '../hooks/usePageMeta.js'
import site, { routeMeta } from '../site.js'

const NPM = 'https://www.npmjs.com/package/gamestruct'

/** One "who it is for" card (an audience + the payoff). */
const AUDIENCE = [
  {
    glyph: '◧',
    title: 'Players who use assistive tech',
    body: 'Screen reader, switch, voice control, a terminal - every control gets a role, an accessible name, and a stable handle. Your game stops being silent to the people who need it most.',
  },
  {
    glyph: '◨',
    title: 'Agents and AI players',
    body: 'One MCP tool per actionable node, each with an inputSchema, so a brain auto-wires with no bespoke glue. The same act() the human lane uses - never a second protocol.',
  },
  {
    glyph: '⌘',
    title: 'Game developers',
    body: 'Write one function that maps your state to a tree. Accessibility and an agent surface fall out of the same description, so there is nothing to keep in sync and nothing to rot.',
  },
  {
    glyph: '⇄',
    title: 'Studios and live-ops',
    body: 'One contract across every surface - menus, kiosks, dashboards, forms. Prove a disagreement with the committed battery instead of debating it, and ship the same lane to every title.',
  },
]

/** The four primitives + the optional eyes. */
const PRIMITIVES = [
  { glyph: '1', name: 'observe', sig: '() -> Snapshot', what: "the surface's state for this seat" },
  { glyph: '2', name: 'act', sig: '(handle, verb?, value?) -> Result', what: 'do one thing, by stable handle' },
  { glyph: '3', name: 'wait_for', sig: '(predicate, timeoutMs) -> Outcome', what: 'resolve when a condition holds, or time out honestly' },
  { glyph: '4', name: 'events', sig: '(sinceFrame) -> { frame, events[] }', what: 'what changed while you were not looking' },
  { glyph: '◉', name: 'see', sig: '(opts?) -> Capture', what: "the eyes (optional): a frame for an agent's own vision; a blind surface refuses honestly" },
]

/** The four-step adoption path. */
const STEPS = [
  { n: '01', title: 'Describe', body: 'Build a tree from your existing state. A node carries a handle, a role, an accessible name, and the verbs it accepts.' },
  { n: '02', title: 'Wire', body: 'Register one handler per actionable handle. The verb is what the node declares - activate for a button, set_value for a slider.' },
  { n: '03', title: 'Mount a binding', body: 'Expose the tree over HTTP or MCP in one line. A screen reader reads it; an MCP client auto-wires from it. Same tree, both.' },
  { n: '04', title: 'Gate it', body: 'Run the a11y audit in CI. It flags the failures that actually break a screen reader - an unnamed button, an actionless control.' },
]

/** Why a dev adopts it (the auto-a11y pitch). */
const WHY_ADOPT = [
  { glyph: '◍', title: 'Auto a11y, not a bolt-on', body: 'Accessibility that is a separate feature drifts from the real UI the day someone forgets to update both. Here there is one tree, so there is nothing to drift from.' },
  { glyph: '◧◨', title: 'Two lanes, one code path', body: 'The human lane and the agent lane are two renderings of one description - same nodes, same handles, same act(). Guard that and the whole product holds.' },
  { glyph: '⬡', title: 'Adapters for your engine', body: 'A game does not rewrite itself. Write one adapter that maps your world to the tree; reference adapters for a Godot world (synmergia), a DOM, and a plain form ship in the box.' },
  { glyph: '⌁', title: 'Zero dependencies', body: 'Plain ESM, Node 18+, no build step. fetch is the only global it leans on. Drop it into a game server, a browser tab, or a Worker.' },
  { glyph: '⊞', title: 'MCP out of the box', body: 'The agent lane is an MCP tool catalog plus a JSON-RPC binding. Your game becomes operable by any MCP client with no protocol work on your side.' },
  { glyph: '✓', title: 'Receipts, not claims', body: 'Every rule in the spec has a test. gamestruct check runs the battery; the family status page shows the verdicts straight from the committed files.' },
]

export default function Home() {
  const meta = routeMeta('/')
  usePageMeta({ siteUrl: site.url, path: '/', title: meta.title, description: meta.description })
  return (
    <>
      {/* ---- hero ------------------------------------------------------- */}
      <section className="hero">
        <div className="wrap">
          <p className="eyebrow">
            {site.name} {site.badge} <span className="dot">·</span> MIT <span className="dot">·</span> zero dependencies
          </p>
          <h1>
            One tree. <span className="accent">Two lanes.</span><br />
            Every player, every agent.
          </h1>
          <p className="lede">
            A UI a person can drive with a screen reader and a UI an AI agent
            can drive are the <strong>same</strong> UI. gamestruct is the small
            contract that serves both from one description - so accessibility
            and an agent surface stop being two features you have to build,
            and become one you already did.
          </p>
          <div className="cta-row">
            <a className="btn btn-primary" href={`${site.docs.url}/start/`}>Start in five minutes</a>
            <a className="btn btn-ghost" href={NPM}>Install from npm</a>
            <a className="btn btn-ghost" href={site.repo}>See the repo</a>
          </div>
          <pre className="code"><span className="gp">$</span> npm i gamestruct{'\n\n'}<span className="cm">// one tree, both audiences</span>{'\n'}human.<span className="k">a11yDump</span>(bridge)     <span className="cm">// what a screen reader reads</span>{'\n'}agent.<span className="k">toolCatalog</span>(bridge)    <span className="cm">// what an MCP client auto-wires</span>{'\n'}<span className="k">await</span> bridge.<span className="k">act</span>(<span className="cm">'ui:start'</span>)   <span className="cm">// either lane, one code path</span></pre>
          <div className="chips">
            <span className="chip">auto a11y</span>
            <span className="chip">MCP-native</span>
            <span className="chip">screen-reader ready</span>
            <span className="chip">agent-operable</span>
            <span className="chip">engine-agnostic</span>
          </div>
        </div>
      </section>

      {/* ---- the thesis band ------------------------------------------- */}
      <section className="band">
        <div className="wrap">
          <p className="band-line">
            A screen reader, a switch, voice control, and a machine agent all
            fail on the <span className="accent">same</span> UI: buttons with no
            accessible name, state with no text, controls with no stable handle.
            That is not four problems. It is <span className="accent">one missing
            description.</span>
          </p>
        </div>
      </section>

      {/* ---- who it is for --------------------------------------------- */}
      <section className="section">
        <div className="wrap">
          <h2 className="section-title">Who it is for</h2>
          <p className="sub">
            The same tree pays off four ways. Pick the one that is your job.
          </p>
          <div className="grid">
            {AUDIENCE.map((a) => (
              <div className="card" key={a.title}>
                <h3><span className="glyph">{a.glyph}</span>{a.title}</h3>
                <p>{a.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- why it is needed ------------------------------------------ */}
      <section className="section">
        <div className="wrap">
          <h2 className="section-title">Why it is needed</h2>
          <p className="sub">
            Most games ship with no accessibility layer and no agent surface.
            Those look like two gaps. They are one gap, seen from two sides.
          </p>
          <div className="table-wrap">
            <table className="attacks">
              <thead>
                <tr><th>the audience</th><th>what they hit</th><th>what gamestruct gives them</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td className="mod">human lane</td>
                  <td><span className="what">A screen reader hears "button" with no name.</span> <span className="why">It cannot tell what the control does, so the player cannot act.</span></td>
                  <td><span className="shipped">A named, role-tagged node</span> with a linear traversal - exactly what AT expects.</td>
                </tr>
                <tr>
                  <td className="mod">agent lane</td>
                  <td><span className="what">A brain sees pixels with no handle.</span> <span className="why">It cannot find the control, so it cannot act either.</span></td>
                  <td><span className="shipped">An MCP tool per node</span> with an inputSchema - a client auto-wires.</td>
                </tr>
                <tr>
                  <td className="mod">both</td>
                  <td><span className="what">Two separate builds of the same intent.</span> <span className="why">They drift the day someone updates one and not the other.</span></td>
                  <td><span className="shipped">One description, two renderings</span> - there is nothing to drift from.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ---- what you get ---------------------------------------------- */}
      <section className="section">
        <div className="wrap">
          <h2 className="section-title">What you get</h2>
          <p className="sub">
            Four primitives over one semantic tree (plus an optional fifth: the
            eyes), two lanes, two bindings, one contract.
          </p>
          <div className="grid">
            {PRIMITIVES.map((p) => (
              <div className="card" key={p.name}>
                <h3><span className="glyph">{p.glyph}</span>{p.name}</h3>
                <p><code>{p.sig}</code> - {p.what}.</p>
              </div>
            ))}
          </div>
          <div className="grid" style={{ marginTop: 14 }}>
            <div className="card">
              <h3><span className="glyph">◧</span> human lane</h3>
              <p><code>render</code>, <code>a11yDump</code>, <code>audit</code> - the assistive-technology view: roles, accessible names, focus order, live regions.</p>
            </div>
            <div className="card">
              <h3><span className="glyph">◨</span> agent lane</h3>
              <p><code>toolCatalog</code>, <code>affordances</code>, <code>toolCall</code> - one MCP-shaped tool per actionable node, each with an inputSchema.</p>
            </div>
            <div className="card">
              <h3><span className="glyph">⇄</span> the bindings</h3>
              <p>Transport only: <code>bindings/http</code> (<code>/observe</code>, <code>/act</code>, <code>/wait_for</code>, <code>/events</code>, <code>/see</code>, <code>/health</code>, fail-closed auth) and <code>bindings/mcp</code> (JSON-RPC 2.0).</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- how it works ---------------------------------------------- */}
      <section className="section">
        <div className="wrap">
          <h2 className="section-title">How it works</h2>
          <p className="sub">
            Four steps from a running game to a surface both lanes can operate.
          </p>
          <div className="pipeline">
            {STEPS.map((s) => (
              <div className="pipe-step" key={s.n}>
                <span className="pipe-n">{s.n}</span>
                <div>
                  <strong>{s.title}</strong>{' '}
                  <span>{s.body}</span>
                </div>
              </div>
            ))}
          </div>
          <pre className="code" style={{ marginTop: 22 }}><span className="k">import</span> {'{ Bridge, ROLES, human, agent }'} <span className="k">from</span> <span className="cm">'gamestruct'</span>{'\n'}<span className="k">import</span> {'{ createHandler }'} <span className="k">from</span> <span className="cm">'gamestruct/http'</span>{'\n\n'}<span className="cm">// 1 + 2 - describe, then wire</span>{'\n'}<span className="k">const</span> bridge = <span className="k">new</span> Bridge({'{ name: '}<span className="cm">'pause menu'</span>{' }'}){'\n'}bridge.tree.<span className="k">add</span>(<span className="k">null</span>, {'{ id: '}<span className="cm">'ui:start'</span>{', role: ROLES.BUTTON, name: '}<span className="cm">'Start game'</span>{' }'}){'\n'}bridge.<span className="k">on</span>(<span className="cm">'ui:start'</span>, {'{ activate: () => startGame() }'}){'\n\n'}<span className="cm">// 3 - mount the door (a screen reader and an MCP client share it)</span>{'\n'}<span className="k">const</span> door = createHandler(bridge, {'{ token }'}){'\n\n'}<span className="cm">// 4 - gate it in CI</span>{'\n'}<span className="k">const</span> {'{ ok, problems }'} = human.<span className="k">audit</span>(bridge)</pre>
        </div>
      </section>

      {/* ---- auto a11y ------------------------------------------------- */}
      <section className="section">
        <div className="wrap">
          <h2 className="section-title">Accessibility you do not have to maintain</h2>
          <p className="lede" style={{ marginTop: 8 }}>
            An accessibility layer that is a separate feature rots. It drifts
            from the real UI the day someone forgets to update both. gamestruct
            is <strong>one tree</strong>, so there is nothing to drift from:
            describe the surface once and the assistive-technology view falls
            out of the same description the game already drives.
          </p>
          <p className="lede" style={{ marginTop: 8 }}>
            You do not adopt it by rewriting your game. You write one function
            that maps your own state to a tree - then both lanes are two
            renderings of that one function, and the a11y audit is a CI leg
            instead of a launch-week scramble.
          </p>
          <div className="cta-row" style={{ marginTop: 20 }}>
            <Link className="btn btn-primary" to="/start">Start here</Link>
            <a className="btn btn-ghost" href={`${site.docs.url}/human-lane/`}>The human lane</a>
            <a className="btn btn-ghost" href={`${site.docs.url}/why/`}>Why gamestruct</a>
          </div>
        </div>
      </section>

      {/* ---- why devs adopt -------------------------------------------- */}
      <section className="section">
        <div className="wrap">
          <h2 className="section-title">Why devs adopt it in their games</h2>
          <p className="sub">
            Six reasons a game team picks it up - and keeps it.
          </p>
          <div className="grid">
            {WHY_ADOPT.map((w) => (
              <div className="card" key={w.title}>
                <h3><span className="glyph">{w.glyph}</span>{w.title}</h3>
                <p>{w.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- proof / ecosystem ----------------------------------------- */}
      <section className="section">
        <div className="wrap">
          <h2 className="section-title">It is not a game-only idea</h2>
          <p className="sub">
            Born in games (synmergia is the first world), but the contract is
            transport- and surface-agnostic. The reference adapters prove it.
          </p>
          <div className="grid">
            <div className="card">
              <h3><span className="glyph">◈</span> synmergia - the world</h3>
              <p>A Godot MMORPG door: a live world of a player, actions, and events folded into the tree. The first consumer of the world adapter.</p>
            </div>
            <div className="card">
              <h3><span className="glyph">◆</span> vant - the brain</h3>
              <p>The agent brain (a client): it drives any door - in-process, HTTP, or MCP - through the four primitives and never learns whether the world is local.</p>
            </div>
            <div className="card">
              <h3><span className="glyph">▦</span> webform &amp; dom - the receipt</h3>
              <p>A plain HTML form and a live DOM subtree build the same tree the game does. Any surface with a door qualifies - a kiosk, a checkout, a dashboard.</p>
            </div>
          </div>
          <div className="cta-row" style={{ marginTop: 22 }}>
            <a className="btn btn-ghost" href={`${site.docs.url}/adapters/`}>The adapters</a>
            <a className="btn btn-ghost" href={`${site.docs.url}/bindings/`}>The bindings</a>
            <Link className="btn btn-ghost" to="/status">Family status</Link>
          </div>
        </div>
      </section>

      {/* ---- final CTA ------------------------------------------------- */}
      <section className="band band-cta">
        <div className="wrap">
          <h2>Ship one UI. Serve every player - and every agent.</h2>
          <p className="sub">
            Five minutes to a surface both a screen reader and an MCP client can
            operate. MIT-licensed, zero dependencies.
          </p>
          <div className="cta-row">
            <a className="btn btn-primary" href={`${site.docs.url}/start/`}>Read the on-ramp</a>
            <a className="btn btn-ghost" href={NPM}>npm i gamestruct</a>
            <a className="btn btn-ghost" href={site.repo}>GitHub</a>
          </div>
        </div>
      </section>
    </>
  )
}
