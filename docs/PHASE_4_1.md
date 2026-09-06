# Phase 4.1 — Waiver Wire Foundation

Phase 4.1 replaces the static waiver preview with a read-only waiver workspace. It ranks unrostered players from the active draft-ranking data set against the currently loaded roster and explains each possible add/drop decision.

## Recommendation model

Each candidate receives:

- A local weekly estimate derived from season projections when present, with a position-aware rank fallback for imports that contain rank/ADP but no projections.
- A modeled floor, ceiling, and risk level from the Phase 3.4 decision model.
- A projected roster-value gain versus a safe drop candidate, the weakest same-position player when a roster spot is open, or zero when the roster lacks that position entirely.
- A priority, upgrade, or watch label.
- Plain-language reasons that disclose the data source and availability boundary.

The engine excludes normalized name matches already on the loaded roster. When the roster is full, it favors bench drops and never cuts below the minimum of one QB, two RBs, two WRs, one TE, one K, and one D/ST.

## Availability boundary

Phase 4.1 does not claim that a ranking candidate is available in the user's ESPN league. The current public ESPN roster sync does not supply a verified free-agent pool. Every candidate therefore displays **availability unverified** and directs the user to confirm the player in ESPN.

The local claim plan is a browser-only shortlist. It never submits an add, drop, waiver claim, bid, or lineup change to ESPN.

## User experience

- The Waivers navigation item opens a dedicated responsive workspace.
- The dashboard preview uses the same recommendation engine instead of static availability percentages.
- Search, position, and upgrades-only filters compose without changing the underlying ranking.
- Selecting a candidate reveals the modeled range, add/drop pairing, projected roster gain, and transparent reasons.
- Candidates can be saved to a local claim plan.

## QA coverage

Deterministic tests cover roster exclusion, safe drop rules, open roster spots, ranking order, unverified availability labels, and combined filters.

Run the focused check with:

```bash
npm run test:waivers
```

The rendered QA flow is:

`Waivers → inspect the top recommendation → filter by position → search for a player → add/remove a claim-plan target → verify desktop and mobile readability`
