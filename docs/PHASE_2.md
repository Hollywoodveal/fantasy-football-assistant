# Phase 2 — Draft Assistant

## Goal

Help a fantasy manager make every draft selection before a roster exists. The assistant runs beside an ESPN draft and stays synchronized through explicit user actions without collecting ESPN credentials or claiming automatic ESPN access.

## Workflow

1. Configure league name, team name, scoring, number of teams, draft position, and roster slots.
2. Start a snake-draft session.
3. After every ESPN selection, mark the player as drafted by the user's team or another team.
4. Review the recommendation, position needs, value versus ADP, and roster construction before the next pick.
5. Undo an incorrect selection or safely reset the full draft.

## Recommendation model

Phase 2 uses deterministic browser-side scoring. It combines:

- Built-in player order and average draft position
- Value at the current overall pick
- Unfilled starting and flex positions
- Position scarcity
- Scoring-format fit
- Early-round penalties for kickers and defenses
- Duplicate-quarterback restraint after the first quarterback is selected

This is a transparent product foundation, not a production projection model. A later phase will replace the demonstration ranking set with versioned, sourced, current player data.

## Storage and privacy

| Data | Location | Behavior |
| --- | --- | --- |
| Draft settings | Browser local storage | Versioned schema; editable during a draft |
| Draft selections | Browser local storage | Saved after every selection |
| ESPN credentials | Not collected | Passwords, cookies, and login codes are outside scope |
| Provider requests | None | Phase 2 requires no API key or backend |

## Completion criteria

- A user can start without importing a roster.
- Snake-order status identifies the user's scheduled pick numbers.
- Every available player can be assigned to the user's team or removed as an opponent pick.
- Recommendations change after selections and reflect roster construction.
- Search, position filtering, undo, reset, and settings changes work without reloading.
- Draft progress restores after a browser reload.
- The interface clearly identifies the ranking pool as demonstration data.
- The app remains buildable and deployable through Cloudflare Workers Static Assets.

## Deferred work

- Live player rankings, projections, injuries, depth charts, and news
- Automatic ESPN draft synchronization
- Auction and keeper draft modes
- Full production-size ranking pool
- Draft grades and post-draft report cards
