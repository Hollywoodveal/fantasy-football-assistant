# Phase 2.3 — Live Player Data Foundation

## Goal

Add current NFL player metadata to the draft workflow without presenting metadata as rankings. Phase 2.3 keeps the existing local-first ranking model and introduces a narrow Cloudflare Worker API that can be expanded when a licensed ranking and projection provider is selected.

## Provider boundary

The initial adapter uses Sleeper's official, read-only NFL endpoints for non-commercial use. It retrieves player identity, team, availability and injury designations plus the current NFL season and week. Sleeper is not used as the source of rank, projection, ADP, tier, or editorial notes.

Imported CSV rankings remain authoritative. Live data only enriches matching rows and never changes their recommendation inputs. The built-in player pool remains labeled as demonstration data.

## Worker architecture

- `GET /api/live-data` retrieves and normalizes active NFL player metadata.
- `GET /api/health` reports application and phase identity without calling the provider.
- Static application routes continue through the existing `ASSETS` binding.
- Only `/api/*` routes execute the Worker script before static-asset routing.
- Player metadata is cached at the edge for 24 hours, matching Sleeper's guidance to avoid frequent full-player requests.
- Browser responses use a shorter cache window so clients can observe a newly refreshed edge snapshot.
- Provider failures return a structured `502` response and do not delete or replace locally saved rankings.

## Client behavior

- Saved live metadata older than 12 hours triggers one quiet background refresh per app session.
- Managers can explicitly refresh player metadata from the ranking dialog.
- The interface shows source, season, week, refresh time, and match coverage.
- Matched rows receive provider player IDs, current teams, availability, and injury designations.
- Stable local player IDs, favorites, private notes, rankings, projections, ADP, and tiers remain unchanged.
- Existing schema versions migrate to `DraftDataSet` schema version 3 in place.

## Privacy and licensing

- The browser sends no ESPN credential, session cookie, ranking file, roster, or draft history to Sleeper.
- Ranking CSV files remain in browser storage.
- Sleeper attribution and non-commercial-use wording stay visible in the live-data panel.
- A commercial release must confirm provider licensing or replace the adapter.
- Future authenticated provider keys belong in Cloudflare secrets and must never be bundled into client JavaScript.

## Completion criteria

- Worker-first routing handles `/api/*` without breaking the SPA or static assets.
- Provider responses normalize into the versioned live-player schema.
- Name-and-position matching updates metadata without changing ranking values or stable IDs.
- Automatic and manual refreshes preserve the saved draft session.
- Empty, malformed, rate-limited, and unavailable provider responses produce safe UI feedback.
- Type checking, linting, production build, Worker dry-run, and rendered interaction QA pass.

## Deferred work

- Licensed live rankings, projections, and ADP.
- ESPN-authorized roster or draft synchronization.
- Server-side user accounts or cross-device storage.
- Weekly lineup optimization, which begins in Phase 3.
