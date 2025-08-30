# Roadmap & Milestones

### Phase 1 — Core MVP (Weeks 1–2)
- Deliver peer-to-peer video calling
- 3–5 stories in JSON
- Static backgrounds with transitions
- Room code generation and joining
- Netlify deployment at `tell.meastory.com`

Milestones
- M1: Video connection established between two browsers
- M2: Story engine loads and advances scenes for both peers
- M3: Choice selection synchronized
- M4: Launch beta to 10–20 families

### Phase 2 — Enhanced Storytelling (Weeks 3–5)
- Branching choices and choice tracking
- Personalization via URL parameter (e.g., child name)
- Story selection UI and session state persistence (localStorage)

Milestones
- M5: Branching logic implemented
- M6: Personalization reflected in story text
- M7: Story selection and resume flow working

### Phase 3 — Visual Enhancement (Weeks 6–9)
- AI-generated backgrounds with caching and fallbacks
- Smooth scene transitions and light AR overlays (MediaPipe)
- Introduce minimal Node/Express service for AI proxy/cache if needed

Milestones
- M8: First AI-generated backgrounds in production with fallback
- M9: Performance guardrails (fps monitor; graceful degradation)
- M10: AR overlay prototype (face prop) toggled on capable devices

### Phase 4 — Business Features (Weeks 10–12)
- Authentication (adult-only), subscriptions (Stripe)
- Premium catalog and basic analytics (Plausible/Fathom)
- Session links with proper expiry and guest access

Milestones
- M11: Adult signup/login live
- M12: Stripe subscription live with free vs premium gating
- M13: Analytics dashboard with privacy-first metrics

### Subdomain Expansion (Phase 5+)
- read.meastory.com: narrated books & audio
- write.meastory.com: collaborative story creation
- draw.meastory.com: illustrations & kid art
- send.meastory.com: gifting
- buy.meastory.com: marketplace
- find.meastory.com: discovery/search

Milestones
- M14+: Subdomain-specific pilots with separate deploys and shared brand system

### KPIs by Phase
- Phase 1: 90%+ successful connects; >10 min sessions; 80% recommend
- Phase 2–3: 40%+ WAU retention; 3+ stories/session; 20% MoM growth
- Phase 4: 10%+ conversion to premium; positive contribution margin

### Risks & Gates
- Gate after Phase 1: Validate engagement and UX; decide on AI investment
- Gate after Phase 2: Validate branching/personalization impact on retention
- Gate after Phase 3: Budget for AI costs; performance across devices acceptable
- Gate after Phase 4: Monetization traction justifies further subdomain investment 