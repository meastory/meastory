const storyTitleEl = document.getElementById('storyTitle');
const sceneTextEl = document.getElementById('sceneText');
const choicesEl = document.getElementById('choices');
const backgroundEl = document.getElementById('background');
const nextButton = document.getElementById('nextButton');
const prevButton = document.getElementById('prevButton');

const startRoomButton = document.getElementById('startRoomButton');
const joinRoomButton = document.getElementById('joinRoomButton');
const roomCodeInput = document.getElementById('roomCodeInput');

const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const toggleMicBtn = document.getElementById('toggleMic');
const toggleCamBtn = document.getElementById('toggleCam');

const storySelect = document.getElementById('storySelect');
const loadStoryButton = document.getElementById('loadStoryButton');

let story = null;
let currentSceneIndex = 0;

let ws;
let pc;
let localStream;
let dataChannel;
let currentRole = null; // 'caller' | 'callee'
let wsRetryMs = 1000;
let pendingIceCandidates = [];
let makingOffer = false;
// Track/sender state for reliable local/remote toggles
let audioSender = null;
let videoSender = null;
let audioTrackOriginal = null;
let videoTrackOriginal = null;
let isVideoSending = true;

// Storybook flags
const IS_STORYBOOK = (() => { try { const p = new URLSearchParams(location.search); return p.has('storybook') || p.get('sb') === '1'; } catch (_) { return false; } })();
const IS_VIDEO_FIRST = (() => { try { return (new URLSearchParams(location.search).get('mode') || '').toLowerCase() === 'video-first'; } catch (_) { return false; } })();
let autoplayPrimed = false;

const iceServers = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

function log(...args) { try { console.log('[webrtc]', ...args); } catch (_) {} }

function attachDataChannel(channel) {
  try { if (dataChannel && dataChannel !== channel) dataChannel.close?.(); } catch (_) {}
  dataChannel = channel;
  try { dataChannel.binaryType = 'arraybuffer'; } catch (_) {}
  dataChannel.onopen = () => log('datachannel open');
  dataChannel.onclose = () => { log('datachannel close'); dataChannel = null; };
  dataChannel.onerror = (e) => log('datachannel error', e?.message || e);
  dataChannel.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      handleSyncMessage(msg);
    } catch (e) {
      log('datachannel parse error', e);
    }
  };
}

function addMissingLocalTracks() {
  if (!pc || !localStream) return;
  // Ensure we have up-to-date sender refs
  try {
    const senders = pc.getSenders?.() || [];
    if (!audioSender) audioSender = senders.find(s => s.track && s.track.kind === 'audio') || audioSender;
    if (!videoSender) videoSender = senders.find(s => s.track && s.track.kind === 'video') || videoSender;
  } catch (_) {}
  // Audio: always attach if missing
  const audioTrack = audioTrackOriginal || localStream.getAudioTracks()[0];
  if (audioTrack) {
    if (audioSender && audioSender.track !== audioTrack) {
      try { audioSender.replaceTrack(audioTrack); } catch (_) {}
    } else if (!audioSender) {
      try { audioSender = pc.addTrack(audioTrack, localStream); } catch (_) {}
    }
  }
  // Video: attach only if we are sending video
  const videoTrack = videoTrackOriginal || localStream.getVideoTracks()[0];
  if (isVideoSending && videoTrack) {
    if (videoSender && videoSender.track !== videoTrack) {
      try { videoSender.replaceTrack(videoTrack); } catch (_) {}
    } else if (!videoSender) {
      try { videoSender = pc.addTrack(videoTrack, localStream); } catch (_) {}
    }
  }
}

function flushPendingIceCandidates() {
  if (!pc || !pc.remoteDescription) return;
  const queue = pendingIceCandidates;
  pendingIceCandidates = [];
  for (const c of queue) {
    try { pc.addIceCandidate(c); } catch (e) { log('flush candidate error', e); }
  }
}

function isPolitePeer() { return currentRole === 'callee'; }

// Allow overriding signaling URL via ?signal=... (e.g., wss://example.trycloudflare.com)
function getSignalWebSocketUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    const override = params.get('signal');
    if (override) return override;
  } catch (_) {}
  return 'ws://localhost:3001';
}

