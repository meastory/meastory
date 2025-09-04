# Figma Handoff — Guest Mode UI/UX

This guide captures the current UI/UX state, what to design in Figma, and how we will keep designs tightly coupled to the codebase.

## Why now
Guest mode is our try-before-you-buy. We will ship three polished stories and keep their structure stable for a long time. Perfecting layout, type, interactions, and story components now reduces rework as we scale free and paid tiers.

## Scope for Figma
Design only what exists in code today, at production fidelity. Avoid speculative features until we approve the guest mode baseline.

- Flows
  - Start → Invite → Join (preflight) → Waiting → Connected reading session
  - In-room story picking (first-time auto-open vs manual)
  - End-of-path (Read Again, Open Library)
- Screens (breakpoints)
  - Mobile portrait (375×812), Tablet landscape (1024×768), Desktop (1440×900)
- Components
  - Video grid (1–2 participants) with safe-area padding and fullscreen
  - Story overlay (title, scene text, choices)
  - Library cards and modal
  - Presence badge; mic/cam controls; fullscreen button
  - Text-scale controls (mapped to `--story-text-scale`)

## Token and style mapping
Use Figma Variables (Local mode) and/or the Figma Tokens plugin. We export JSON tokens to keep parity.

- Colors
  - `--color-primary`: #2C3E7A (Bedtime Blue)
  - `--color-accent`: #FF6B6B (Warm Coral)
  - `--color-ink`: #1B1E28
  - `--color-slate`: #6B7280
  - `--color-mist`: #E5E7EB
  - `--color-cloud`: #F7F7FA
  - `--color-white`: #FFFFFF
- Typography
  - Heading: Fraunces (Title)
  - Body: Nunito (Scene text)
  - Line-height targets: 1.6–1.7 body
- Effects
  - Subtle drop shadows for readability on dark overlay
  - Backdrop blur on story overlay
- Spacing
  - 4/8pt scale; safe-area insets honored

## Layout rules to preserve in design
- Video-first: black canvas; overlay attaches to bottom with gradient and blur
- Choices always grouped together; center-aligned; wrap on small screens
- Text scaling: design at scale=1.0; ensure constraints work from 0.75–1.75
- Orientation behavior:
  - Mobile portrait → stacked videos
  - Tablet/desktop → side-by-side videos
- Fullscreen affordances present but subtle

## Component mapping (Figma ↔ Code)
- Video Grid → `components/VideoGrid.tsx`, `components/VideoFeed.tsx`
- Story Overlay → `components/StoryOverlay.tsx` + `components/StoryPlayer.tsx`
- Library → `components/StoryLibrary.tsx`, `components/InRoomStoryPicker.tsx`
- Presence → `components/PresenceBadge.tsx`
- Controls → `components/VideoControls.tsx`, `components/FullscreenButton.tsx`
- Pages → `pages/Start.tsx`, `pages/Invite.tsx`, `pages/Join.tsx`
- Global styles → `src/styles/index.css`

Design frames should include component annotations referencing these files so we can translate 1:1 without guesswork.

## Deliverables checklist (per screen)
- Frame variants: mobile, tablet, desktop
- Redlines: spacing, sizes, font styles, states (hover/active/disabled)
- Interaction notes: tap zones, swipe, focus order, reduced-motion behavior
- Accessibility: contrast targets, touch target sizes, keyboard focus

## Anti-drift guardrails
- Keep tokens source-of-truth in repo; Figma uses synced variables
- Only design components that exist in code (or are explicitly approved)
- Capture deltas in this doc when design deviates from current implementation
- Avoid adding colors/type not in tokens; propose updates in a short RFC first

## Importing tokens into Figma
- Use Figma Tokens (or Variables) and import `/docs/tokens/ui.json`
- Map color variables to Figma color variables; set type styles
- Export decisions back to JSON when updated; commit changes with a short summary

## Next steps
1. Import tokens and set up variables
2. Create frames for each flow step and breakpoint
3. Annotate components with code references
4. Review together, then iterate to approval
5. We’ll implement with Tailwind and CSS variables; deviations require token updates 