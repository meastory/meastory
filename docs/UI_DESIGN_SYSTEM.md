# UI Design System — Storybook Experience

## Vision Statement
Create a full-screen, immersive storytelling experience that feels like opening a treasured family storybook. The interface should disappear into the magic of the story while remaining intuitive and accessible across all devices.

## Core Design Philosophy
- **"Treasured storybook"** — Every design decision should serve the storytelling experience
- **Minimal UI chrome** — Let the story and human connection take center stage
- **Universal accessibility** — Works beautifully on laptops, tablets, phones, and TVs
- **Intuitive navigation** — Multiple ways to interact, following user expectations
- **Progressive enhancement** — Start elegant, build toward immersive

## Layout Architecture

### Responsive Split-View System

#### Landscape Orientation (laptops, tablets horizontal, TVs)
```
┌─────────────────┬─────────────────┐
│   Left Page     │   Right Page    │
│                 │                 │
│  [Video Feed A] │  [Video Feed B] │
│                 │                 │
│  Story text     │  Story text     │
│  flows around   │  continues here │
│  video window   │                 │
│                 │  [Action Btns]  │
└─────────────────┴─────────────────┘
```

#### Portrait Orientation (phones, tablets vertical)
```
┌─────────────────────────────────────┐
│           Top Page                  │
│                                     │
│        [Video Feed A]               │
│                                     │
│  Story text flows around video      │
├─────────────────────────────────────┤
│          Bottom Page                │
│                                     │
│        [Video Feed B]               │
│                                     │
│  Story text continues here          │
│                                     │
│        [Action Buttons]             │
└─────────────────────────────────────┘
```

### Story Flow Pattern
1. **Reading Progression**: Top of left page → bottom of left page → top of right page → bottom of right page
2. **Action Placement**: Consistently at bottom of right page (landscape) or bottom page (portrait)
3. **Video Integration**: Feeds positioned to create natural text flow around them

## Video Integration Strategy

### Phase 1: Storybook Frames (MVP Implementation)
- **Concept**: Embed video feeds within decorative vintage frames
- **Styling**: Ornate picture frames, oval portraits, or themed shapes
- **Integration**: Frames become part of the page background texture
- **Text Flow**: CSS Shapes for magazine-style text wrapping around frames

### Progressive Enhancement Path
1. **Phase 1**: Beautiful static frames with subtle shadows/textures
2. **Phase 2**: Context-aware frames (ocean scene = porthole, castle = window)
3. **Phase 3**: Background removal, AR effects, animated elements

### Frame Design Guidelines
- **Material**: Aged wood, ornate metal, or story-themed materials
- **Shape**: Circular, oval, or contextually appropriate (mirrors, windows, etc.)
- **Shadow/Depth**: Subtle drop shadows to integrate with page
- **Size**: Proportional to screen size, doesn't dominate text

## Visual Design System

### Base Aesthetic: "Worn Storybook"
- **Paper Texture**: Cream/ivory base with subtle aged paper texture
- **Aging Effects**: Light wear marks and texture (not distracting)
- **Color Temperature**: Warm, inviting tones
- **Depth**: Soft drop shadows and layering for dimensional feel

### Typography Integration
- **Primary**: Fraunces (display/headings) + Nunito (body)
- **Text Layout**: Magazine-style wrapping around video frames
- **Line Spacing**: Generous spacing for readability across devices
- **Hierarchy**: Clear but integrated with storybook aesthetic

### Action Button Design
- **Styling**: Parchment scrolls, wooden signs, or themed elements
- **Placement**: Consistent positioning (bottom-right/bottom)
- **States**: Tactile hover/press feedback
- **Integration**: Feels part of the story, not UI chrome

## Navigation & Interaction

### Multi-Modal Page Turning
1. **Swipe Gestures**: 
   - Landscape: Left/right swipe
   - Portrait: Up/down swipe
2. **Edge Tap Zones**: 
   - Invisible but intuitive tap areas on page edges
3. **Visual Controls**: 
   - Subtle arrow buttons styled as book page corners
   - Only visible on hover/when needed
4. **Keyboard**: Arrow keys for accessibility
5. **Action Buttons**: Direct story progression, no confirmation dialogs

