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
      // Provide a tap-to-unmute button if audio is desired
      if (wantsAudio) {
        injectUnmuteButton(videoEl);
      }
    } catch (_) {
      // As a last resort, show a play overlay
      injectPlayButton(videoEl, wantsAudio);
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
      case 'offer':
        log('received offer');
        await ensurePeer();
        await pc.setRemoteDescription(msg.payload);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        ws.send(JSON.stringify({ type: 'answer', payload: answer }));
        break;
      case 'answer':
        log('received answer');
        await pc.setRemoteDescription(msg.payload);
        break;
      case 'candidate':
        try {
          await pc.addIceCandidate(msg.payload);
          log('added candidate');
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
  // Attach local media now that role is known
  if (!localStream) {
    const stream = await ensureMedia();
    for (const track of stream.getTracks()) {
      pc.addTrack(track, stream);
    }
  }
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

toggleMicBtn.addEventListener('click', () => {
  if (!localStream) return;
  const enabled = localStream.getAudioTracks().every(t => t.enabled);
  localStream.getAudioTracks().forEach(t => t.enabled = !enabled);
  toggleMicBtn.textContent = enabled ? 'Unmute' : 'Mute';
});

toggleCamBtn.addEventListener('click', () => {
  if (!localStream) return;
  const enabled = localStream.getVideoTracks().every(t => t.enabled);
  localStream.getVideoTracks().forEach(t => t.enabled = !enabled);
  toggleCamBtn.textContent = enabled ? 'Camera On' : 'Camera Off';
});

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
const isStorybook = (() => {
  const p = new URLSearchParams(location.search);
  return p.has('storybook') || p.get('sb') === '1';
})();
// Currently no-op; guarded code will mount storybook in future milestones 