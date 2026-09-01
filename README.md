# Fantasy Assistant

A mobile-first fantasy-football PWA designed to help users make three decisions better:

1. Draft the best player for their roster and league settings.
2. Set the strongest weekly lineup.
3. Find the best available waiver-wire upgrades.

Phase 0 establishes the product foundation and a Cloudflare-ready interactive dashboard. All football data in this phase is sample data; the interface does not read from or write to ESPN.

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
2. Choose **Pages** and connect this GitHub repository.
3. Use these build settings:
   - Framework preset: `Vite`
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: `/`
4. Deploy. No environment variables are required for Phase 0.

The included `wrangler.jsonc` enables Cloudflare Workers Static Assets and serves `index.html` for client-side routes through `not_found_handling: "single-page-application"`.

## Product boundaries

- ESPN credentials and private session cookies must never be collected.
- Phase 0 makes no claims that sample recommendations are live or personalized.
- A production data provider and recommendation service will be selected before real rankings are introduced.
- Recommendations will remain advisory until an authorized league write integration is available.

See [docs/PHASE_0.md](docs/PHASE_0.md) for architecture, design-system, and completion details.
