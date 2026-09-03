# Phase 2.1 — Ranking Data Foundation

## Goal

Remove the fixed 40-player limitation without scraping ESPN or exposing a paid-provider API key in browser code. Users can import a current production-sized ranking CSV from a provider they are authorized to use, then run the existing recommendation engine against that player pool.

## Supported columns

Only `Rank`, `Player`, and `Position` are required. Header aliases allow common exports to work without manual rewriting.

| Canonical field | Examples accepted |
| --- | --- |
| Rank | Rank, Overall, ECR, RK |
| Player | Player, Player Name, Name |
| Position | Position, Pos |
| Team | Team, NFL Team, TM |
| Bye | Bye, Bye Week |
| Projection | Projected Points, Projection, Proj, Proj Pts, FPTS |
| ADP | ADP, Average Draft Position |
| Tier | Tier |
| Notes | Notes, Outlook |

`DEF` and `DST` normalize to `D/ST`. Quoted values and escaped quotes are supported. Rows with an unsupported position or missing player name are skipped and surfaced as import notes.

## Safety and integrity

- Files are read with the browser File API and are not uploaded.
- Imported data uses a versioned local-storage schema.
- Ranking replacement is locked after pick one because imported player IDs may not match existing saved picks.
- Restoring the built-in data does not delete league settings.
- No ESPN password, private cookie, or provider API key is collected.

## Provider decision

Sleeper's documented public API is suitable for player identity, league, draft, and trending metadata, but it does not provide the expert rankings and projections required for this recommendation surface. FantasyPros offers official rankings, ADP, projections, news, and injuries through an authenticated API. A production connection should therefore use a Cloudflare Worker endpoint and secret binding so the provider key never reaches the browser.

Phase 2.1 deliberately implements the provider-independent import and persistence layer first. A later provider phase can normalize server responses into the same `DraftDataSet` schema without rewriting the draft engine or UI.

## Completion criteria

- CSV text and `.csv`/`.txt` files parse locally.
- Required headers are validated before import.
- Valid rows remain usable when other rows contain errors.
- The preview reports player, projection, and error counts.
- Imported data immediately replaces the recommendation pool.
- Source name, scoring format, player count, and update date remain visible.
- Imported data restores after reload.
- The original demonstration ranking set can be restored before a draft begins.
