# Fantasy Assistant

A mobile-first fantasy-football PWA designed to help users make three decisions better:

1. Draft the best player for their roster and league settings.
2. Set the strongest weekly lineup.
3. Find the best available waiver-wire upgrades.

Phase 0 established the product foundation and Cloudflare-ready interactive dashboard. Phase 1 added a privacy-safe ESPN-compatible league setup and roster import. Phase 2 adds a local-first live draft assistant that works before the user has a roster. Rankings remain demonstration data; the interface does not sign in to or write to ESPN.

## Phase 0 includes

- Responsive mobile and desktop application shell
- Weekly matchup and projection overview
- Interactive lineup recommendation preview
- Waiver-target ranking preview
- Draft-room setup preview
- Installable offline-ready PWA configuration
- Accessible controls, reduced-motion support, and touch-friendly mobile navigation
- Cloudflare Pages and Workers static-asset configuration
- Product and data-boundary documentation

## Phase 1 includes

- Three-step ESPN-compatible league setup
- League name, team name, scoring, team count, season, and optional league ID
- Roster paste import using pipe, comma, tab, or space-delimited rows
- Local TXT and CSV file import
- Parsed-player review with starter and bench totals
- Line-level validation and duplicate-player handling
- Versioned browser storage with no account, password, or private ESPN cookie collection
- Imported team and league context across the dashboard and settings

## Phase 2 includes

- Pre-draft setup for scoring, team count, draft position, and roster construction
- Snake-draft pick-order awareness and on-the-clock status
- Best-available rankings that adjust to position needs, roster depth, ADP value, and scoring format
- Manual **Draft to my team** and **Taken by another team** controls for following an ESPN draft
- Search and position filters
- Filled/open roster-slot tracking
- Undo, guarded reset, settings editing, and automatic browser persistence
- Responsive desktop and mobile draft-room layouts
- Clear demonstration-data labeling until a production player-data provider is connected

## Local development

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Quality checks

```bash
npm run typecheck
npm run lint
npm run build
npm run preview
```

## Import into Cloudflare

1. In Cloudflare, open **Workers & Pages** and choose **Create application**.
2. Import this GitHub repository as a Worker.
3. Use these build settings:
   - Build command: `npm run build`
   - Deploy command: `npx wrangler deploy`
   - Root directory: `/`
4. Deploy. No environment variables are required through Phase 2.

The included `wrangler.jsonc` enables Cloudflare Workers Static Assets and serves `index.html` for client-side routes through `not_found_handling: "single-page-application"`.

## Product boundaries

- ESPN credentials and private session cookies must never be collected.
- League, roster, and draft-session data is supplied by the user and stored only in browser local storage.
- The app makes no claim that sample recommendations are live or personalized.
- A production data provider and recommendation service will be selected before real rankings are introduced.
- Recommendations will remain advisory until an authorized league write integration is available.

See [docs/PHASE_0.md](docs/PHASE_0.md) for the product foundation, [docs/PHASE_1.md](docs/PHASE_1.md) for league-import architecture, and [docs/PHASE_2.md](docs/PHASE_2.md) for the draft-assistant design and boundaries.
