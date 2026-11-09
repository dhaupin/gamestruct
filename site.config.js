/**
 * site.config.js - THE site identity, authored once, read everywhere.
 *
 * Follows the coreforge house template: this is the one file an adopter edits
 * for identity. The docs rig derives `docs/_config.yml` + the nav from it.
 *
 * Named site.config.js, not gamestruct.config.js, on purpose: the config is
 * named for the CONCERN (the site), never the tool.
 */
export default {
  // --- identity -----------------------------------------------------------
  name: 'gamestruct',
  wordmark: { accent: 'game', rest: 'struct' },
  badge: 'v0.1',
  tagline: 'One semantic tree. Two lanes. Four primitives.',
  description:
    'The game-agent lane bridge: one semantic tree serves both a human\'s assistive technology and a machine agent. Accessibility for people and for agents, from one contract.',
  url: 'https://gamestruct.creadev.org',
  repo: 'https://github.com/dhaupin/gamestruct',
  author: 'dhaupin',
  license: 'MIT',
  keywords:
    'accessibility, a11y, agents, mcp, aria, screen-reader, game, bridge, contract',

  // The maker line + org (footer + the docs layout's provenance row).
  maker: { label: 'Rook @ Creadev.org', url: 'https://creadev.org' },
  org: { name: 'Creadev.org', url: 'https://creadev.org' },

  // --- docs ---------------------------------------------------------------
  docs: {
    title: 'gamestruct docs',
    url: 'https://docs.creadev.org/gamestruct',
    host: 'https://docs.creadev.org',
    baseurl: '/gamestruct',
  },

  // --- theme --------------------------------------------------------------
  theme: {
    themeKey: 'site-theme',
    schemeKey: 'site-paint-scheme',
    defaultMode: 'dark',
    defaultScheme: 'petrol',
  },

  // --- nav vocabulary -----------------------------------------------------
  nav: [
    { label: 'Home', to: '/', end: true, group: 'site' },
    { label: 'Start', to: '/start', group: 'site' },
    { label: 'Why', to: '/why', group: 'site' },
    { label: 'What', to: '/what', group: 'site' },
    { label: 'About', to: '/about', group: 'site', header: false },
    { label: 'Status', to: '/status', group: 'site' },
    { label: 'GitHub', href: 'https://github.com/dhaupin/gamestruct', group: 'out' },
  ],
  footerExtras: [
    { label: 'Terms', href: '/terms' },
    { label: 'Privacy', href: '/privacy' },
  ],

  // --- routes -------------------------------------------------------------
  routes: [
    {
      path: '/',
      priority: '1.0',
      changefreq: 'monthly',
      meta: {
        title: 'gamestruct - the game-agent lane bridge',
        description:
          'One semantic tree, two lanes, four primitives: accessibility for people and for agents, from one contract.',
      },
    },
    {
      path: '/start',
      priority: '0.9',
      changefreq: 'monthly',
      meta: {
        title: 'Start here | gamestruct',
        description:
          'New to gamestruct? Build one semantic tree, wire a handler, and read it through both lanes - the beginner on-ramp, no prior knowledge assumed.',
      },
    },
    {
      path: '/why',
      priority: '0.7',
      changefreq: 'monthly',
      meta: {
        title: 'Why | gamestruct',
        description:
          'A screen reader and a machine agent fail on the same UI. Why one semantic tree serves both lanes - accessibility and an agent surface are one absence.',
      },
    },
    {
      path: '/what',
      priority: '0.7',
      changefreq: 'monthly',
      meta: {
        title: 'What | gamestruct',
        description:
          'One zero-dependency library, four primitives, two lanes, one tree. What ships in the box, and the smallest surface a door and a client share.',
      },
    },
    {
      path: '/about',
      priority: '0.5',
      changefreq: 'monthly',
      meta: {
        title: 'About | gamestruct',
        description:
          'Who builds gamestruct, the struct family it belongs to, the MIT license, and the provenance terms.',
      },
    },
    {
      path: '/status',
      priority: '0.5',
      changefreq: 'weekly',
      meta: {
        title: 'Live status | gamestruct',
        description:
          'The bridgeworks verdicts on main, read straight from the committed battery - the same files a fresh agent session owns. No server, no hidden state.',
      },
    },
    {
      path: '/terms',
      priority: '0.3',
      changefreq: 'yearly',
      meta: {
        title: 'Terms | gamestruct',
        description:
          'Terms of use for gamestruct, the open-source game-agent lane bridge, and for this documentation site. MIT licensed, provided as-is.',
      },
    },
    {
      path: '/privacy',
      priority: '0.3',
      changefreq: 'yearly',
      meta: {
        title: 'Privacy | gamestruct',
        description:
          'What this site collects: nothing hidden. No analytics, no tracking, no cookies beyond your local theme choice, which never leaves your browser.',
      },
    },
  ],

  notFound: {
    heading: '404',
    body: 'That page does not exist here.',
    primaryCta: { label: 'Back home', href: '/' },
  },
}
