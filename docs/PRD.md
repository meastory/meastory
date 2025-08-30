# Product Requirements Document (PRD) — Phase 1 MVP: tell.meastory.com

### Overview
- **Product**: Me A Story — Live video storytelling for families
- **Phase**: 1 (Core MVP)
- **Timeline**: 1–2 weeks
- **Primary Goal**: Enable two people (e.g., grandparent and child) to join a video call and experience a shared, interactive story with static backgrounds.

### Objectives & Success Criteria
- **Objectives**:
  - Deliver a simple, delightful first experience that validates the core concept.
  - Keep implementation minimal to enable rapid iteration in Phase 2.
- **Success Criteria**:
  - 90%+ successful video connections across desktop/tablet browsers
  - Average session length > 10 minutes
  - Background updates with story progression
  - Positive feedback: 80%+ recommend to other families

### Key Personas
- Grandparent Gloria (68): iPad, wants simple and reliable joining and navigation
- Parent Paul (35): smartphone/laptop, wants safe, private app with minimal setup
- Child Charlie (5): tablet, short attention span, enjoys interactive scenes and visuals

### Scope (In)
- Peer-to-peer video calling via WebRTC (no third-party provider)
- Rooms created by code; users can join with a code or a shared link
- 3–5 hardcoded story templates (JSON)
- Static background images with CSS transitions
- Simple story engine to step through scenes and choices (no branching persistence)
- Basic landing page explaining the product and how to start a session
- Basic reporting link (simple form link) for issues

### Scope (Out) for Phase 1
- User accounts, profiles, or authentication
- Child data collection of any kind
- Payments, subscriptions, or premium content
- AI-generated backgrounds, AR overlays, advanced effects
- Analytics beyond very basic, privacy-friendly traffic metrics

### User Flows
1) Start Session (Adult)
- Open tell.meastory.com → click “Start a Story” → app creates room → display/share code and link → adult joins
2) Join Session (Child/Guest)
- Open shared link or enter code → join call → see synchronized story view
3) Story Playback
- Adult advances scenes and selects choices → background updates → both see same content
4) End Session
- Session summary screen → option to start new story

### Safety & Privacy (Phase 1)
- Adults initiate sessions; children join via links; no accounts for children
- Expiring session links (target: expire in 24 hours); if not feasible, show clear guidance to regenerate links often
- No storage of child personal data, images, or audio
- Clear adult supervision messaging
- “Report Issue” button routes to support form; human review process established

### Functional Requirements
- Video Call
  - Create/join room
  - Local camera/microphone preview and permissions
  - Mute/unmute, camera on/off
- Story Engine
  - Load a story JSON by id
  - Display current scene: text + background image
  - Advance to next scene or make a choice (2–3 options)
  - Synchronize state across peers
- UI
  - Minimal, readable UI with brand colors and typography
  - Works on desktop and tablet

### Non-Functional Requirements
- Compatibility: Latest Chrome, Safari, Firefox (desktop); iPadOS Safari
- Performance: Smooth background transitions; target 30fps video under normal conditions
- Accessibility: Sufficient color contrast; large tap targets; readable typography
- Reliability: Auto-retry on connection failure; clear error states and recovery

### Content Requirements
- Initial stories (3–5): Friendly Dragon, Underwater Adventure, Space Journey, Magic Garden, Pirate Treasure Hunt
- Length: 5–8 scenes per story
- Choices: 2–3 per decision point
- Themes: kindness, courage, friendship; age 3–8

### Technical Constraints & Decisions
- Stack: Vanilla HTML/CSS/JS for speed
- Hosting: Netlify static site
- Storage: No database; static assets only
- DNS: Namecheap → Netlify
- Story data: JSON files in repo

### Risks & Mitigations
- WebRTC interoperability: Keep a fallback “reconnect” flow; degrade to audio-only on low bandwidth
- Performance on older devices: Progressive enhancement; reduce effects if FPS drops
- Story quality: Human content review before publish

### Deliverables
- Static website at tell.meastory.com
- Working peer-to-peer video call
- Story engine with 3–5 stories and static backgrounds
- Room code generation/joining
- Basic report link and safety messaging

### Acceptance Criteria (Demo Checklist)
- Two users can connect and see/hear each other
- Starting a story loads scene 1 with correct text/background
- Advancing scenes changes background for both users
- Choice selection is synchronized for both users
- Clear error messages for expired/invalid links and connection issues
- Works on desktop Chrome and iPad Safari 