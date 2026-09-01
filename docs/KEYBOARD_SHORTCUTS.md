# Keyboard Navigation Guide

## Quick Reference

| Shortcut | Action |
|----------|--------|
| **Alt + 1** | Go to Home |
| **Alt + 2** | Go to Lineup |
| **Alt + 3** | Go to Draft |
| **Alt + 4** | Go to Waivers |
| **Alt + 5** | Open Settings/More |
| **Ctrl + L** (or **Cmd + L** on Mac) | Open Lineup dialog |
| **Esc** | Close dialog |
| **Shift + ?** | Show this help |
| **Tab** | Navigate between focusable elements |
| **Enter** | Activate button/link |
| **Space** | Activate button (if focused) |
| **Arrow Keys** | Navigate select menus |

## About Keyboard Navigation

Fantasy Assistant is fully keyboard-accessible. All interactive elements can be reached and activated using only the keyboard.

### Focus Management

- **Focus indicators:** Bright lime outline (3px) appears on all focused elements
- **Tab order:** Follows logical DOM order (left-to-right, top-to-bottom)
- **Focus trap:** Dialogs trap focus (Tab stays within dialog until closed)

### Dialog Navigation

1. Open a dialog (e.g., **Alt + 2** for Lineup)
2. **Tab** to navigate buttons/form fields
3. **Esc** to close the dialog
4. Focus returns to the button that opened the dialog

### Screen Reader Support

- All buttons and icons have descriptive ARIA labels
- Dialog modality is announced via `role="dialog" aria-modal="true"`
- Form fields use `<label>` with proper association
- Status messages use `role="status"` or `role="alert"`

## Examples

### Workflow: Optimize Lineup (Desktop)

1. Press **Alt + 2** → Jumps to Lineup section
2. Press **Tab** → Focuses "Review changes" button
3. Press **Enter** → Opens Lineup dialog
4. Press **Tab** → Cycles through listed moves
5. Press **Tab** → Focuses "Apply to preview" button
6. Press **Enter** → Applies lineup
7. Press **Esc** → Closes dialog

### Workflow: Change Week

1. Press **Tab** until focus reaches the week select dropdown
2. Press **Arrow Down** → Cycles weeks
3. Press **Tab** → Moves to next control

## Implementation Notes

- Shortcuts use standard conventions (Alt + number for nav, Ctrl/Cmd + letter for actions)
- Offline indicator bar does not interfere with focus management
- Mobile devices with bottom navigation still support all Alt shortcuts
- Help dialog (Shift + ?) shows all shortcuts without leaving the app