function resetPeer({ keepLocalStream } = { keepLocalStream: true }) {
  try {
    if (pc) {
      try { pc.ontrack = null; pc.ondatachannel = null; pc.onicecandidate = null; pc.oniceconnectionstatechange = null; pc.onconnectionstatechange = null; } catch (_) {}
      try {
        const senders = pc.getSenders?.() || [];
        senders.forEach(s => { try { pc.removeTrack(s); } catch (_) {} });
      } catch (_) {}
      try { pc.close(); } catch (_) {}
    }
  } catch (_) {}
  pc = null;
  pendingIceCandidates = [];
  // Reset sender state so we reattach correctly on next call
  audioSender = null;
  videoSender = null;
  try { if (dataChannel) dataChannel.close?.(); } catch (_) {}
  dataChannel = null;
  if (remoteVideo && remoteVideo.srcObject) remoteVideo.srcObject = null;
  if (!keepLocalStream && localStream) {
    try { localStream.getTracks().forEach(t => t.stop()); } catch (_) {}
    localStream = null;
    if (localVideo) localVideo.srcObject = null;
  }
}

async function loadStoryById(storyId) {
  const response = await fetch(`./stories/${storyId}.json`);
  if (!response.ok) {
    storyTitleEl.textContent = 'Failed to load story';
    return;
  }
  story = await response.json();
  storyTitleEl.textContent = story.title;
  renderScene(0);
}

// Replace default loader to use selected value
async function loadDefaultStory() {
  const initial = storySelect?.value || 'dragon-adventure';
  await loadStoryById(initial);
}

if (loadStoryButton) {
  loadStoryButton.addEventListener('click', async () => {
    const id = storySelect.value;
    await loadStoryById(id);
    sendSync({ type: 'story', id });
  });
}

function renderScene(index) {
  if (!story) return;
  currentSceneIndex = Math.max(0, Math.min(index, story.scenes.length - 1));
  const scene = story.scenes[currentSceneIndex];
  sceneTextEl.textContent = personalize(scene.text);
  backgroundEl.style.backgroundImage = scene.background ? `url(./public/backgrounds/${scene.background})` : 'none';

  // Choices
  choicesEl.innerHTML = '';
  if (Array.isArray(scene.choices) && scene.choices.length > 0) {
    scene.choices.forEach((choice, idx) => {
      const btn = document.createElement('button');
      btn.className = 'btn';
      btn.textContent = choice.label;
      btn.addEventListener('click', () => {
        if (choice.nextSceneId) {
          const nextIndex = story.scenes.findIndex(s => s.id === choice.nextSceneId);
          if (nextIndex !== -1) renderScene(nextIndex);
        } else {
          renderScene(currentSceneIndex + 1);
        }
      });
      choicesEl.appendChild(btn);
    });
  }

  prevButton.disabled = currentSceneIndex === 0;
  nextButton.disabled = currentSceneIndex >= story.scenes.length - 1;
}

function personalize(text) {
  const params = new URLSearchParams(window.location.search);
  const childName = params.get('childName') || 'Friend';
  return text.replaceAll('{{childName}}', childName);
}

function sendSync(message) {
  try {
    if (dataChannel && dataChannel.readyState === 'open') {
      dataChannel.send(JSON.stringify(message));
    }
  } catch (_) {}
}

function handleSyncMessage(msg) {
  if (msg.type === 'story') {
    if (!story || story.id !== msg.id) {
      loadStoryById(msg.id);
    }
    return;
  }
  if (msg.type === 'scene') {
    renderScene(msg.index);
  } else if (msg.type === 'choice') {
    const nextIndex = story.scenes.findIndex(s => s.id === msg.nextSceneId);
    if (nextIndex !== -1) renderScene(nextIndex);
  }
}

// Hook into existing UI actions
nextButton.addEventListener('click', () => {
  const next = currentSceneIndex + 1;
  renderScene(next);
  sendSync({ type: 'scene', index: next });
});
prevButton.addEventListener('click', () => {
  const prev = currentSceneIndex - 1;
  renderScene(prev);
  sendSync({ type: 'scene', index: prev });
});

