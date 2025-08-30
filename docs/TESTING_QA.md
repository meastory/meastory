# Testing and Quality Plan

### Quality Gates (by phase)
- Cross-browser: Chrome, Safari, Firefox (desktop); iPadOS Safari
- Responsiveness: Desktop and tablet layouts
- Performance: Video quality, load time budgets, smooth transitions
- Accessibility: Contrast checks, keyboard focus order, readable copy

### Phase 1 MVP
- Manual smoke tests per release:
  - Start a room; join from second device
  - Audio/video permission prompts appear and work
  - Both participants see synchronized scenes and choices
  - Background transitions are smooth
  - Error states: reconnect, expired/invalid link, low bandwidth → audio-only
- Device matrix (minimal):
  - macOS Chrome, Safari
  - Windows Chrome, Firefox
  - iPadOS Safari

### Phase 2+
- Unit tests: story engine logic (choices, branching, personalization)
- Integration tests: room creation/join flow, state sync via DataChannel
- Performance tests: fps monitoring, network throttling
- Accessibility tests: automated checks (axe) + manual review

### Tooling
- Linting/formatting: Prettier/ESLint once a JS toolchain is added
- Test runner: Vitest/Jest (Phase 2)
- E2E: Playwright/Cypress for critical flows (Phase 2+)

### Release Process
- Feature branches → Netlify deploy previews
- QA checklist executed on preview
- Beta group validation (10–20 families for Phase 1)
- Production deploy after sign-off

### Monitoring & Feedback
- Privacy-friendly analytics for adult users (Plausible/Fathom)
- Error reporting: basic client error logging (no PII), console sampling
- User feedback: in-app link to report issues; triage within 48 hours

### Acceptance Criteria References
- See PRD Acceptance Criteria for demo checklist 