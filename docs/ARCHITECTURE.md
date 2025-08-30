# Architecture & Repo Design Decisions

### Goals
- Move fast for Phase 1 with minimal complexity
- Set clean boundaries to evolve toward Phase 2–4 without rewrites
- Support subdomain strategy and future provider plugins

### Monorepo vs Polyrepo
- Decision: Start with a single repo housing multiple apps/packages as they emerge
  - Rationale: Fast local dev, shared brand/design, easy CI/CD
  - Tooling: Start simple (no workspace manager). Introduce PNPM workspaces/Turborepo only when needed in Phase 3+

### Repository Layout (initial)
```
meastory/
  docs/                        # Product, architecture, policies, runbooks
  apps/
    tell/                      # Phase 1 MVP static site (Netlify)
      public/                  # Static assets (images, icons)
      src/                     # Vanilla JS/CSS/HTML
      stories/                 # JSON story definitions
      netlify.toml             # Build/deploy config
  packages/                    # Reserved for shared libs later (e.g., story-engine)
  .github/                     # CI configs later
  README.md                    # Root overview
```

### Phase 1 Tech Choices
- Frontend: Vanilla HTML/CSS/JS (no framework)
- Video: WebRTC (direct peer connection, STUN only initially)
- State sync: Simple peer messaging channel (DataChannel) for story state
- Hosting: Netlify static site + redirects
- DNS: Namecheap → Netlify CNAME
- No backend, no DB

### Evolution Path
- Phase 2: Keep static hosting; add better story navigation, URL personalization
- Phase 3: Introduce small Node.js service (Railway/Render) for AI image proxy/cache; start `packages/story-engine`
- Phase 4: Add authentication and subscriptions; consider Supabase (Auth, Postgres, Storage) and/or Stripe webhook service

### Video Provider Plugin Architecture (forward-looking)
- Keep an interface in `packages/video` (future) with adapters: `webrtc`, `zoom`, `daily`
- Phase 1 implements only `webrtc` internals inside `apps/tell/src` with an interface boundary to allow later extraction

### Data & Story Schema
- JSON-based story definitions stored in `apps/tell/stories`
- Strict, documented schema with validation during build (JSON Schema in Phase 2)

### Security & Privacy
- No child data persisted; no accounts in Phase 1
- Session links should be random and short-lived; initial MVP can simulate expiry client-side
- COPPA-aware copy and flows

### Testing & Quality
- Unit tests for story engine (when extracted) using Vitest/Jest in Phase 2
- Manual cross-browser smoke tests for Phase 1

### CI/CD
- Netlify deploys from `apps/tell`
- Branch deploy previews for feature branches
- Add GitHub Actions later for lint/typecheck/tests

### Alternatives Considered
- SPA frameworks (React/Vue): Overhead not justified for MVP timeline
- Separate repos per subdomain now: Premature; increase coordination costs
- Backend signaling service now: Skip; leverage public STUN and simple signaling via room URLs first, add proper signaling when multi-peer/recording required

### Risks
- WebRTC signaling without a server limits flexibility → acceptable for MVP; add lightweight signaling in Phase 2/3 if needed
- Vanilla stack can accrue duplication → migrate to shared packages as soon as features repeat 