// Patch choice buttons in renderScene to send sync
const originalRenderScene = renderScene;
renderScene = function(index) {
  originalRenderScene(index);
  const scene = story?.scenes?.[currentSceneIndex];
  if (!scene) return;
  // Rebind choices to also sync
  choicesEl.querySelectorAll('button').forEach((btn, idx) => {
    const choice = scene.choices?.[idx];
    if (!choice) return;
    btn.addEventListener('click', () => {
      sendSync({ type: 'choice', nextSceneId: choice.nextSceneId || null });
    }, { once: true });
  });
};

// Session scaffolding (placeholder)
function generateRoomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

// Helper: resilient autoplay with fallback and tap-to-unmute
async function tryPlay(videoEl, { wantsAudio } = { wantsAudio: true }) {
  if (!videoEl) return;
  try {
    videoEl.playsInline = true;
    if (!wantsAudio) videoEl.muted = true;
    await videoEl.play();
  } catch (err) {
    // Autoplay blocked; try muted fallback
    try {
      videoEl.muted = true;
      await videoEl.play();
      // In storybook or video-first we use a single Start overlay; skip per-video overlays
      const suppress = IS_STORYBOOK || IS_VIDEO_FIRST || autoplayPrimed;
      if (wantsAudio && !suppress) {
        injectUnmuteButton(videoEl);
      }
    } catch (_) {
      // As a last resort, show a play overlay (suppressed in storybook/video-first)
      const suppress = IS_STORYBOOK || IS_VIDEO_FIRST || autoplayPrimed;
      if (!suppress) injectPlayButton(videoEl, wantsAudio);
    }
  }
}

function injectUnmuteButton(videoEl) {
  const parent = videoEl.parentElement || document.body;
  if (parent.querySelector('.unmute-overlay')) return;
  const btn = document.createElement('button');
  btn.textContent = 'Enable audio';
  btn.className = 'unmute-overlay';
  Object.assign(btn.style, {
    position: 'absolute', bottom: '12px', left: '12px', zIndex: 5,
    padding: '8px 12px', borderRadius: '8px', border: '1px solid #2C3E7A',
    background: '#FFFFFFAA', color: '#2C3E7A', fontWeight: '700', cursor: 'pointer'
  });
  parent.style.position = parent.style.position || 'relative';
  parent.appendChild(btn);
  btn.addEventListener('click', async () => {
    try {
      videoEl.muted = false;
      await videoEl.play();
      btn.remove();
    } catch (_) {}
  });
}

function injectPlayButton(videoEl, wantsAudio) {
  const parent = videoEl.parentElement || document.body;
  if (parent.querySelector('.play-overlay')) return;
  const btn = document.createElement('button');
  btn.textContent = 'Tap to play';
  btn.className = 'play-overlay';
  Object.assign(btn.style, {
    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
    zIndex: 5, padding: '10px 14px', borderRadius: '10px', border: '1px solid #2C3E7A',
    background: '#FFFFFFCC', color: '#2C3E7A', fontWeight: '700', cursor: 'pointer'
  });
  parent.style.position = parent.style.position || 'relative';
  parent.appendChild(btn);
  btn.addEventListener('click', async () => {
    try {
      videoEl.playsInline = true;
      if (!wantsAudio) videoEl.muted = true;
      await videoEl.play();
      btn.remove();
      if (wantsAudio && videoEl.muted) injectUnmuteButton(videoEl);
    } catch (_) {}
  });
}

// Update local preview to use tryPlay
async function ensureMedia() {
  if (localStream) return localStream;
  log('requesting user media');
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
  } catch (e) {
    alert('Unable to access camera/microphone. Please allow permissions and try again.');
    throw e;
  }
  audioTrackOriginal = localStream.getAudioTracks()[0] || audioTrackOriginal;
  videoTrackOriginal = localStream.getVideoTracks()[0] || videoTrackOriginal;
  localVideo.srcObject = localStream;
  tryPlay(localVideo, { wantsAudio: false });
  return localStream;
}

// Ensure remote playback uses tryPlay as well
function attachRemoteStream(stream) {
  remoteVideo.srcObject = stream;
  tryPlay(remoteVideo, { wantsAudio: true });
}

