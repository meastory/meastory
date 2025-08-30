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

async function loadDefaultStory() {
  const response = await fetch('./stories/dragon-adventure.json');
  if (!response.ok) {
    storyTitleEl.textContent = 'Failed to load story';
    return;
  }
  story = await response.json();
  storyTitleEl.textContent = story.title;
  renderScene(0);
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
  localVideo.play?.().catch(() => {});
  return localStream;
}

function connectSignal() {
  if (ws && ws.readyState === WebSocket.OPEN) return;
  const roomId = new URLSearchParams(location.search).get('room');
  if (!roomId) return alert('No room code present.');
  ws = new WebSocket('ws://localhost:3001');
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
        if (remoteVideo.srcObject) remoteVideo.srcObject = null;
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
    remoteVideo.srcObject = e.streams[0];
    remoteVideo.play?.().catch(() => {});
  };
  pc.onconnectionstatechange = () => {
    log('connection state', pc.connectionState);
  };
  const stream = await ensureMedia();
  for (const track of stream.getTracks()) {
    pc.addTrack(track, stream);
  }
  // Caller will create channel; callee receives it via ondatachannel
  try {
    attachDataChannel(pc.createDataChannel('story'));
  } catch (_) {
    // callee path will receive
  }
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
  if (role === 'caller') {
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
  await ensureMedia();
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
  await ensureMedia();
  connectSignal();
  window.history.replaceState({}, '', url.toString());
  enforceExpiry();
});

// Auto-join if room param exists
if (new URLSearchParams(location.search).get('room')) {
  ensureMedia().then(connectSignal);
}

// On load
enforceExpiry();
// Init story
loadDefaultStory(); 