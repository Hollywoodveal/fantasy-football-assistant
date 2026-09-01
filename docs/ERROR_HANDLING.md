# Error Handling & Edge Cases

## Current Error States (Phase 0)

### Offline Mode

**Trigger:** Network disconnected

**UI Response:**
- Red banner at top: "Offline — using cached data"
- App shell (.offline class) adds padding for banner
- All cached pages remain accessible
- Attempting to sync shows error message

### Lineup Optimization Error

**Trigger:** Failed to apply lineup changes

**UI Response:**
- Error alert appears below matchup section
- Red border, white text, alert icon
- Clear error message: "Failed to apply lineup changes."
- User can retry or dismiss

## Phase 1+ Error Scenarios

### ESPN Integration Errors

- **Invalid league ID:** "League not found. Check your league ID."
- **Authentication failed:** "Could not verify ESPN credentials."
- **API timeout:** "Data fetch timed out. Please try again."
- **Rate limited:** "Too many requests. Wait a moment and retry."

### Data Provider Errors

- **Projection data missing:** Skeleton loaders appear, placeholder values shown
- **Partial data:** Show available data, gray out missing columns
- **Service down:** Banner with "Data temporarily unavailable"

### User Input Errors

- **Invalid roster format:** Inline form validation with clear feedback
- **Missing required fields:** Red border + helper text on input
- **Duplicate player:** "Player already on your roster"

## Toast Messages

Short-lived success/info notifications auto-dismiss after 3200ms.

**Styling:**
- Green background (#27ae60)
- White text
- Icon + message
- Slides up, fades in/out
- Respects `prefers-reduced-motion`

## Fallback States

### Browser Compatibility

- **Old browsers (IE11):** Not supported; redirect to upgrade page
- **Disabled JavaScript:** Show "Please enable JavaScript" message
- **No localStorage:** App still works; preferences reset on refresh
- **No PWA support:** App still works as regular website