function connectSignal() {
  if (ws && ws.readyState === WebSocket.OPEN) return;
  const roomId = new URLSearchParams(location.search).get('room');
  if (!roomId) return alert('No room code present.');
  ws = new WebSocket(getSignalWebSocketUrl());
  ws.onopen = () => {
    log('ws open, joining room', roomId);
    wsRetryMs = 1000; // reset backoff on success
    ws.send(JSON.stringify({ type: 'join', roomId }));
  };
  ws.onmessage = async (event) => {
    const msg = JSON.parse(event.data);
    log('ws message', msg.type);
    switch (msg.type) {
      case 'hello':
      case 'joined':
      case 'peer-waiting':
        // no-op
        break;
      case 'start-call':
        log('start-call', msg.role);
        currentRole = msg.role;
        // Fresh RTCPeerConnection for each call
        resetPeer({ keepLocalStream: true });
        await startPeer(msg.role);
        break;
      case 'offer': {
        log('received offer');
        await ensurePeer();
        const offer = msg.payload;
        const offerCollision = makingOffer || pc.signalingState !== 'stable';
        const polite = isPolitePeer();
        try {
          if (offerCollision) {
            if (!polite) {
              log('glare: ignoring offer');
              return;
            }
            log('glare: rolling back');
            await pc.setLocalDescription({ type: 'rollback' });
          }
          await pc.setRemoteDescription(offer);
          flushPendingIceCandidates();
          if (!localStream) localStream = await ensureMedia();
          addMissingLocalTracks();
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          ws.send(JSON.stringify({ type: 'answer', payload: answer }));
        } catch (e) {
          log('offer handling error', e);
        }
        break;
      }
      case 'answer': {
        log('received answer');
        try {
          await pc.setRemoteDescription(msg.payload);
          flushPendingIceCandidates();
        } catch (e) {
          log('answer handling error', e);
        }
        break;
      }
      case 'candidate':
        try {
          if (pc && pc.remoteDescription) {
            await pc.addIceCandidate(msg.payload);
            log('added candidate');
          } else {
            pendingIceCandidates.push(msg.payload);
            log('queued candidate');
          }
        } catch (e) {
          log('candidate error', e);
        }
        break;
      case 'peer-left':
        log('peer-left');
        resetPeer({ keepLocalStream: true });
        break;
      case 'room-full':
        alert('Room is full.');
        break;
      case 'error':
        log('signal error', msg.error);
        break;
      default:
        break;
    }
  };
  ws.onerror = () => {
    log('ws error');
  };
  ws.onclose = () => {
    log('ws closed, retrying soon');
    const jitter = Math.floor(Math.random() * 250);
    setTimeout(connectSignal, wsRetryMs + jitter);
    wsRetryMs = Math.min(wsRetryMs * 2, 10000);
  };
}

async function ensurePeer() {
  if (pc) return pc;
  log('creating RTCPeerConnection');
  pc = new RTCPeerConnection(iceServers);
  pc.onicecandidate = (e) => {
    if (e.candidate) ws?.send(JSON.stringify({ type: 'candidate', payload: e.candidate }));
  };
  pc.oniceconnectionstatechange = () => {
    log('ice state', pc.iceConnectionState);
    if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
      tryIceRestart();
    }
  };
  pc.ontrack = (e) => {
    log('ontrack received');
    attachRemoteStream(e.streams[0]);
  };
  pc.onconnectionstatechange = () => {
    log('connection state', pc.connectionState);
  };
  pc.onsignalingstatechange = () => {
    log('signaling state', pc.signalingState);
  };
  pc.onnegotiationneeded = async () => {
    // Caller drives negotiation
    if (currentRole !== 'caller') return;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    try {
      makingOffer = true;
      log('negotiationneeded: creating offer');
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      ws.send(JSON.stringify({ type: 'offer', payload: offer }));
    } catch (e) {
      log('negotiationneeded error', e);
    } finally {
      makingOffer = false;
    }
  };
  // Data channel will be created by caller in startPeer
  pc.ondatachannel = (event) => attachDataChannel(event.channel);
  return pc;
}

async function tryIceRestart() {
  if (!pc) return;
  if (currentRole === 'caller') {
    log('attempting ICE restart (caller)');
    const offer = await pc.createOffer({ iceRestart: true });
    await pc.setLocalDescription(offer);
    ws?.send(JSON.stringify({ type: 'offer', payload: offer }));
  } else {
    log('waiting for caller ICE restart');
  }
}

