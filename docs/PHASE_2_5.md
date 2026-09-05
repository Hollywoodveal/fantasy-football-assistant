# Phase 2.5 — Smarter Draft Recommendations

## Goal

Turn the recommendation card into a transparent draft decision tool. Managers see three viable choices, why each player scores well or poorly, whether the player may survive until the manager's next pick, and whether a recent position run should change the decision.

## Recommendation intelligence

- Ranking remains the starting point and lower ADP remains better.
- ADP value rewards players who fall beyond their expected draft position and penalizes early reaches.
- Roster need, positional scarcity, and scoring-format fit remain explicit score components.
- Round-aware planning favors core RB and WR starters early, increases pressure to fill open starters later, and reserves kicker and defense priority for the final rounds.
- Live injury and availability states reduce the score for questionable, doubtful, out, inactive, suspended, PUP, NFI, and injured-reserve players.
- Three or more selections at one position within the last six picks trigger a position-run alert and a small scarcity adjustment.

## Draft-room guidance

- The top three recommendations remain visible below the primary recommendation.
- Selecting a top choice updates the full player card without changing the draft-board sort.
- Every top choice states whether it is unlikely, at risk, or reasonably likely to reach the manager's next scheduled snake-draft pick.
- An expandable score breakdown shows every non-zero positive and negative factor.
- Availability guidance is directional and does not claim a precise probability.

## Completion criteria

- Pick-one rankings continue to favor elite players rather than high ADP numbers.
- Top-three choices update after every manager or opponent pick.
- Injury states, late-round roster needs, duplicate-quarterback restraint, and kicker/defense timing affect the visible score.
- Position runs are detected from recent recorded picks and surfaced in the draft room.
- Next-pick guidance uses the configured snake order.
- Type checking, linting, recommendation tests, production build, Worker dry-run, and rendered interaction QA pass.
