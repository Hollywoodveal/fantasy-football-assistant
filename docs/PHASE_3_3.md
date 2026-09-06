# Phase 3.3 — Live Weekly Player Intelligence

Phase 3.3 turns a synced public ESPN roster into current-week lineup inputs. It adds live weekly projections, NFL opponents, kickoff and game state, and injury availability without weakening the read-only ESPN boundary.

## What shipped

- A read-only Cloudflare Worker route for week-specific ESPN roster intelligence.
- ESPN weekly projection and actual-point normalization for supported fantasy positions.
- NFL schedule matching with opponent, home/away, kickoff, live, and final states.
- Bye-week detection when ESPN returns a complete weekly scoreboard.
- Injury normalization for active, questionable, doubtful, out, injured reserve, PUP, and suspension labels.
- Coverage counts, timestamps, confidence labels, and short browser/edge cache windows.
- A versioned browser cache that preserves the last successful weekly response during a provider outage.
- Weekly ESPN projections overriding local estimates only when valid values exist.
- Local ranking or deterministic positional estimates retained for every missing projection.
- Out, IR, and bye players excluded from the optimized lineup; questionable and doubtful players remain visible with warnings.
- Refresh, loading, stale-data, manual-roster, and provider-failure states in the weekly optimizer.

## Data and privacy boundary

The browser sends only the saved public League ID, selected ESPN team ID, season, and week to the app's Worker. The Worker uses ESPN's public read-only league and scoreboard responses. It accepts no ESPN password, login code, `SWID`, `espn_s2`, or other private session value, and it never submits lineup changes.

Weekly data is advisory. If ESPN is unavailable, omits a projection, or returns an unsupported field, the engine keeps the user's saved roster and falls back to its existing local estimate. A failed refresh never erases the last successful weekly response.

## QA coverage

Deterministic tests cover:

1. Weekly request validation and provider URL construction.
2. Projection, actual-point, matchup, kickoff, injury, and roster-slot normalization.
3. Coverage and confidence calculation.
4. Injury-label variants.
5. Weekly projection overrides in the lineup engine.
6. Exclusion of unavailable players with an explicit warning.

Run them with:

```bash
npm run test:weekly
npm run test:lineup
```

The rendered QA flow is:

`synced ESPN profile → Lineup → weekly loading state → coverage and freshness → matchup/status rows → optimized preview → refresh → safe cached fallback`