async function startPeer(role) {
  await ensurePeer();
  // Ensure we have local media and (re)attach tracks to the new RTCPeerConnection
  if (!localStream) {
    localStream = await ensureMedia();
  }
  addMissingLocalTracks();
  if (role === 'caller') {
    // Create data channel from caller side
    try { attachDataChannel(pc.createDataChannel('story')); } catch (_) {}
    log('creating offer');
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    ws.send(JSON.stringify({ type: 'offer', payload: offer }));
  } else {
    log('callee ready, waiting for offer');
  }
}

// Mic/camera toggles unified
function toggleMicSend() {
  if (!localStream) return;
  const track = audioTrackOriginal || localStream.getAudioTracks()[0];
  if (!track) return;
  const next = !track.enabled;
  try { track.enabled = next; } catch (_) {}
  // Ensure sender points at the current track when enabling back
  if (audioSender && audioSender.track !== track && next) {
    try { audioSender.replaceTrack(track); } catch (_) {}
  }
  // Update legacy button label if present
  if (toggleMicBtn) toggleMicBtn.textContent = next ? 'Mute' : 'Unmute';
}
function toggleCamSend() {
  if (!localStream) return;
  const track = videoTrackOriginal || localStream.getVideoTracks()[0];
  const currentlySending = !!isVideoSending;
  const wantSend = !currentlySending;
  isVideoSending = wantSend;
  try {
    // Local preview
    if (track) track.enabled = wantSend;
    // Remote sending via replaceTrack
    if (videoSender) {
      try { videoSender.replaceTrack(wantSend ? track : null); } catch (_) {}
    } else if (wantSend && track && pc) {
      try { videoSender = pc.addTrack(track, localStream); } catch (_) {}
    }
  } catch (_) {}
  if (toggleCamBtn) toggleCamBtn.textContent = wantSend ? 'Camera Off' : 'Camera On';
}

function isExpired(url) {
  const createdAt = Number(url.searchParams.get('createdAt') || '');
  if (!createdAt) return false;
  const ageMs = Date.now() - createdAt;
  return ageMs > 24 * 60 * 60 * 1000;
}

function enforceExpiry() {
  const url = new URL(window.location.href);
  if (isExpired(url)) {
    alert('This session link has expired. Please ask the adult to create a new link.');
    // Disable join actions
    joinRoomButton.disabled = true;
  }
}

startRoomButton.addEventListener('click', async () => {
  const code = generateRoomCode();
  const url = new URL(window.location.href);
  url.searchParams.set('room', code);
  url.searchParams.set('createdAt', String(Date.now()));
  // Preserve existing signal override if present
  const signalOverride = new URLSearchParams(window.location.search).get('signal');
  if (signalOverride) url.searchParams.set('signal', signalOverride);
  // Update current URL so connectSignal sees the room
  window.history.replaceState({}, '', url.toString());
  connectSignal();
  navigator.clipboard?.writeText(url.toString());
  alert(`Room created. Link copied to clipboard:\n${url.toString()}`);
});

joinRoomButton.addEventListener('click', async () => {
  const code = roomCodeInput.value.trim();
  if (!code) return alert('Enter a room code.');
  const url = new URL(window.location.href);
  url.searchParams.set('room', code.toUpperCase());
  if (!url.searchParams.get('createdAt')) {
    // No createdAt; set now but will only affect this user
    url.searchParams.set('createdAt', String(Date.now()));
  }
  // Preserve existing signal override if present
  const signalOverride = new URLSearchParams(window.location.search).get('signal');
  if (signalOverride) url.searchParams.set('signal', signalOverride);
  connectSignal();
  window.history.replaceState({}, '', url.toString());
  enforceExpiry();
});

// Auto-join if room param exists
if (new URLSearchParams(location.search).get('room')) {
  connectSignal();
}

// On load
enforceExpiry();
// Init story
loadDefaultStory();

// Feature flag: storybook mode (planned incremental rollout)
const isStorybook = IS_STORYBOOK;
const isVideoFirst = (() => { try { return (new URLSearchParams(location.search).get('mode') || '').toLowerCase() === 'video-first'; } catch (_) { return false; } })();
let storyTextScale = (() => { try { return Math.max(0.75, Math.min(1.75, Number(localStorage.getItem('storyTextScale') || '1'))); } catch (_) { return 1; } })();
function applyStoryTextScale() {
  try { document.documentElement.style.setProperty('--story-text-scale', String(storyTextScale)); } catch (_) {}
}
applyStoryTextScale();

