# Read MVP Overview

Goals

- Simple, resilient two-person storytelling over WebRTC
- Video-first experience: human connection front and center; story overlays enhance, not distract
- Storybook mode retained as an opt-in for future exploration

Modes

- Default video-first: full-screen split/stack video with bottom story overlay
  - Overlay includes story text, mirrored choice buttons, and +/− text-size controls
  - Minimal controls: menu (logo), mic, camera; auto-hide chrome philosophy
- Storybook (opt-in): `?storybook=1` or `?mode=storybook`
  - SVG-bounded video masks, parchment-like choice buttons

Architecture (MVP)

- Frontend: vanilla HTML/CSS/JS in `apps/read`
  - WebRTC: `RTCPeerConnection`, robust autoplay handling, single Start overlay
  - Perfect negotiation pattern, candidate queuing, ICE restart handling
  - DataChannel for story state sync (story selection, scene changes, choices)
- Signaling: Node `ws` server in `apps/signal` (local ws:// by default)
  - Quick Cloudflare Tunnel recommended for iOS camera/mic permissions (HTTPS)
- Stories: JSON content in `apps/read/stories` with `background` hinting

Key Files

- `apps/read/index.html` — App shell; now defaults to video-first mode
- `apps/read/src/main.js` — WebRTC, story sync, Start overlay, menu, VF controls
- `apps/read/src/styles.css` — Namespaced styles for video-first and storybook
- `apps/signal/server.js` — WebSocket signaling

Setup

1) App

```sh
python3 -m http.server 5173 --directory apps/read
```

2) Signal

```sh
cd apps/signal
npm install --no-audit --no-fund
PORT=3001 npm start
```

3) Optional: HTTPS tunnels (for iOS cam/mic)

```sh
cloudflared tunnel --url http://localhost:5173
cloudflared tunnel --url http://localhost:3001
```

Join Flow

- Creator: Start Room → URL updates with `room` and `createdAt`; link copied
- Joiner: Open the link; both click Start overlay to prime autoplay; allow permissions

Controls

- Mic/cam (video-first): top-left of local video; icons reflect sender state
- Menu (logo): top-right; opens a panel cloning Start/Join/Story selection controls
- +/−: inline with choices at bottom-right; scales story text and choice labels; persisted

Troubleshooting

- iOS permissions: require HTTPS origin → use Cloudflare Tunnel
- If remote video drops on refresh: the perfect negotiation pattern is implemented; re-open link or retry Start/Join
- Favicon 404s: we ship a logo-anchored SVG favicon

Housekeeping

- Unused assets removed: unused frames, textures
- Video-first is the default; storybook is optional via query flag 