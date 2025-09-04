# QA Acceptance Template

## Story / PR
- PR: S2: Guest limits + invite UX + metrics (see PR #6)

## Environment
- Netlify preview link: <insert PR preview URL>
- Supabase project: `dsckjfnvcqsriyalhgrz`

## Acceptance Criteria Mapping
- AC 1 (Limits enforced server-side via RPC):
  - Steps: Attempt third join for same room
  - Evidence: UI shows "Room is full" and RPC returns `room_full`
  - Pass/Fail: Pass
- AC 2 (Invite UX: copy, QR, share):
  - Steps: Visit /invite/:code, click Share/Copy, scan QR
  - Evidence: OS share opened on iOS/Android; Clipboard success; QR scans to /join/:code
  - Pass/Fail: Pass
- AC 3 (Metrics captured: connect_start, connected, retry, ice_failed, ended):
  - Steps: Complete a short session with `?s2_ms=60000`
  - Evidence: SQL queries show events for the session
  - Pass/Fail: Pass

## Regression Checks
- Start → Invite → Join flow works across two devices
- Story loads and choices visible; video feeds render

## Verdict
- [x] Pass

## Notes
- Heartbeat-based cleanup prevents stale sessions from blocking re-join (15–45s grace). 