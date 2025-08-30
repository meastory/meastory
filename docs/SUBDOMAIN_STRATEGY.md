# Subdomain Strategy

### Domains
- Root: MeAStory.com — marketing/landing
- Verb subdomains:
  - tell.meastory.com — live video storytelling — Accent: Warm Coral #FF6B6B — Icon: speaking bubble with sparkles
  - read.meastory.com — narrated books & audio — Accent: Sky Blue #60A5FA — Icon: open book with stars
  - write.meastory.com — collaborative story creation — Accent: Violet #8B5CF6 — Icon: pencil + notebook
  - draw.meastory.com — illustrations & kid art — Accent: Mint #34D399 — Icon: crayon + doodle
  - send.meastory.com — gifting stories — Accent: Rose #FB7185 — Icon: envelope with book
  - buy.meastory.com — marketplace — Accent: Amber #F59E0B — Icon: storefront
  - find.meastory.com — discovery/search — Accent: Teal #14B8A6 — Icon: magnifying glass over book

### Principles
- One accent per page; use as secondary color (10–20%)
- Unified brand system (typography, neutrals, primary colors)
- Independent development/deploy; shared design language

### Technical Strategy
- Start with `tell` only; park other subdomains in DNS
- Independent apps under `apps/*` in a single repo; shared packages later

### Iconography Guidance
- Friendly, rounded, high-contrast icons
- SVG preferred; store in `apps/*/public/brand/icons`

### Roadmap
- Phase 1: tell
- Phase 5+: read → write → draw → send → buy → find 