# Fantasy Assistant

A mobile-first fantasy-football PWA designed to help users make three decisions better:

1. Draft the best player for their roster and league settings.
2. Set the strongest weekly lineup.
3. Find the best available waiver-wire upgrades.

Phase 0 established the product foundation and Cloudflare-ready interactive dashboard. Phase 1 added a privacy-safe ESPN-compatible league setup and roster import. Phase 2 adds a local-first live draft assistant that works before the user has a roster. Phase 2.1 introduced custom rankings, and Phase 2.2 adds provider-friendly mapping, data-quality feedback, favorites, tiers, and private player notes; the interface does not sign in to or write to ESPN.

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

## Phase 2.1 includes

- Custom ranking CSV paste and local file import
- Flexible column aliases for common rank, player, position, team, bye, projection, ADP, tier, and notes fields
- Quoted CSV value support, position normalization, duplicate handling, and row-level validation
- Import preview with valid-player and projection totals
- Versioned browser persistence and source/freshness labels
- A downloadable CSV template
- Safe ranking replacement lock after the first draft pick
- Provider-ready data boundaries without placing API keys in client code

## Phase 2.2 includes

- ESPN- and FantasyPros-style header aliases with automatic comma, tab, or pipe detection
- Optional rank columns, position suffix cleanup, combined player/team/bye parsing, and stable player IDs
- Import summaries for mapped columns, projections, positional depth, errors, and full-draft coverage
- Actionable row-level correction suggestions instead of silent skips
- Ranking freshness warnings after 14 days
- Tier and favorites-only draft-board filters
- Persistent player favorites and private notes stored only in the browser
- Recommendation scoring coverage for PPR, Half PPR, and Standard leagues
- Production-sized CSV support without fabricating current rankings in the built-in demo

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
- Built-in rankings are demonstration data; imported rankings retain the user-entered provider name and update date.
- A production data provider and recommendation service will be selected before real rankings are introduced.
- Recommendations will remain advisory until an authorized league write integration is available.

See [docs/PHASE_0.md](docs/PHASE_0.md) for the product foundation, [docs/PHASE_1.md](docs/PHASE_1.md) for league-import architecture, [docs/PHASE_2.md](docs/PHASE_2.md) for the draft assistant, and [docs/PHASE_2_2.md](docs/PHASE_2_2.md) for the smart-import and personalization design.
