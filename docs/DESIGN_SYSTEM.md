# Fantasy Assistant — Design System

## Overview

The design system establishes visual and interaction consistency across all phases. Phase 0 demonstrates the full visual direction with CSS design tokens and a component library approach.

## Color Palette

### Dark Mode (Default)
- **Background:** `#06131f` (near-black navy)
- **Surface:** `#0a1c2c` (steel navy)
- **Surface Strong:** `#0d2336`
- **Surface Soft:** `#10283d`
- **Text:** `#f6f9fb` (off-white)
- **Muted:** `#93a8bc`
- **Muted Strong:** `#b3c2cf`
- **Accent (Primary):** `#b8ff39` (electric lime)
- **Accent (Secondary):** `#64a7ff` (cool blue)
- **Border:** `#254057`

### Light Mode
- **Background:** `#f8f9fa`
- **Surface:** `#ffffff`
- **Text:** `#1a1d23` (charcoal)
- **Accent (Primary):** `#b8ff39` (electric lime)
- **Accent (Secondary):** `#64a7ff` (cool blue)
- **Border:** `#d1d5db`

## Typography

### Display Font
- **Family:** Barlow Condensed
- **Weights:** 500, 600, 700
- **Use:** Headings, panel titles, labels, CTAs
- **Style:** Uppercase, condensed, italic on brand

### Body Font
- **Family:** Inter
- **Weights:** 400, 500, 600, 700
- **Use:** Body text, descriptions, UI labels

## Spacing & Layout

- **Base unit:** 4px
- **Common gaps:** 8px, 12px, 16px, 24px, 32px
- **Radii:** 8px (sm), 12px (md), 16px (lg)
- **Max width:** 1320px (desktop content)
- **Mobile padding:** 16px
- **Desktop padding:** clamp(24px, 4vw, 64px)

## Component Library

### Buttons

#### Primary Action
- **Background:** Linear gradient (#c2ff51 → #a7ed29)
- **Text:** Dark navy (#07121b)
- **Size:** 54px min-height
- **State:** Completed shows lime border + transparent background
- **Hover:** Brightness +8%, translateY(-1px)

#### Secondary Action
- **Background:** Dark blue (#0b2135)
- **Border:** 1px solid cool blue
- **Text:** Light blue (#9bc6ff)
- **Size:** 54px min-height

#### Text Action
- **Background:** Transparent
- **Color:** Cool blue
- **Weight:** 600
- **Icon gap:** 4px

### Panels

- **Background:** Gradient (rgba(13, 35, 54, 0.88) → rgba(7, 23, 37, 0.96))
- **Border:** 1px solid rgba(37, 64, 87, 1)
- **Border radius:** 12px
- **Padding:** 22px
- **Shadow:** 0 18px 50px rgba(0, 0, 0, 0.16)

### Dialogs

- **Width:** min(100%, 580px)
- **Background:** Gradient (rgba(13, 37, 57, 1) → rgba(7, 22, 33, 0.68))
- **Backdrop:** rgba(1, 7, 12, 0.74) with blur(8px)
- **Border radius:** 16px
- **Animation:** Fade in + slide up (220ms ease)

### Navigation

#### Side Navigation (Desktop)
- **Width:** 224px
- **Position:** Fixed left
- **Item height:** 58px min
- **Active state:** #0d2438 background, lime icon

#### Bottom Navigation (Mobile)
- **Height:** 72px
- **Position:** Fixed bottom
- **Item:** flex column with icon + label
- **Icons:** 23px × 23px

## Responsive Breakpoints

- **Mobile:** ≤480px (extra small)
- **Tablet:** ≤768px (small)
- **Desktop:** >768px (medium+)

### Mobile Adjustments
- Hide side navigation, show bottom bar
- Single-column dashboard grid
- Compact spacing (16px padding)
- Reduced font sizes
- Mobile-specific buttons (review changes inline)

## Accessibility

- **Focus states:** 3px solid lime outline with 3px offset
- **ARIA labels:** All icons and buttons
- **Semantic HTML:** `<button>`, `<nav>`, `<section>`, `<dialog>`
- **Color contrast:** ≥4.5:1 for text
- **Touch targets:** ≥48px minimum
- **Reduced motion:** All animations disabled for `prefers-reduced-motion: reduce`

## Dark/Light Mode Toggle

Users can toggle theme via the sun/moon icon in the header (top bar). Preference persists via localStorage.

```css
@media (prefers-color-scheme: light) {
  /* Automatic light mode colors applied */
}
```

## Animation Guidelines

- **Default duration:** 150ms–250ms
- **Easing:** `ease` or `cubic-bezier()`
- **Reduced motion:** Duration → 0.01ms, iteration → 1
- **Transitions:** Background, transform, filter (not layout)

## Error States

- **Background:** rgba(231, 76, 60, 0.15)
- **Border:** 1px solid rgba(231, 76, 60, 0.4)
- **Text:** #ecf0f1
- **Icon:** #e74c3c
- **Role:** `alert` ARIA role

## Loading States

- **Skeleton loader:** Shimmer animation over 2s
- **Disabled state:** Opacity 0.6, cursor not-allowed
