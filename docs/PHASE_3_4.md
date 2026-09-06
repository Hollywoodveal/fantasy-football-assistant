# Phase 3.4 — Smarter Start/Sit Recommendations

Phase 3.4 turns the weekly lineup optimizer into a transparent decision tool. It keeps ESPN's weekly projection as the primary signal, then adds modeled range, availability risk, data confidence, and a projection-based matchup outlook for close start/sit calls.

## Decision model

Each supported roster player receives:

- A weekly projection from ESPN when available, otherwise the existing local ranking or positional estimate.
- A position-aware modeled floor and ceiling around that projection.
- A 0–100 risk score and low, medium, or high label.
- A favorable, neutral, tough, or pending ESPN-adjusted outlook.
- A risk-adjusted decision score used only when raw projections are within 1.5 points.

The risk score combines positional volatility, injury availability, weekly-data confidence, projection source, and missing schedule context. Out, IR, and bye players remain excluded. A clearly superior projection stays ahead even when its risk is higher; the safer option can win only a close projection decision.

## Matchup boundary

The public ESPN roster response does not provide a licensed defense-versus-position ranking. The app therefore does not fabricate one. Its outlook compares ESPN's matchup-aware weekly projection with the app's neutral local baseline:

- At least 1.5 points above baseline: favorable.
- At least 1.5 points below baseline: tough.
- Inside that band: neutral.
- Missing ESPN projection or opponent: pending.

Every label is presented as an ESPN-adjusted outlook rather than an opponent defensive grade.

## User experience

- Recommended moves say exactly whom to start and sit.
- Each move explains projection tradeoffs, modeled range, outlook, floor improvement, and risk reduction when applicable.
- Player rows expose risk, outlook, projection source/confidence, and floor-to-ceiling range.
- The lineup summary compares current and recommended projections, total floor/ceiling, and average risk.
- The preview remains local and never changes the ESPN lineup.

## QA coverage

Deterministic tests cover:

1. ESPN-adjusted outlook direction and range boundaries.
2. Injury uncertainty increasing risk and lowering floor.
3. A safer player winning a close projection decision.
4. A clearly superior projection remaining in the lineup.
5. Existing slot eligibility, duplicate prevention, IR/out/bye exclusions, and ESPN projection precedence.

Run the focused checks with:

```bash
npm run test:lineup
npm run test:weekly
```

The rendered QA flow is:

`Lineup → review risk-adjusted range → inspect start/sit reasons → preview recommended lineup → verify desktop and mobile readability → reset preview`
