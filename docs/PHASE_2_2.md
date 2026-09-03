# Phase 2.2 — Full Draft Data Workflow

## Goal

Make production-sized ranking imports safer and faster without claiming that bundled demonstration rankings are current. A manager can bring an authorized ESPN-, FantasyPros-, or custom CSV export into the draft room and immediately understand whether it is complete enough to use.

## Import intelligence

- Detect comma, tab, and pipe-delimited files.
- Accept common provider aliases for player, position, rank, projection, ADP, tier, team, bye, and notes.
- Treat rank as optional and infer it from row order.
- Normalize position suffixes such as `RB1` and defense labels such as `DEF` and `DST`.
- Extract team and bye from combined values such as `Player Name (ATL 12)` when separate columns are absent.
- Generate stable player IDs from name and position so re-imported favorites and notes remain attached.
- Surface errors and suggested corrections by line.

## Data readiness

The preview reports mapped columns, delimiter, projection coverage, position counts, skipped rows, and whether the pool covers every scheduled draft pick. Rankings older than 14 days display a freshness warning.

## Personal draft board

Managers can filter by tier, show only favorites, star players from the table or recommendation card, and save a private note for any selected player. These preferences use a separate versioned local-storage record and never leave the browser.

## Data boundary

Phase 2.2 supports 250–350+ player imports but does not bundle invented live rankings. The built-in 41-player pool remains explicitly marked as demonstration data. Current rankings must come from a user-authorized export until a licensed server-side provider is connected.

## Completion criteria

- Provider-style headers map without manual reformatting.
- PPR, Half PPR, and Standard scoring values are accepted and influence recommendations.
- Full/quarterback/defense position variants normalize correctly.
- Full-pool coverage and stale-data warnings are visible.
- Favorites, tier filters, and notes work without affecting draft picks.
- Preferences persist after reload.
- Type checking, linting, production build, and live interaction QA pass.
