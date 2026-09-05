# Phase 3.2 — ESPN Read-Only League Sync

Phase 3.2 connects public ESPN Fantasy Football league data to the existing local `LeagueProfile`. The Cloudflare Worker reads public league metadata and roster data, normalizes it to the app's supported positions, and returns only the fields the browser needs.

## What shipped

- Public ESPN League ID and season lookup in the existing league setup dialog.
- Server-side requests to ESPN's read-only fantasy league endpoint through the Cloudflare Worker.
- League-name, team-count, scoring-format, team, starter, bench, and IR normalization.
- Team selection before a synced roster is stored locally.
- One-click ESPN refresh for profiles connected through public sync.
- Clear private-league, missing-league, invalid-input, unavailable-provider, and unsupported-response errors.
- Five-minute edge caching and one-minute browser caching for successful public league responses.
- Manual TXT/CSV roster import retained as the private-league and provider-outage fallback.

## Privacy and authorization boundary

- No ESPN password, login code, `SWID`, `espn_s2`, or other private session value is accepted.
- The browser sends only a numeric League ID and season to the app's Worker.
- The Worker sends no user credential or session cookie to ESPN.
- Only public, read-only league data is supported.
- The app cannot submit lineup, waiver, trade, or draft changes to ESPN.
- Failed refreshes never replace the user's last saved roster.

## QA coverage

Deterministic tests cover League ID validation, request URL construction, PPR detection, ESPN position/team/slot normalization, unsupported-position filtering, and refresh metadata persistence.

Run them with:

```bash
npm run test:espn
```
