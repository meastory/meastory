# Pre-Launch Sprint Execution Prompts (Operational Guide)

Purpose: Provide tightly-scoped, actionable prompts per sprint with disciplined development practices, CLI workflows, and explicit acceptance criteria to enable agentic coders to execute reliably.

## Global Development Discipline (Applies to All Sprints)
- Branching: one feature branch per backlog item: `feature/<sprint>-<short-name>`
- Commit cadence: small atomic commits (max 150 lines change preferred). Conventional commits.
- PRs: include description, scope, screenshots/CLI output; link to story and AC.
- CI: run local build/test before pushing. Fix lint/type errors prior to PR.
- Environment: use `supabase`, `netlify`, and `gh` CLIs directly; avoid manual dashboard-only steps.
- Secrets: use `.env.local` and Netlify/Supabase envs; never commit secrets.
- Logging: meaningful console logs guarded behind flags for prod.
- QA Artifacts: attach filled `docs/qa/QA_ACCEPTANCE_TEMPLATE.md` and update `docs/qa/QA_DEVICE_MATRIX.md` rows for tested platforms.
- Typechecking: run `npm run typecheck` locally and ensure CI is green before requesting review.

Common CLI
```bash
# GitHub
brew install gh | cat
gh auth login --hostname github.com --web

# Netlify
brew install netlify-cli | cat
netlify login
netlify status

# Supabase
brew install supabase/tap/supabase | cat
supabase --version | cat
supabase login
supabase link --project-ref dsckjfnvcqsriyalhgrz
```

Build/Run
```bash
# Read app
cd apps/read
npm i
npm run lint
npm run typecheck
npm run build
npm run dev | cat

# Signal (should be deprecated by S1)
cd ../../apps/signal
npm i
npm start | cat
```

---

## Sprint 1: Realtime Signaling, Presence, Preflight, Guest Skeleton

Prompt: Implement Supabase Realtime-only signaling with presence, add preflight device tests, and create guest flow skeleton pages (`/start`, `/invite/:code`, `/join/:code`).

Key Tasks
- Remove legacy WebSocket signaling from runtime; gate behind feature flag for rollback.
- Implement presence (join/leave metadata, device label) and UI.
- Build preflight page with camera/mic tests and device selection.
- Create guest pages: start → invite (magic link, QR, code) → join (preflight) → waiting.

Acceptance Criteria
- Offers/answers/ICE are exchanged ONLY via Supabase Realtime channel `webrtc-<code>`.
- Presence updates within 2s of join/leave; UI reflects device labels.
- Preflight must pass before connect; permissions handling with friendly messaging.
- Guest pages functional; invite page displays copyable link, QR, and 6-char code.

CLI Workflow
```bash
# Branch
cd /Users/andrewlawson/development/meastory
git checkout -b feature/s1-realtime-presence-preflight

# Implement
code .  # or use Cursor to perform edits

# Supabase: ensure linked and migrations ready
supabase db push | cat

# Run locally
cd apps/read
npm run lint && npm run typecheck && npm run build && npm run dev | cat

# Commit
git add .
git commit -m "feat(realtime): unify signaling on Supabase; add presence and preflight"

# PR
git push -u origin feature/s1-realtime-presence-preflight
gh pr create --fill --title "S1: Realtime signaling, presence, preflight, guest skeleton" --body "Implements AC; screenshots and logs attached. Include Netlify preview link and QA template."
```

Verification Checklist
- Terminal logs show Realtime channel events for offer/answer/candidate.
- Presence list updates in UI when second client joins/leaves.
- Preflight page covers permissions denied/allowed and device switch.
- Legacy `apps/signal` not used in runtime (env flag off).
- Attach Netlify preview URL and completed `QA_ACCEPTANCE_TEMPLATE.md`; update `QA_DEVICE_MATRIX.md` entries.

---

## Sprint 2: Guest Limits, Magic Link/QR, Connection Metrics

Prompt: Enforce guest session constraints (30m, 2 participants, 3/day per IP/device), complete Magic Link/QR invite UX, and instrument connection metrics (first-attempt success, retries, ICE).

