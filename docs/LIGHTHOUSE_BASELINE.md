# Lighthouse Baseline — Phase 0

## Target Scores

Phase 0 aims for the following Lighthouse scores on desktop and mobile:

| Metric | Target | Notes |
|--------|--------|-------|
| **Performance** | 90+ | Optimized bundle, CSS-in-JS zero, cached assets |
| **Accessibility** | 95+ | WCAG AA compliance, semantic HTML, focus states |
| **Best Practices** | 90+ | HTTPS, no console errors, valid meta tags |
| **SEO** | 90+ | Mobile-friendly, proper viewport, meta description |
| **PWA** | 90+ | Installable, offline-capable, manifest valid |

## Measuring Phase 0

### Desktop

Run:
```bash
lighthouse https://fantasy-football-assistant.daiyveal.workers.dev --output-path=./lighthouse/desktop.html --view
```

### Mobile

Run:
```bash
lighthouse https://fantasy-football-assistant.daiyveal.workers.dev --output-path=./lighthouse/mobile.html --view --emulated-form-factor=mobile
```

## Key Metrics (Web Vitals)

- **LCP (Largest Contentful Paint):** < 2.5s
- **FID (First Input Delay):** < 100ms (deprecated in favor of INP)
- **INP (Interaction to Next Paint):** < 200ms
- **CLS (Cumulative Layout Shift):** < 0.1

## Phase 0 Optimizations

1. **CSS Inline:** Global styles in `<style>` to avoid render-blocking CSS
2. **Bundle Size:** React + ReactDOM + Lucide ~50KB gzipped
3. **Workbox Caching:** Versioned assets + network-first for HTML
4. **Image Optimization:** SVG icons (no raster), PNG app icons optimized
5. **Code Splitting:** Dialog modals only loaded on interaction (future)

## Monitoring

After deployment, run Lighthouse weekly from CI/CD to track regressions:

```yaml
# Example GitHub Actions workflow
name: Lighthouse
on: [push]
jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm run build
      - run: npm install -g @lhci/cli@latest
      - run: lhci autorun
```

## Phase 1 & Beyond

As data fetching and dynamic content are added, monitor for:
- Increased FID/INP due to data processing
- Layout shifts from loading skeleton states
- PWA install abandonment metrics
