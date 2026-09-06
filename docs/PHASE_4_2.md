# Phase 4.2 — Verified Waiver Availability & Claim Strategy

Phase 4.2 turns the Phase 4.1 candidate board into a league-aware planning workspace. It verifies which ranking candidates are absent from every roster in a connected public ESPN league, then helps the manager order claims without changing ESPN.

## Availability contract

The Cloudflare Worker requests ESPN's public `mSettings`, `mTeam`, and `mRoster` views for the connected league. The app normalizes supported QB, RB, WR, TE, K, and D/ST roster entries across every returned fantasy team.

A candidate receives **Verified unrostered** only when:

1. The response belongs to the connected league, season, and selected team.
2. ESPN returns at least one valid fantasy team.
3. The candidate's normalized name and position—or NFL team for D/ST—is absent from the complete returned roster set.

If the request fails, the league becomes private, the selected team is missing, or the response is unsupported, the board falls back to **Unverified**. A failed refresh never promotes a player to verified status.

Verified unrostered does not mean a player has cleared waivers, is immediately addable, or is guaranteed to remain available. The snapshot is timestamped, cached briefly, and must be rechecked in ESPN before a claim is submitted.

## API

`GET /api/espn/waiver-availability?leagueId={id}&season={year}&teamId={id}`

- Public, read-only ESPN roster request
- 60-second edge cache and 30-second browser cache
- `refresh=1` bypasses the cached read and replaces the canonical snapshot
- Sanitized private-league, missing-league, provider, and invalid-response errors
- No ESPN credentials, cookies, passwords, write tokens, or transaction endpoints

The normalized response includes league identity, snapshot time, team/player coverage, rostered players, and available FAAB or waiver-priority settings when ESPN exposes them.

## Claim strategy

The claim plan uses only the manager's browser-local shortlist and the deterministic Phase 4.1 recommendation board.

- Board order determines claim order.
- Claims that would drop the same player are grouped as primary and backup options.
- FAAB leagues receive bounded bid suggestions of 1–35% of the remaining budget, adjusted by recommendation priority, modeled roster gain, and risk.
- Priority leagues receive ordered-claim guidance and the current waiver rank when available.
- Missing budget data is shown as a percentage, never fabricated as a dollar amount.
- The app never submits, schedules, or modifies an ESPN transaction.

## Failure behavior

- Cached snapshots remain visible while a refresh is in progress.
- If a refresh fails, the candidate engine does not use the stale response as fresh verification for a different league, season, or team.
- Without a matching snapshot, rostered-player exclusion returns to the local-roster-only Phase 4.1 behavior and every result is explicitly unverified.
- Claim plans remain advisory and local even when ESPN verification succeeds.

## QA coverage

Deterministic tests cover input validation, all-team roster normalization, unsupported-position filtering, FAAB budget math, priority fallback, selected-team rejection, cross-roster candidate exclusion, D/ST alias matching, verified labels, claim ordering, backup grouping, and bounded bid calculations.
