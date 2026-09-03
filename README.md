# Fantasy Assistant

A mobile-first fantasy-football PWA designed to help users make three decisions better:

1. Draft the best player for their roster and league settings.
2. Set the strongest weekly lineup.
3. Find the best available waiver-wire upgrades.

Phase 0 established the product foundation and Cloudflare-ready interactive dashboard. Phase 1 adds a privacy-safe ESPN-compatible league setup and roster import stored in the user's browser. Projections and recommendations remain sample data; the interface does not sign in to or write to ESPN.

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
4. Deploy. No environment variables are required for Phase 1.

The included `wrangler.jsonc` enables Cloudflare Workers Static Assets and serves `index.html` for client-side routes through `not_found_handling: "single-page-application"`.

## Product boundaries

- ESPN credentials and private session cookies must never be collected.
- Phase 1 roster data is supplied by the user and stored only in browser local storage.
- The app makes no claim that sample recommendations are live or personalized.
- A production data provider and recommendation service will be selected before real rankings are introduced.
- Recommendations will remain advisory until an authorized league write integration is available.

See [docs/PHASE_0.md](docs/PHASE_0.md) for the product foundation and [docs/PHASE_1.md](docs/PHASE_1.md) for league-import architecture and completion details.
