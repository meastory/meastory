# Production Development Plan — Me A Story

## Overview

This plan outlines the transition from MVP to production-ready application using our chosen tech stack:
- **Code**: GitHub
- **Hosting**: Netlify (with subdomain management)
- **Data**: Supabase
- **Auth**: Supabase
- **Server**: Supabase Realtime

## Current State Assessment

### MVP Strengths ✅
- Functional peer-to-peer video calling
- Basic story synchronization
- Responsive UI with multiple modes
- Clean story data structure
- Working room management

### MVP Limitations ⚠️
- Monolithic 807-line JavaScript file
- No proper architecture or testing
- Manual DOM manipulation
- No build system or modules
- Mixed concerns (WebRTC + UI + story logic)

## Production Architecture

### Tech Stack Decisions

| Component | Technology | Rationale |
|-----------|------------|-----------|
| **Frontend** | React 18 + TypeScript | Component architecture, type safety, ecosystem maturity |
| **Build Tool** | Vite | Fast development, modern bundling, React optimization |
| **Styling** | Tailwind CSS + Radix UI | Design system consistency, accessibility, customization |
| **State Management** | Zustand | Simple, TypeScript-friendly, no boilerplate |
| **Data Layer** | Supabase | PostgreSQL + Auth + Realtime in one platform |
| **Video Signaling** | Supabase Realtime | Replace custom WebSocket server |
| **Hosting** | Netlify | Static hosting, subdomain support, edge functions |
| **CI/CD** | GitHub Actions | Integrated with GitHub, reliable |
| **Testing** | Vitest + Testing Library | Fast, modern, good for React |

### Repository Structure
```
meastory/
├── apps/
│   ├── read/                    # Main React application
│   │   ├── src/
│   │   │   ├── components/      # Reusable UI components
│   │   │   ├── hooks/          # Custom React hooks
│   │   │   ├── lib/            # Utilities, WebRTC helpers
│   │   │   ├── pages/          # Route-based pages
│   │   │   ├── stores/         # Zustand state management
│   │   │   ├── types/          # TypeScript definitions
│   │   │   ├── styles/         # Global styles, design tokens
│   │   │   └── stories/        # Story engine (Phase 2+)
│   │   ├── public/             # Static assets
│   │   └── package.json
│   └── mvp/                    # Legacy MVP code (reference only)
├── packages/
│   └── shared/                 # Shared utilities/types
├── docs/                       # Documentation
└── .github/
    └── workflows/              # CI/CD pipelines
```

## Phase-by-Phase Implementation Plan

### Phase 1A: Foundation & Migration (Weeks 1-2)
**Goal**: Set up production architecture while maintaining MVP functionality

#### Week 1: Infrastructure Setup
**Milestones:**
- [ ] Set up new React/TypeScript project with Vite
- [ ] Configure Supabase project and database schema
- [ ] Migrate WebRTC signaling to Supabase Realtime
- [ ] Create basic component architecture

**Technical Tasks:**
1. **Project Setup**
   ```bash
   npm create vite@latest apps/read -- --template react-ts
   cd apps/read && npm install
   ```

2. **Supabase Configuration**
   ```sql
   -- Database schema
   CREATE TABLE stories (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     title TEXT NOT NULL,
     age_range INT4RANGE,
     themes TEXT[],
     scenes JSONB NOT NULL,
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW()
   );

   CREATE TABLE rooms (
     id TEXT PRIMARY KEY,
     created_by UUID REFERENCES auth.users(id),
     story_id UUID REFERENCES stories(id),
     status TEXT DEFAULT 'waiting',
     created_at TIMESTAMPTZ DEFAULT NOW(),
     expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours')
   );
   ```

3. **WebRTC Signaling Migration**
   - Replace custom WebSocket server with Supabase Realtime
   - Use Supabase channels for room management
   - Implement presence tracking for peer connections

#### Week 2: Core Component Migration
**Milestones:**
- [ ] Migrate video calling functionality to React components
- [ ] Implement story synchronization with Supabase
- [ ] Create responsive layout system
- [ ] Set up basic authentication flow

### Phase 2: Enhanced Storytelling (Weeks 3-5)
**Goal**: Implement branching narratives and personalization

#### Week 3: Story Engine Overhaul
**Milestones:**
- [ ] Implement branching choice logic
- [ ] Add personalization system (child names, etc.)
- [ ] Create story selection interface
- [ ] Add localStorage for session persistence

#### Week 4: Personalization & Persistence
**Milestones:**
- [ ] URL parameter personalization (`?childName=Alex`)
- [ ] Session state persistence across refreshes
- [ ] Story progress tracking
- [ ] Resume interrupted sessions

#### Week 5: UI Polish & Testing
**Milestones:**
- [ ] Implement storybook design system
- [ ] Add accessibility improvements
- [ ] Write comprehensive test suite
- [ ] Performance optimization

### Phase 3: Visual Enhancement (Weeks 6-9)
**Goal**: Add AI backgrounds and AR features

