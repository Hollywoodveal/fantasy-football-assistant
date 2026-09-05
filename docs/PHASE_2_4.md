# Phase 2.4 — ESPN Rankings Import

## Goal

Let a fantasy manager use ESPN's current overall draft order inside Fantasy Assistant without collecting ESPN credentials, scraping ESPN pages, or redistributing ESPN rankings. The manager downloads an official Top 300 PDF and selects it locally.

## Supported workflow

1. Open ESPN Cheat Sheet Central from the rankings dialog.
2. Download the current PPR or non-PPR Top 300 PDF.
3. Select that PDF in Fantasy Assistant before the first draft pick.
4. Review the detected player count, positions, scoring format, source date, and coverage.
5. Apply the rankings to the existing draft engine.

ESPN's positional, beginner, superflex, dynasty, projection, and image-only PDFs are outside the Phase 2.4 parser contract. Existing CSV import remains available for those formats after the user converts an authorized source into supported columns.

## Data mapping

| ESPN field | Fantasy Assistant field |
| --- | --- |
| Overall rank | ADP/order |
| Player name | Player name and stable local ID |
| Positional rank | Private player note |
| Position | QB, RB, WR, TE, D/ST, or K |
| NFL team | Team |
| Salary-cap value | Private player note |
| Bye week | Bye |

ESPN Top 300 PDFs do not include season projections, so imported players receive a zero projection. Recommendations still use overall order, roster needs, tiers, and live Sleeper metadata; the interface does not imply that ESPN supplied projections.

## Privacy and provider boundary

- PDF bytes and extracted text stay in the browser.
- The PDF parser loads only after the manager selects an ESPN PDF.
- No ESPN password, session cookie, league credential, or private API is used.
- Fantasy Assistant links to ESPN's official download page instead of automatically scraping or mirroring it.
- Imported rankings remain the manager's selected source; Sleeper continues to provide player identity and status metadata only.

## Completion criteria

- The current ESPN PPR Top 300 PDF produces 300 unique players in overall-rank order.
- PPR and non-PPR formats are distinguished when the PDF includes its scoring label.
- An unsupported PDF produces a useful error without replacing saved rankings.
- A complete preview must be confirmed before rankings are saved.
- Ranking replacement remains locked after the first draft pick.
- PDF parsing is emitted as an on-demand production chunk.
- Type checking, linting, production build, Worker dry-run, and browser interaction QA pass.