### Page Turn Transitions
- **Animation**: CSS 3D transforms for realistic page turning
- **Timing**: Natural, gentle curve (not too fast/slow)
- **Direction**: 
  - Landscape: Right to left page turn
  - Portrait: Bottom to top page turn
- **Enhancement**: Optional paper rustle sound effect

## UI Chrome (Minimal Approach)

### Header Design
- **Content**: Hamburger menu (left) + Logo (right)
- **Behavior**: Slides away after story begins
- **Access**: Tap/hover on top edge to reveal
- **Mobile**: Standard hamburger pattern users expect

### Story Mode Interface
- **Chrome**: None during active storytelling
- **Controls**: All accessible via hamburger menu
- **Emergency**: Always-available exit option
- **Status**: Subtle progress indicators if needed

## Technical Implementation Strategy

### CSS Architecture
```css
.storybook-layout {
  display: grid;
  height: 100vh;
  grid-template: [responsive based on orientation];
}

.story-page {
  position: relative;
  background: url('paper-texture.png');
  padding: 2rem;
}

.video-frame {
  float: left; /* or right based on layout */
  shape-outside: circle(50%); /* or appropriate shape */
  margin: 1rem;
  border: 3px solid #8B4513; /* frame styling */
  border-radius: 50%;
  box-shadow: 0 4px 8px rgba(0,0,0,0.3);
}

.story-text {
  font-family: 'Nunito', sans-serif;
  line-height: 1.7;
  font-size: clamp(16px, 2.5vw, 20px);
}
```

### Responsive Strategy
- **CSS Grid + Flexbox**: Hybrid approach for layout flexibility
- **Container Queries**: When supported, for component-level responsiveness
- **Orientation Detection**: CSS media queries for landscape/portrait layouts
- **Progressive Enhancement**: Base layout works without JavaScript

### Layer Management
- **Z-Index Hierarchy**:
  - Background texture: z-index: -1
  - Story elements: z-index: 0
  - Video frames: z-index: 1
  - UI controls: z-index: 2
  - Modal overlays: z-index: 10

## Accessibility Considerations

### Navigation
- **Keyboard Support**: Full keyboard navigation for all interactions
- **Screen Reader**: Proper ARIA labels for story progression
- **Focus Management**: Clear focus indicators that fit the theme
- **Touch Targets**: Minimum 44px touch targets for mobile

### Visual
- **Contrast**: Maintain 4.5:1 ratio while preserving aesthetic
- **Font Size**: Responsive scaling with user preferences
- **Motion**: Respect prefers-reduced-motion settings
- **Color**: Don't rely solely on color for important information

## Story Content Integration

### Text Flow Guidelines
- **Wrapping**: Text naturally flows around video frames
- **Balance**: Even distribution across pages when possible
- **Hierarchy**: Story title, scene text, choices clearly differentiated
- **Pacing**: Text length appropriate for page size and reading flow

### Background Integration
- **Base Layer**: Consistent paper texture across all stories
- **Story Layer**: Context-specific backgrounds blend with base
- **Transparency**: Story backgrounds should not overwhelm text readability
- **Transitions**: Smooth blending between scenes

## Implementation Phases

### Phase 1: Core Storybook Layout (MVP)
- Responsive split-view system
- Basic video frames with styling
- Text flow around video elements
- Simple page turn transitions
- Multi-modal navigation

### Phase 2: Enhanced Polish
- Context-aware video frames
- Advanced page turn animations
- Improved textures and visual depth
- Sound effects and haptic feedback
- Micro-interactions and hover states

### Phase 3: Immersive Features
- Background removal for video feeds
- AR-style overlay effects
- Animated story elements
- Dynamic lighting and shadows
- Advanced gesture recognition

## Success Metrics

### User Experience
- **Intuitive Navigation**: 90%+ users can turn pages without instruction
- **Cross-Device Consistency**: Uniform experience across device types
- **Performance**: Smooth 60fps animations on target devices
- **Accessibility**: Full keyboard and screen reader support

### Technical
- **Load Time**: Sub-2-second initial page load
- **Responsive**: Works on viewport widths 320px - 4K
- **Browser Support**: Latest 2 versions of major browsers
- **Graceful Degradation**: Core functionality without JavaScript

---

*This design system balances the magical feel of a treasured storybook with modern web capabilities, ensuring the technology serves the story rather than competing with it.*