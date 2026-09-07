# Phase 4.3 — Smarter Waiver Recommendations

Phase 4.3 turns the verified Phase 4.2 candidate list into a clearer weekly decision tool. It combines roster need, add/drop value, modeled floor and ceiling, current player status, and the selected week's public NFL schedule without claiming that ESPN provides projections for unrostered players.

## Recommendation purposes

Every candidate receives one plain-language purpose:

- **Start now** — meaningful immediate roster lift with acceptable modeled risk.
- **Depth upgrade** — improves the bench without needing to start immediately.
- **Stash** — longer-term upside, a bye week, or elevated uncertainty makes patience more appropriate.
- **Streamer** — short-term QB, K, or D/ST help where conservative spending is preferred.
- **Avoid for now** — unavailable, negative-value, or unsafe add/drop options.

These labels are deterministic decision aids. They do not use hidden AI scoring or fabricate provider projections.

## Weekly context

`GET /api/nfl/waiver-context?season={year}&week={week}`

- Reads ESPN's public NFL scoreboard only.
- Normalizes opponent, home/away, kickoff, and game status for every scheduled team.
- Uses a 15-minute edge cache and a 3-minute browser cache.
- Falls back to season-ranking estimates when the schedule is unavailable.
- Treats a team missing from an otherwise valid weekly schedule as a bye.

Sleeper's existing read-only player metadata supplies current team and injury/status labels. The waiver engine never treats a missing status or matchup as favorable.

## Smarter claim strategy

- Immediate starters receive a modest FAAB urgency adjustment.
- Streamers, stashes, high-risk players, and avoid-now candidates receive conservative bid adjustments.
- Suggested bids remain bounded between 1% and 35% of remaining FAAB.
- Priority and backup claim grouping remains unchanged.
- All claims remain browser-local and advisory; ESPN is never changed.

## Candidate comparison

Managers can compare up to two players side by side using:

- Recommendation purpose
- Selected-week matchup
- Local weekly projection
- Modeled floor and ceiling
- Projected roster lift
- Modeled risk

## Freshness and failure safety

- ESPN roster snapshots older than five minutes show a refresh recommendation.
- Cached weekly schedule context remains visible if a refresh fails.
- Missing schedule or player status data falls back safely and is disclosed in the interface.
- Verified-unrostered labels still require a matching, successful all-team ESPN roster snapshot.

## QA coverage

Deterministic tests cover schedule validation and normalization, missing-schedule failure behavior, recommendation-purpose classification, injury and bye handling, matchup explanations, and purpose-aware FAAB adjustments.
