# Responsive Design Checklist

## Breakpoints to Test

### Mobile (≤480px)
- iPhone SE (375px)
- iPhone 12 (390px)
- Pixel 5 (393px)
- Galaxy S20 (360px)

**Checklist:**
- [ ] Bottom navigation visible, side nav hidden
- [ ] Single-column dashboard grid
- [ ] Top bar controls stack responsively
- [ ] Week select full width
- [ ] Mobile action buttons visible (Review changes)
- [ ] Dialogs fill screen with padding
- [ ] Typography readable without zoom
- [ ] Touch targets ≥48px
- [ ] Swipe gestures work (if implemented)
- [ ] Offline indicator does not overlap content

### Tablet (481px–768px)
- iPad Mini (768px)
- iPad (820px)

**Checklist:**
- [ ] Bottom navigation still visible
- [ ] Dashboard grid switches to 2 columns
- [ ] Side navigation still hidden
- [ ] Adequate spacing around panels
- [ ] Font sizes readable
- [ ] Dialogs centered with reasonable max-width

### Desktop (769px+)
- 1280px (standard laptop)
- 1920px (full HD)
- 2560px (4K)

**Checklist:**
- [ ] Side navigation visible, bottom nav hidden
- [ ] 3-column dashboard grid
- [ ] Desktop action buttons visible (Review changes, View all)
- [ ] Content max-width enforced (1320px)
- [ ] All dialogs properly centered
- [ ] Hover states work on buttons/links

## Platform-Specific Testing

### iOS Safari
- [ ] Viewport meta tags respected
- [ ] Sticky elements work (top bar)
- [ ] Notch/safe area insets handled
- [ ] PWA installs to home screen
- [ ] Offline mode works
- [ ] Font rendering is sharp

### Android Chrome
- [ ] System back button closes dialogs
- [ ] Bottom navigation doesn't overlap content
- [ ] PWA installs correctly
- [ ] Offline mode works
- [ ] Touch feedback visible

### Desktop Browsers
- [ ] Chrome (Chromium)
- [ ] Firefox (Gecko)
- [ ] Safari (WebKit)
- [ ] Edge (Chromium)

**Checklist:**
- [ ] Focus indicators visible in all browsers
- [ ] Keyboard navigation works
- [ ] Animations respect `prefers-reduced-motion`
- [ ] Dark/light mode toggle works
- [ ] localStorage persists across sessions

## Landscape Orientation

- [ ] Mobile landscape (480px height)
- [ ] Tablet landscape (768px height)
- [ ] Content remains readable
- [ ] Navigation still accessible

## Testing Tools

- **Chrome DevTools:** Device emulation, throttling, offline mode
- **Responsive Design Mode (Firefox):** Similar emulation
- **BrowserStack:** Real device testing
- **Sauce Labs:** CI/CD integration for real devices

## Automated Testing

Add to CI/CD:

```bash
npm run test:responsive
```

This should run Playwright/Cypress tests at key breakpoints to catch regressions.
