# Phase 0 — Product Foundation

## Goal

Create a stable, installable, visually complete foundation that can be deployed from GitHub to Cloudflare before live league data is introduced.

## User promise

Fantasy Assistant will explain the best available move for a user's specific league and roster. It will not reduce a recommendation to a generic player ranking.

## Core decision surfaces

### Draft Assistant

Future recommendations will combine projected value, positional scarcity, roster construction, tier drop-off, scoring rules, bye-week exposure, upside, and risk.

### Lineup Optimizer

Future recommendations will compare eligible starters using projection, floor, ceiling, opportunity, matchup, injury status, weather, and user-selected risk preference.

### Waiver Scout

Future recommendations will rank only players available in the user's league and show expected roster improvement, suggested drop, claim priority, and eventual FAAB guidance.

## Phase 0 architecture

| Layer | Phase 0 choice | Reason |
|---|---|---|
| Frontend | React + TypeScript + Vite | Fast, modular PWA foundation |
| Styling | Shared CSS design tokens | Exact control of the accepted product design |
| Icons | Lucide React | Consistent accessible UI icon family |
| Offline | Vite PWA + Workbox | Installable shell and cached production assets |
| Hosting | Cloudflare Pages or Workers static assets | Git-backed deployment and global edge delivery |
| Data | Typed local sample data | Safe UI development before provider selection |
| State | Local React state | Sufficient for the Phase 0 interaction demo |

## Design system

- Background: near-black navy (`#06131f`)
- Primary surface: steel navy (`#0a1c2c`)
- Recommendation accent: electric lime (`#b8ff39`)
- Secondary action: cool blue (`#64a7ff`)
- Display type: Barlow Condensed
- UI type: Inter
- Container model: open dashboard canvas with restrained panels and compact data rows
- Mobile navigation: fixed five-item bottom bar
- Desktop navigation: fixed left rail

## Implemented interactions

- Change the selected fantasy week.
- Review and apply lineup changes to a local preview.
- See the projected matchup total update after optimization.
- Review five ranked waiver targets with rationale.
- Open the draft setup preview.
- Navigate to the lineup, draft, and waiver sections.
- Open league/profile settings.

## Data integration boundary

The first ESPN-compatible release should use user-supplied roster information through structured selection, paste, or screenshot recognition. It must not request an ESPN password or private cookie. All sample data used in Phase 0 is representative but not live — users will see a clear disclaimer that the app does not yet read from their actual ESPN league.

## Accessibility & mobile support

- All interactive elements keyboard-accessible with visible focus states (lime outline).
- Reduced-motion support via `prefers-reduced-motion` media query.
- ARIA labels on icons, semantic HTML, and screen reader optimizations.
- Touch-friendly sizing (minimum 48px tap targets on mobile).
- Responsive typography and layout (mobile-first, scales to desktop 1320px).
- PWA installable on iOS and Android with app-like navigation and offline shell.

## Exit criteria

- ✅ Production build succeeds.
- ✅ TypeScript and lint checks succeed.
- ✅ PWA manifest, service worker, and install icons are emitted.
- ✅ Mobile and desktop layouts match the accepted visual direction.
- ✅ Core local interactions work by keyboard and pointer.
- ✅ The GitHub repository imports into Cloudflare with `npm run build` and output directory `dist`.

## Next phases

**Phase 1** will add ESPN integration to accept user rosters (via league ID, paste, or screenshot).

**Phase 2** will select and integrate a live data provider (player projections, injury reports, bye weeks).

**Phase 3** will implement the recommendation engine with league-aware, user-personalized scoring logic.

## Running Phase 0

```bash
npm install
npm run dev          # Local dev with Vite HMR
npm run build        # Production bundle
npm run preview      # Test production build locally
npm run typecheck    # TypeScript validation
npm run lint         # ESLint validation
npm run deploy       # Deploy to Cloudflare (requires wrangler auth)
```

Deployed at: [Cloudflare Pages URL will be added after deployment]
