# Storybook UI Reintroduction Plan (Feature-Flagged)

Flag: `?storybook=1` (or `?sb=1`)
Scope: Keep MVP stable on default. Storybook UI mounts only when the flag is present.

## Milestone 1 — Framed videos (both peers)
- Implement framed local/remote video slots (oval, rectangle)
- Role detection from `start-call` only; attach local preview after role set
- Autoplay handling (playsinline + explicit play retries)
- Acceptance:
  - Both peers see both feeds in the correct frames (Chrome, Safari)
  - Local muted; remote audible; no console autoplay errors

## Milestone 2 — Typography and text layout
- Title and paragraph styles per design system
- Responsive font sizes; line-height; margins
- Acceptance:
  - Readable at phone/tablet/desktop; no overlaps; meets contrast

## Milestone 3 — Choices (adaptive)
- Parchment buttons with flexible sizing and wrapping
- Choices positioned below/right of text with responsive spacing
- Acceptance:
  - Long labels do not squash; wrap cleanly; clearly tappable

## Milestone 4 — Header/menu behavior
- Minimal header (hamburger + logo); non-invasive
- Sidebar menu with Start/Join + Story Select; auto-close on actions
- Acceptance:
  - Header does not occlude pages; sidebar closes after select/start/join

## Milestone 5 — Background layer
- Paper texture + scene background behind pages only
- Acceptance:
  - No legacy overlays; smooth background changes

## Milestone 6 — Page-turn animation
- True book-like turn: perspective, per-page origins, shadow pass
- Orientation-aware (rotateY landscape, rotateX portrait)
- Acceptance:
  - Looks like a physical turn; no "squeeze" effect; 60fps target

## Milestone 7 — Gestures & keyboard
- Edge tap zones; swipe; arrow keys; accessibility labels
- Acceptance:
  - Right-to-left swipe → next; left-to-right → previous (landscape)

## Validation & QA
- Chrome macOS, Safari macOS/iPadOS, Firefox desktop
- Two-device test for video + sync
- Accessibility pass (focus order; labels; reduced motion)

## Rollout
- Behind `?storybook=1` until all milestones pass
- Flip default after sign-off; leave flag to force-enable/disable for testing 