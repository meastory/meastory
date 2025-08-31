# WebRTC Signaling Architecture for Production

**Status**: Planning Document  
**Phase**: Pre-Production Infrastructure  
**Priority**: Required before public launch

## Problem Statement

The current MVP uses WebRTC for peer-to-peer video calling with a local WebSocket signaling server (`ws://localhost:3001`). While this works perfectly for development, it has critical limitations for production deployment:

- **No signaling server in production** - Netlify only hosts static files
- **Single point of failure** - One server handles all signaling
- **Limited scalability** - Manual server management required
- **Network limitations** - ~70-85% connection success rate without TURN servers

## Recommended Solution: Supabase Realtime Signaling

### Why Supabase Realtime?

1. **Aligns with roadmap** - We're planning to use Supabase for authentication and data storage
2. **Free tier sufficient** - Handles MVP traffic without cost
3. **No server management** - Fully managed, globally distributed
4. **Built-in persistence** - Room codes and states can be stored
5. **Easy debugging** - Real-time dashboard for connection monitoring
6. **Future-proof** - Scales automatically as we grow

## Architecture Overview

### Current Architecture (Development)
```
[User A] ←→ [WebSocket Server] ←→ [User B]
         │
         └── Facilitates WebRTC handshake only
```

### Proposed Architecture (Production)
```
[User A] ←→ [Supabase Realtime] ←→ [User B]
         │
         ├── Global edge network
         ├── Built-in persistence
         └── Integrated with future auth system
```

## Implementation Plan

### Phase 1: Basic Signaling Replacement

Replace WebSocket signaling with Supabase Realtime channels:

```javascript
// Current signaling
ws = new WebSocket('ws://localhost:3001');
ws.send(JSON.stringify({ type: 'offer', payload: offer }));

// New signaling  
const roomChannel = supabase.channel(`room:${roomId}`)
  .on('broadcast', { event: 'webrtc-signal' }, handleSignalingMessage)
  .subscribe();

roomChannel.send({
  type: 'broadcast',
  event: 'webrtc-signal', 
  payload: { type: 'offer', data: offer }
});
```

### Phase 2: Enhanced Room Management

Add database persistence for room codes and session management:

```sql
-- Room management table
CREATE TABLE rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code VARCHAR(8) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  max_participants INTEGER DEFAULT 2,
  current_participants INTEGER DEFAULT 0
);

-- Signaling message log (optional, for debugging)
CREATE TABLE signaling_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES rooms(id),
  message_type VARCHAR(20) NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Phase 3: Future Integration Points

**Authentication Integration**:
```javascript
// When we add user accounts later
const { data: { user } } = await supabase.auth.getUser();
await supabase.from('rooms').insert({
  room_code: roomCode,
  created_by: user.id,
  // ... other fields
});
```

**Story Progress Tracking**:
```javascript
// Save family story sessions
await supabase.from('story_sessions').insert({
  room_id: roomId,
  story_id: storyId,
  completed_scenes: currentSceneIndex,
  // ... session data
});
```

## Technical Implementation Details

### File Changes Required

#### New Environment Configuration
```javascript
// apps/tell/src/config.js (new file)
const SUPABASE_CONFIG = {
  url: process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co',
  anonKey: process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'
};

export default SUPABASE_CONFIG;
```

#### Updated Main Application Logic
```javascript
// apps/tell/src/signaling.js (new file)
import { createClient } from '@supabase/supabase-js';
import SUPABASE_CONFIG from './config.js';

class SupabaseSignaling {
  constructor() {
    this.supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
    this.roomChannel = null;
  }

  async joinRoom(roomId) {
    this.roomChannel = this.supabase.channel(`room:${roomId}`);
    
    this.roomChannel
      .on('broadcast', { event: 'webrtc-signal' }, (payload) => {
        this.handleSignalingMessage(payload.payload);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('User joined:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('User left:', leftPresences);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          this.onConnected?.();
        }
      });

    // Track presence
    await this.roomChannel.track({ user_id: this.userId });
  }

  sendSignal(message) {
    if (!this.roomChannel) return;
    
    this.roomChannel.send({
      type: 'broadcast',
      event: 'webrtc-signal',
      payload: message
    });
  }

