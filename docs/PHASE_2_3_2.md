# Phase 2.3.2 — Draft-Day Release QA

## Goal

Harden the existing draft assistant for real-time use on draft day. This phase does not add another ranking source or change the recommendation model; it removes interaction and recovery risks from the Phase 2.3 experience.

## Release hardening

- Keep the recommendation actions inside their card at standard laptop widths so the primary draft controls remain visible and clickable.
- Preserve the responsive single-column recommendation layout on phones and provide 48-pixel touch targets for draft-room toolbar controls.
- Make the rankings dialog announce its description, focus its close control on open, and close with Escape.
- Cancel the guarded-reset timer when the draft room unmounts so it cannot update stale UI.
- Convert low-level network failures into a clear message that confirms saved rankings remain available.
- Report Phase 2.3.2 from the Worker health route for deployment verification.

## Draft-day QA matrix

- Fresh browser opens the draft setup without requiring an existing roster.
- Setup accepts league, scoring, team-count, draft-position, and roster-slot changes.
- Ranking CSV validation, import, coverage, and replacement locking remain functional.
- Recommendation and table controls can record both manager and opponent picks.
- Undo returns the latest player to the board.
- Draft progress, roster, favorites, notes, and imported rankings survive reload.
- Manual live-data refresh succeeds when online and leaves saved rankings untouched when unavailable.
- Desktop and mobile layouts have no page-level horizontal overflow, clipped controls, or framework error overlays.
- App-origin console output contains no errors during the target flow.

## Completion criteria

- Type checking, linting, production build, and Worker dry-run pass.
- The live deployment reports `2.3.2` from `/api/health`.
- The target draft flow passes in the live browser at desktop and phone widths.
- Any browser, device, or failure state not exercised is listed as remaining risk rather than assumed to pass.

## Deferred work

- Licensed server-supplied rankings, projections, and ADP.
- Authorized ESPN draft synchronization.
- Weekly lineup optimization and waiver analysis, which begin in Phase 3.