#### Week 6-7: AI Background Integration
**Milestones:**
- [ ] Integrate AI image generation (DALL-E/OpenAI)
- [ ] Implement background caching in Supabase Storage
- [ ] Add fallback system for failed generations
- [ ] Create background management interface

#### Week 8: Performance & AR
**Milestones:**
- [ ] Implement performance monitoring
- [ ] Add graceful degradation for low-end devices
- [ ] Prototype AR face overlays (MediaPipe)
- [ ] Optimize video streaming quality

#### Week 9: Production Readiness
**Milestones:**
- [ ] End-to-end testing
- [ ] Load testing for concurrent users
- [ ] Security audit and hardening
- [ ] Documentation updates

### Phase 4: Business Features (Weeks 10-12)
**Goal**: Add authentication, subscriptions, and analytics

#### Week 10: Authentication System
**Milestones:**
- [ ] Implement Supabase Auth for adult accounts
- [ ] Create user profiles and preferences
- [ ] Add session management and security
- [ ] Implement proper room ownership

#### Week 11: Subscription & Premium Features
**Milestones:**
- [ ] Integrate Stripe for subscriptions
- [ ] Implement premium content gating
- [ ] Add usage limits for free users
- [ ] Create billing dashboard

#### Week 12: Analytics & Launch
**Milestones:**
- [ ] Set up privacy-focused analytics (Plausible)
- [ ] Implement conversion tracking
- [ ] Create admin dashboard
- [ ] Final security and performance review

## Technical Implementation Details

### Component Architecture

```typescript
// src/components/layout/
export const StorybookLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="storybook-mode">
      <div className="page-container">
        <div className="left-page">{children}</div>
        <div className="right-page">{/* Video and controls */}</div>
      </div>
    </div>
  );
};

// src/components/video/
export const VideoRoom = () => {
  const { roomId } = useRoomStore();
  const { localStream, remoteStream } = useWebRTC();
  
  return (
    <div className="video-container">
      <VideoFeed stream={localStream} muted />
      <VideoFeed stream={remoteStream} />
    </div>
  );
};
```

### State Management

```typescript
// src/stores/roomStore.ts
interface RoomState {
  id: string | null;
  status: 'waiting' | 'connected' | 'disconnected';
  participants: Participant[];
  story: Story | null;
  currentScene: string;
}

export const useRoomStore = create<RoomState & RoomActions>((set, get) => ({
  // State and actions...
}));
```

### WebRTC with Supabase Realtime

```typescript
// src/hooks/useWebRTC.ts
export const useWebRTC = (roomId: string) => {
  const channel = useSupabaseChannel(`room-${roomId}`);
  
  useEffect(() => {
    // WebRTC peer connection setup
    const pc = new RTCPeerConnection();
    
    // Signaling through Supabase
    channel.on('broadcast', { event: 'offer' }, (payload) => {
      pc.setRemoteDescription(payload);
    });
    
    return () => pc.close();
  }, [roomId]);
};
```

## CI/CD Pipeline

### GitHub Actions Workflow
```yaml
# .github/workflows/deploy.yml
name: Deploy to Netlify
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test
      - run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: netlify/actions/cli@master
        with:
          args: deploy --dir=apps/read/dist --prod
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

## Database Schema

```sql
-- Core tables
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  subscription_tier TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  age_range INT4RANGE,
  themes TEXT[],
  scenes JSONB NOT NULL,
  is_premium BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE rooms (
  id TEXT PRIMARY KEY,
  created_by UUID REFERENCES auth.users(id),
  story_id UUID REFERENCES stories(id),
  status TEXT DEFAULT 'waiting',
  participants JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours')
);

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id TEXT REFERENCES rooms(id),
  user_id UUID REFERENCES auth.users(id),
  story_progress JSONB,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);
```

## Risk Mitigation

### Technical Risks
- **WebRTC Compatibility**: Extensive cross-browser testing, fallback strategies
- **Supabase Limits**: Monitor usage, implement caching, plan for scaling
- **AI Generation Costs**: Implement caching, usage limits, cost monitoring

### Business Risks
- **Timeline Slippage**: Phased approach allows for incremental delivery
- **Feature Creep**: Strict adherence to phase milestones and success criteria
- **Performance Issues**: Regular performance testing and optimization

## Success Metrics

### Phase 1A (Weeks 1-2)
- [ ] MVP functionality preserved in new architecture
- [ ] WebRTC signaling working with Supabase
- [ ] Component architecture established

### Phase 2 (Weeks 3-5)
- [ ] 90%+ successful connections
- [ ] Branching choices working
- [ ] Personalization system functional

### Phase 3 (Weeks 6-9)
- [ ] AI backgrounds generating reliably
- [ ] Performance >30fps on target devices
- [ ] 40%+ WAU retention

### Phase 4 (Weeks 10-12)
- [ ] Authentication system stable
- [ ] 10%+ conversion to premium
- [ ] Positive contribution margin

---

*Last Updated: $(date)*
*Document Version: 1.0*