  // ... rest of signaling logic
}
```

#### Modified Main Application
```javascript
// apps/tell/src/main.js (modifications)
import SupabaseSignaling from './signaling.js';

// Replace WebSocket signaling with Supabase
// const ws = new WebSocket('ws://localhost:3001');
const signaling = new SupabaseSignaling();

// Rest of WebRTC code remains unchanged
```

## Cost Analysis

### Free Tier Capacity
- **Realtime connections**: 200 concurrent (100 storytelling sessions)
- **Database storage**: 500MB (room codes, basic logging)
- **Bandwidth**: 5GB/month
- **Edge Functions**: 500K invocations/month (for room cleanup)

### Scaling Thresholds
- **MVP Phase**: Free tier sufficient for 6+ months
- **Growth Phase**: $25/month Pro tier supports thousands of users
- **Scale Phase**: Usage-based pricing beyond Pro tier

### Cost Comparison vs Alternatives

| Solution | Setup Cost | Monthly Cost | Maintenance |
|----------|------------|--------------|-------------|
| **Supabase Realtime** | Low | $0-25 | None |
| Custom signaling server | Medium | $5-20 | High |
| Daily.co | Low | $99+ | None |
| Agora | Medium | $40+ | Low |

## Connection Success Rates

### Expected Performance
- **Home/Mobile networks**: 90-95% success rate
- **Corporate networks**: 75-85% success rate  
- **Global average**: 85-90% success rate

### Enhancement Path for Higher Success Rates
1. **Phase 1**: Supabase signaling (current plan)
2. **Phase 2**: Add TURN server for problematic networks
3. **Phase 3**: Consider managed WebRTC service if needed

## Security Considerations

### Data Privacy
- **No video/audio stored** - Pure peer-to-peer after connection
- **Minimal signaling data** - Only WebRTC handshake messages
- **Automatic cleanup** - Expired rooms and messages auto-deleted

### Access Control
```sql
-- Row Level Security for rooms
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own rooms" ON rooms
FOR ALL USING (auth.uid() = created_by OR is_public = true);
```

## Migration Timeline

### Development Phase (Pre-Launch)
- **Week 1**: Set up Supabase project, implement basic signaling
- **Week 2**: Test WebRTC functionality with new signaling
- **Week 3**: Add room persistence and cleanup
- **Week 4**: Cross-device testing and optimization

### Production Deployment
- **Deploy static site** to Netlify (unchanged)
- **Configure Supabase** environment variables
- **Test production signaling** with real devices
- **Monitor connection success rates**

## Risk Mitigation

### Potential Issues
1. **Realtime connection limits** - Monitor concurrent usage
2. **WebRTC still fails** for some networks - Add TURN server later
3. **Supabase regional latency** - Check edge network coverage

### Fallback Strategy
If Supabase Realtime doesn't meet performance needs:
1. **Immediate**: Deploy simple Node.js signaling server
2. **Medium-term**: Evaluate managed WebRTC services
3. **Long-term**: Custom infrastructure with global deployment

## Success Metrics

### Technical KPIs
- **Connection success rate**: >85% target
- **Signaling latency**: <500ms average
- **Room join time**: <3 seconds end-to-end
- **Concurrent capacity**: Support 50+ simultaneous sessions

### Cost Efficiency
- **Development velocity**: Faster than custom server
- **Operational overhead**: Zero server management
- **Scaling cost**: Predictable, usage-based pricing

## Future Opportunities

### Enhanced Features (Post-MVP)
1. **Room persistence** - Save and resume story sessions
2. **Family accounts** - Link storytelling sessions to families
3. **Usage analytics** - Track popular stories, session duration
4. **Global optimization** - Edge caching for story assets
5. **Advanced matching** - Help families find each other

### Integration Benefits
- **Single authentication system** across all features
- **Unified database** for users, stories, and sessions  
- **Real-time features** beyond signaling (chat, reactions)
- **Advanced analytics** with built-in Supabase tools

---

**Next Steps**: 
1. Create Supabase project and obtain credentials
2. Implement Phase 1 signaling replacement
3. Test with existing WebRTC and story functionality
4. Deploy to production environment for validation

**Dependencies**: 
- Supabase account setup
- Environment variable configuration in Netlify
- Testing devices for cross-network validation

**Estimated Effort**: 1-2 weeks development, 1 week testing and optimization