Key Tasks
- Create `device_limits` table and RPC/RLS for limit checks; hash IP/device client-side.
- Enforce 2 participants for guest rooms; block 3rd join with upgrade prompt.
- Session timer with 5-min remaining prompt and friendly auto-end modal.
- Metrics table `connection_events` and hooks in WebRTC manager/store.

Acceptance Criteria
- Limits enforced server-side via RLS or RPC; client cannot bypass.
- Invite UX: copy link, show QR, and share via OS share intent.
- Metrics captured per session: connect_start, connected, retry, ice_failed, ended.
- Invite completion rate and connection success visible in simple dashboard query.

CLI Workflow
```bash
# Branch
git checkout -b feature/s2-guest-limits-invite-metrics

# DB changes
supabase db generate migration s2_guest_limits_and_metrics --local | cat
# Edit generated SQL migration to add tables/RPC/RLS
supabase db push | cat

# Run
cd apps/read
npm run lint && npm run typecheck && npm run build && npm run dev | cat

# Commit/PR
git add .
git commit -m "feat(guest): enforce limits; magic link/qr; connection metrics"
git push -u origin feature/s2-guest-limits-invite-metrics
gh pr create --fill --title "S2: Guest limits + invite UX + metrics" --body "Implements AC; includes migration IDs, Netlify preview, and QA template."
```

Verification Checklist
- Third join attempt blocked with UI prompt and server denial.
- 30m timer ends session; events recorded in `connection_events`.
- QR renders and is scannable to join page.
- Attach Netlify preview URL and completed `QA_ACCEPTANCE_TEMPLATE.md`; update `QA_DEVICE_MATRIX.md` entries.

---

## Sprint 3: Audio Fallback, Reconnect + State Resume, Curated Guest Stories

Prompt: Implement audio-only fallback and reconnection with exponential backoff, persist current scene to DB, resume on rejoin, and gate guest to 3 curated stories.

Key Tasks
- Media policy manager: on failure thresholds, renegotiate with video disabled; restore video after stable window.
- Reconnect loop with backoff; channel resubscription; peer renegotiation.
- Persist `current_scene_id` to `room_sessions`; apply on join/rejoin.
- Tag 3 curated stories and filter guest library.
- Seed curated stories per `docs/scripts/SEED_STORIES.md` if not present.

Acceptance Criteria
- On induced failure, app switches to audio within N seconds and later restores video.
- After network flap, session resumes to the same scene for both peers.
- Guest story library shows only curated and all links function.

CLI Workflow
```bash
# Branch
git checkout -b feature/s3-fallback-reconnect-curated

# DB
supabase db generate migration s3_room_sessions --local | cat
# Implement table and RLS, then
supabase db push | cat

# Run
cd apps/read
npm run lint && npm run typecheck && npm run build && npm run dev | cat

# Commit/PR
git add .
git commit -m "feat(reliability): audio-only fallback; reconnect; story state resume; curated gating"
git push -u origin feature/s3-fallback-reconnect-curated
gh pr create --fill --title "S3: Fallback + Reconnect + State Resume + Curated" --body "Includes seeds if needed; attach preview and QA template."
```

Verification Checklist
- Toggle network off/on in DevTools → resume to same scene.
- Logs show downgrade to audio and later video restore.
- Curated stories visible; others hidden for guest.
- Attach Netlify preview URL and completed `QA_ACCEPTANCE_TEMPLATE.md`; update `QA_DEVICE_MATRIX.md` entries.

---

## Sprint 4: Free Basics, Conversion Prompts, Holiday Promo Hooks

Prompt: Implement bookmarks and 30-day history for free accounts, add upgrade prompts at time limit and on 3rd participant, add Stripe Checkout promo/gift entry points.

Key Tasks
- Tables: `bookmarks`, `story_history`; UI for bookmarking and history list.
- Limit prompts: 5-min remaining; 3rd participant upgrade overlay.
- Stripe Checkout links (promo code param) and gift CTA surfaces.

Acceptance Criteria
- Bookmark/unbookmark flows persist per user; history shows last 30 days.
- Prompts show at correct triggers with clear copy and CTA.
- Stripe links present (test mode) and reachable from prompts and invite.