function changeStoryTextScale(delta) {
  storyTextScale = Math.max(0.75, Math.min(1.75, Math.round((storyTextScale + delta) * 100) / 100));
  try { localStorage.setItem('storyTextScale', String(storyTextScale)); } catch (_) {}
  applyStoryTextScale();
}
// Currently no-op; guarded code will mount storybook/video-first in milestones

if (isStorybook || isVideoFirst) {
  try {
    const onReady = () => {
      // Create start overlay once per load
      const overlay = document.createElement('div');
      overlay.className = 'storybook-start-overlay';
      overlay.innerHTML = '<div class="panel"><h2>Ready to Begin?</h2><p>Tap Start to enable audio and begin your story.</p><button class="start-btn">Start</button></div>';
      document.body.appendChild(overlay);
      const startBtn = overlay.querySelector('.start-btn');
      startBtn?.addEventListener('click', async () => {
        try {
          autoplayPrimed = true;
          // Ensure media on user gesture for iOS and permissions
          try { await ensureMedia(); } catch (_) {}
          if (remoteVideo) {
            remoteVideo.playsInline = true;
            remoteVideo.muted = false;
            try { await remoteVideo.play(); } catch (_) {}
          }
          if (localVideo) {
            localVideo.playsInline = true;
            localVideo.muted = true;
            try { await localVideo.play(); } catch (_) {}
          }
        } finally {
          overlay.remove();
        }
      }, { once: true });

      // Inject simple menu toggle for both modes
      if (!document.querySelector('.sb-menu-btn')) {
        const menuBtn = document.createElement('button');
        menuBtn.className = 'sb-menu-btn';
        if (isVideoFirst) {
          menuBtn.innerHTML = '<img src="./public/brand/icons/tell-logo.svg" alt="Menu" aria-hidden="true" />';
          menuBtn.setAttribute('aria-label', 'Menu');
          menuBtn.title = 'Menu';
        } else {
          menuBtn.textContent = 'Menu';
        }
        document.body.appendChild(menuBtn);

        const panel = document.createElement('div');
        panel.className = 'sb-session-overlay';
        panel.innerHTML = '<div class="sb-session-content"></div>';
        const content = panel.firstElementChild;
        document.body.appendChild(panel);

        // Backdrop for outside click close
        const backdrop = document.createElement('div');
        backdrop.className = 'sb-session-backdrop';
        document.body.appendChild(backdrop);

        const sessionCards = document.querySelectorAll('.session-card');
        if (sessionCards?.length && content) {
          sessionCards.forEach((card) => {
            const clone = document.createElement('section');
            clone.className = 'session-card';
            clone.innerHTML = card.innerHTML;
            content.appendChild(clone);
            const cStart = clone.querySelector('#startRoomButton');
            const cJoin = clone.querySelector('#joinRoomButton');
            const cRoom = clone.querySelector('#roomCodeInput');
            const cLoad = clone.querySelector('#loadStoryButton');
            const cSelect = clone.querySelector('#storySelect');
            if (cStart) cStart.addEventListener('click', (e) => { e.preventDefault(); startRoomButton.click(); });
            if (cJoin) cJoin.addEventListener('click', (e) => { e.preventDefault(); if (cRoom) roomCodeInput.value = cRoom.value; joinRoomButton.click(); });
            if (cLoad) cLoad.addEventListener('click', (e) => { e.preventDefault(); if (cSelect) storySelect.value = cSelect.value; loadStoryButton.click(); });
          });
        }

        let open = false;
        const setOpen = (val) => {
          open = val;
          panel.classList.toggle('open', open);
          backdrop.classList.toggle('open', open);
          menuBtn.classList.toggle('open', open);
        };
        menuBtn.addEventListener('click', () => setOpen(!open));
        backdrop.addEventListener('click', () => setOpen(false));
        panel.addEventListener('click', (e) => { if (e.target === panel) setOpen(false); });
        window.addEventListener('keydown', (e) => { if (open && e.key === 'Escape') setOpen(false); });
      }

      // Storybook: add zoom controls near story content
      if (isStorybook) {
        const sc = document.querySelector('.story-card .story-content');
        if (sc && !document.querySelector('.zoom-controls')) {
          const z = document.createElement('div');
          z.className = 'zoom-controls';
          z.innerHTML = '<button class="btn" aria-label="Decrease text size" title="Decrease text size">−</button><button class="btn" aria-label="Increase text size" title="Increase text size">+</button>';
          sc.parentElement?.appendChild(z);
          const minus = z.children[0];
          const plus = z.children[1];
          minus.addEventListener('click', () => changeStoryTextScale(-0.1));
          plus.addEventListener('click', () => changeStoryTextScale(+0.1));
        }
      }

      // Video-first: mount bottom overlay that mirrors story text and choices
      if (isVideoFirst) {
        const vf = document.createElement('div');
        vf.className = 'vf-overlay';
        vf.innerHTML = '<div class="scrim"><p id="vfScene"></p><div id="vfChoices" class="choices"></div></div>';
        document.body.appendChild(vf);
        // Visible centered titlebar
        const titlebar = document.createElement('div');
        titlebar.className = 'vf-titlebar';
        titlebar.textContent = document.getElementById('storyTitle')?.textContent || '';
        document.body.appendChild(titlebar);
        const updateTitle = () => { titlebar.textContent = document.getElementById('storyTitle')?.textContent || ''; };

        // Local controls overlay (icon-only)
        const ctrl = document.createElement('div');
        ctrl.className = 'vf-controls';
        ctrl.innerHTML = '<button class="icon-btn" aria-label="Toggle mic">🎤</button><button class="icon-btn" aria-label="Toggle camera">🎥</button>';
        const localBox = localVideo?.closest('.video-box');
        if (localBox) localBox.appendChild(ctrl);
        const micBtn = ctrl.children[0];
        const camBtn = ctrl.children[1];
        const refreshIcons = () => {
          const micOn = !!(audioTrackOriginal || localStream?.getAudioTracks()[0]) && (audioTrackOriginal || localStream.getAudioTracks()[0]).enabled !== false;
          const camOn = !!isVideoSending;
          micBtn.textContent = micOn ? '🎤' : '🔇';
          camBtn.textContent = camOn ? '🎥' : '📷';
        };
        micBtn.addEventListener('click', () => { toggleMicSend(); refreshIcons(); });
        camBtn.addEventListener('click', () => { toggleCamSend(); refreshIcons(); });
        setTimeout(refreshIcons, 0);

        // One shared zoom controls node, appended inline to choices
        const zoom = document.createElement('div');
        zoom.className = 'vf-zoom';
        zoom.innerHTML = '<button class="icon-btn" aria-label="Decrease text size" title="Decrease text size">−</button><button class="icon-btn" aria-label="Increase text size" title="Increase text size">+</button>';
        const zMinus = zoom.children[0];
        const zPlus = zoom.children[1];
        zMinus.addEventListener('click', () => changeStoryTextScale(-0.1));
        zPlus.addEventListener('click', () => changeStoryTextScale(+0.1));

        // Mirror current story content whenever we render
        const applyMirror = () => {
          const t = document.getElementById('storyTitle')?.textContent || '';
          const p = document.getElementById('sceneText')?.textContent || '';
          const srcChoices = document.getElementById('choices');
          titlebar.textContent = t;
          const dst = vf.querySelector('#vfScene');
          dst.textContent = p;
          const dstChoices = vf.querySelector('#vfChoices');
          dstChoices.innerHTML = '';
          // choices
          srcChoices?.querySelectorAll('button')?.forEach((btn) => {
            const clone = btn.cloneNode(true);
            clone.addEventListener('click', () => btn.click());
            dstChoices.appendChild(clone);
          });
          // spacer then zoom
          const spacer = document.createElement('div');
          spacer.className = 'spacer';
          dstChoices.appendChild(spacer);
          dstChoices.appendChild(zoom);
        };
        applyMirror();
        const observer = new MutationObserver(() => { applyMirror(); updateTitle(); });
        observer.observe(document.getElementById('sceneText'), { characterData: true, subtree: true, childList: true });
        observer.observe(document.getElementById('choices'), { childList: true, subtree: true });
        observer.observe(document.getElementById('storyTitle'), { characterData: true, childList: true, subtree: true });
      }
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', onReady, { once: true });
    } else {
      onReady();
    }
  } catch (_) {}
} 