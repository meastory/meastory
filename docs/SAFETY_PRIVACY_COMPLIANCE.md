# Safety, Privacy, and Compliance Plan

### Principles
- Child-first safety; adults are account holders; no child accounts
- Collect the minimum data necessary; no child personal data
- Build transparency and consent into flows; publish clear policies

### Phase 1 (MVP) — Read
- No authentication or accounts
- Adults generate session links; children join as guests
- Session links are short-lived (target 24 hours); client-side expiry if no backend
- No storage of video/audio; WebRTC only, ephemeral
- Content reviewed by humans before publish
- “Report Issue” button to contact support; triage within 48 hours

### Data Handling
- Child data: none (no names, photos, recordings)
- Telemetry: minimal, privacy-friendly (e.g., page views, aggregate counts) and adult-only
- Logs: technical only (errors, connection status), short retention (≤14 days) during MVP
- Cookies/localStorage: session state only; no tracking cookies

### Legal Readiness (Phase 1)
- Publish COPPA-aware Privacy Policy and Terms of Service
- Clear adult supervision and consent messaging
- Accessibility and inclusivity commitments

### Phase 2–4 Enhancements
- Authentication (adult-only), family profiles without child PII
- Session links with server-side expiry; revoke on demand
- Subscription billing (Stripe) with compliant data handling and PCI delegation
- Privacy-focused analytics (Plausible/Fathom); opt-in for adults

### Compliance Checklist
- COPPA: no collection from under-13s; parental consent for any recording/analytics
- GDPR/CCPA: clear rights, DSR processes, data minimization, retention limits
- Security: HTTPS everywhere; CSP; secure headers; dependency updates
- Incident Response: document and practice procedures; notify users as required

### Moderation & Reporting
- Pre-publish story review against standards (age-appropriate, positive values)
- Abuse reporting with human review; removal within defined SLAs
- Automated safeguards (basic content filters) as we scale

### Technical Safeguards
- Ephemeral WebRTC streams; no recording by default
- Optional audio-only degradation on low bandwidth
- Feature gates for AR/AI effects to protect performance

### Documentation to Publish
- Privacy Policy
- Terms of Service
- Content Guidelines
- Safety Practices overview for parents

### Roles & Responsibilities
- Product: defines safety UX and copy
- Engineering: implements safeguards, telemetry limits, secure defaults
- Content: human review before publish; maintain standards
- Support: triage reports and incident response 