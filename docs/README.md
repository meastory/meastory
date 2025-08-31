# Documentation

Welcome to the Read Me A Story documentation. This folder contains design, architecture, and runbook notes for the MVP.

- [READ_MVP.md](./READ_MVP.md) — What we built, how it works, and how to run it
- [WEBRTC_SIGNALING_ARCHITECTURE.md](./WEBRTC_SIGNALING_ARCHITECTURE.md) — Signaling server overview and message flows
- [LLM_STORY_GENERATION_ENGINE.md](./LLM_STORY_GENERATION_ENGINE.md) — Notes for future story generation work (placeholder/archive)
- [UI_DESIGN_DISCOVERY_ARCHIVE.md](./UI_DESIGN_DISCOVERY_ARCHIVE.md) — Discovery notes and legacy storybook concepts

Quickstart

- Local app: serve `apps/read` (e.g., `python3 -m http.server 5173 --directory apps/read`)
- Signal server: `cd apps/signal && npm install && PORT=3001 npm start`
- Mobile HTTPS: use Cloudflare Tunnel for both app and signaling endpoints
  - App: `cloudflared tunnel --url http://localhost:5173`
  - Signal: `cloudflared tunnel --url http://localhost:3001` 