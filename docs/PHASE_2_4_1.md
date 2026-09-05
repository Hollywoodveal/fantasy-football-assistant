# Phase 2.4.1 — Player Sorting

## Goal

Let a fantasy manager reorganize the available-player board for quick draft-day comparisons while preserving Fantasy Assistant's roster-aware recommendation engine.

## Sort modes

| Mode | Direction | Tie-breaker |
| --- | --- | --- |
| Recommended | Highest recommendation score first | Lowest ADP, then player name |
| Ranking / ADP | Lowest number first | Recommendation order |
| Projected points | Highest total first | Recommendation order |
| Tier | Lowest tier first | Lowest ADP, then player name |
| Player name | A–Z | Recommendation order |
| Team | A–Z | Player name |
| Bye week | Earliest week first | Player name |

## Product behavior

- Recommended remains the default on every draft-room visit.
- Sorting applies after availability, search, position, tier, and favorites filters.
- The visible order number reflects the active board order.
- Sorting does not modify imported rankings, picks, favorites, notes, or the recommendation card.
- Every comparison uses a deterministic tie-breaker to avoid row jitter.

## Completion criteria

- All seven sort modes are available from an accessible labeled control.
- Each mode orders the available board in its documented direction.
- Sort selection works together with every existing board filter.
- Making, undoing, or resetting picks keeps the chosen sort active for the current draft-room visit.
- Type checking, linting, production build, Worker dry-run, and browser interaction QA pass.
