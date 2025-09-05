# Read Me A Story — Production App

The production version of Read Me A Story, built with React, TypeScript, and Supabase.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + Radix UI
- **State Management**: Zustand
- **Backend**: Supabase (Database + Auth + Realtime + Edge Functions)
- **Hosting**: Netlify
- **CI/CD**: GitHub Actions

## Implemented Features
- Guest flow: `/start` (create room) → `/invite/:code` (share) → `/join/:code`
- Supabase Realtime signaling with presence-driven host/guest roles
- WebRTC with perfect negotiation, reconnect/backoff, phased TURN add
- DataChannel story sync (choices, story change, child name) with Realtime fallback
- Story Library to select/change stories without disconnecting
- Minimal scene resume (`rooms.current_*`) with host-only RPC update
- PWA install prompt, fullscreen controls, persisted text scaling

## Environment Variables (.env)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- Optional TURN and ICE policy:
  - `VITE_TURN_SERVERS` (JSON array) or `VITE_TURN_URL`/`VITE_TURN_USERNAME`/`VITE_TURN_CREDENTIAL`
  - `VITE_ICE_TURN_DELAY_MS`
  - `VITE_TURN_AUDIO_ONLY_ON_RELAY` (default true)
  - `VITE_ICE_PHASED_GATHERING` (default true)

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Environment variables:
   ```bash
   cp .env.example .env
   # edit values
   ```
3. Supabase:
   - Create project; set URL and anon key in `.env`
   - Apply SQL from `/supabase/migrations/`
   - Deploy Edge Function `identify_device`
4. Development:
   ```bash
   npm run dev
   ```
5. Build:
   ```bash
   npm run build
   ```

## Architecture Overview
- Stores: `authStore`, `roomStore`, `uiStore`, `webrtcStore`
- Services: `webrtcManager` (peer connections, data channel, ICE policy)
- Pages: Start/Invite/Join + auth
- Components: Video grid/feeds, story overlay/player, pickers, controls

## Development Workflow
- `npm run dev` — local dev
- `npm run build` — production build
- `npm run preview` — preview build

## Deployment
- Netlify build: `npm run build`
- Publish directory: `dist`
- Set env vars in Netlify UI

---
See `/docs/` for broader product docs.