CLI Workflow
```bash
# Branch
git checkout -b feature/s4-free-basics-prompts-promo

# DB
supabase db generate migration s4_free_basics --local | cat
# Edit, then push
supabase db push | cat

# Netlify env (promo codes)
netlify env:set STRIPE_PROMO_CODE NOV2025

# Run
cd apps/read
npm run lint && npm run typecheck && npm run build && npm run dev | cat

# Commit/PR
git add .
git commit -m "feat(free): bookmarks & history; upgrade prompts; promo hooks"
git push -u origin feature/s4-free-basics-prompts-promo
gh pr create --fill --title "S4: Free basics + prompts + promo" --body "Attach preview and QA template with AC evidence."
```

Verification Checklist
- Bookmark toggles persist and appear in history.
- Prompts fire exactly at triggers; include benefits list.
- Promo link visible and correct.
- Attach Netlify preview URL and completed `QA_ACCEPTANCE_TEMPLATE.md`; update `QA_DEVICE_MATRIX.md` entries.

---

## Sprint 5: TURN, Cross-Device QA, Dashboards, Release Readiness

Prompt: Roll out managed TURN, complete cross-device QA hardening, build KPI dashboards, and execute release readiness checks.

Key Tasks
- Configure managed TURN (provider creds); add to ICE config; secret management.
- Test matrix: Chrome/Safari/Firefox desktop; iOS Safari; Android Chrome; tablets/TVs.
- Build dashboards (SQL + simple UI or Supabase Studio) for KPIs.
- Execute release checklist and prepare on-call runbook.

Acceptance Criteria
- Strict NAT scenarios succeed via TURN; fallback verified.
- Cross-device pass rate ≥95% on primary matrix.
- Dashboards display weekly KPIs: connection success, invite completion, story completion.
- All release checklist items checked.

CLI Workflow
```bash
# Branch
git checkout -b feature/s5-turn-qa-dashboards-release

# TURN secrets
netlify env:set TURN_URL turn:provider.example.com:3478
netlify env:set TURN_USERNAME <username>
netlify env:set TURN_CREDENTIAL <password>

# Build dashboards SQL
supabase db generate migration s5_dashboards --local | cat
supabase db push | cat

# Run
cd apps/read
npm run build | cat

# Commit/PR
git add .
git commit -m "chore(release): TURN rollout; cross-device QA; KPI dashboards; readiness"
git push -u origin feature/s5-turn-qa-dashboards-release
gh pr create --fill --title "S5: TURN + QA + Dashboards + Release" --body "Attach preview links and QA artifacts (device matrix)."
```

Verification Checklist
- ICE servers include TURN env; calls succeed behind symmetric NAT.
- Test sheet completed with device/browser versions and results.
- KPI dashboards populated with recent sessions.
- Release checklist complete; rollback plan documented.
- Attach Netlify preview URL and completed `QA_ACCEPTANCE_TEMPLATE.md`; update `QA_DEVICE_MATRIX.md` entries.

---

Link: See `PRELAUNCH_SPRINT_PLAN_NOV2025.md` for goals, estimates, and gates. 

### Saved SQL (Sprint 2 metrics)

```sql
-- Weekly connection success rate
WITH attempts AS (
  SELECT session_id, MIN(ts) AS first_ts
  FROM connection_events
  WHERE event_type = 'connect_start'
  GROUP BY session_id
),
success AS (
  SELECT session_id, MIN(ts) AS connected_ts
  FROM connection_events
  WHERE event_type = 'connected'
  GROUP BY session_id
)
SELECT date_trunc('week', a.first_ts) AS week,
       COUNT(*) AS attempts,
       COUNT(s.session_id) AS successes,
       ROUND(100.0 * COUNT(s.session_id) / NULLIF(COUNT(*),0), 1) AS success_rate_pct
FROM attempts a
LEFT JOIN success s USING (session_id)
GROUP BY 1
ORDER BY 1 DESC;
```

```sql
-- Daily invite completion (sessions started per day)
SELECT date_trunc('day', started_at) AS day,
       COUNT(*) AS sessions_started
FROM guest_sessions
GROUP BY 1
ORDER BY 1 DESC;
``` 