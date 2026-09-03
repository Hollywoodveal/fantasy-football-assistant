# Phase 1 — ESPN-Compatible League Setup

## Goal

Let an ESPN fantasy-football user establish real league and roster context without giving Fantasy Assistant an ESPN password, private cookie, login code, or permission to change their league.

## User flow

1. Enter the league name, team name, scoring format, team count, season, and optional public league ID.
2. Paste a structured roster or select a local TXT/CSV file.
3. Review parsed players, starter and bench totals, duplicates, and invalid lines.
4. Save the confirmed league profile in the browser.
5. Reopen the setup from the dashboard or profile menu to review or replace the roster.

## Supported roster rows

The recommended format is:

```text
QB | Jordan Love | GB | Starter
RB | Chase Brown | CIN | Bench
```

Pipe, comma, and tab delimiters are supported. Space-delimited rows beginning with a supported position are also accepted. Supported positions are QB, RB, WR, TE, K, and D/ST. Supported roster slots are Starter, Bench, and IR.

## Architecture

| Concern | Phase 1 choice |
|---|---|
| League profile | Typed `LeagueProfile` model with schema version 1 |
| Roster parser | Pure client-side parser with validation and duplicate detection |
| Persistence | Versioned browser `localStorage` entry |
| File import | Browser `File.text()` for TXT and CSV; no upload |
| UI | Three-step accessible modal in the accepted dashboard design system |
| Dashboard | Imported league and team context with player, starter, and bench totals |
| ESPN access | No sign-in, credential collection, cookie collection, scraping, or writes |

## Data boundary

- All league and roster entries are user supplied.
- Imported files are read locally in the browser.
- Data is not uploaded to Cloudflare or another service in Phase 1.
- The optional ESPN league ID is stored as context for future authorized integration work.
- Removing browser site data removes the saved league profile.
- Phase 1 does not verify ESPN ownership or availability status.

## Recommendation boundary

The dashboard's projection, lineup, and waiver examples remain sample previews until live player projections, injuries, schedules, and league availability are introduced. Imported roster data must not be presented as a live recommendation signal before that work is complete.

## Exit criteria

- A user can complete all three setup steps with keyboard or pointer input.
- Pipe-, comma-, tab-, and supported space-delimited rosters parse correctly.
- Invalid and duplicate lines are reported without discarding valid players.
- The saved league and roster return after a page reload.
- The imported team name and league summary appear on the dashboard.
- The flow works at desktop and mobile widths without clipping or overflow.
- TypeScript, lint, production build, and Wrangler dry-run checks pass.
- The Phase 1 build deploys through the existing Cloudflare Worker configuration.
