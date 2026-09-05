# Phase 3.1 — Weekly Lineup Optimizer Foundation

Phase 3.1 introduces the first real weekly lineup workflow. It turns the privacy-safe roster imported in Phase 1 into a legal lineup model and gives the manager a preview of higher-projected assignments before any external action is taken.

## What shipped

- A dedicated **Lineup** navigation surface instead of the dashboard's static preview panel.
- A legal default lineup model: QB, two RB, two WR, TE, FLEX, D/ST, and K.
- Duplicate-player protection while filling position and FLEX slots.
- Comparison of the current Starter rows against all non-IR Starter and Bench rows.
- Recommended bench moves with per-slot projected gains and plain-language reasons.
- Open-slot and IR warnings when the imported roster is incomplete.
- A clearly labeled preview roster for first-run users who have not imported ESPN-compatible rows yet.
- Local projection normalization from built-in ranking data when a player matches, with deterministic positional estimates for unmatched players.
- Preview/reset controls that remain advisory and never write to ESPN.

## Data boundary

The Phase 3.1 engine consumes only the local `LeagueProfile.roster` shape from Phase 1. It does not request ESPN credentials, private cookies, matchup endpoints, or lineup-write permissions. Projection values are explicitly labeled as local estimates in the UI. Live weekly matchup, injury, weather, and game-status inputs are reserved for a later phase.

## QA coverage

The deterministic engine tests cover:

1. Promoting a bench player into an open FLEX slot.
2. Keeping each player assigned at most once across duplicate position slots.
3. Excluding IR players and showing a warning.

Run them with:

```bash
npm run test:lineup
```

The rendered QA flow is:

`app loads → Lineup navigation → optimizer renders → Preview optimized lineup updates assignments → Reset preview restores current assignment`
