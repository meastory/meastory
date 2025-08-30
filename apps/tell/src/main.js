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

const iceServers = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

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

nextButton.addEventListener('click', () => renderScene(currentSceneIndex + 1));
prevButton.addEventListener('click', () => renderScene(currentSceneIndex - 1));

// Session scaffolding (placeholder)
function generateRoomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

async function ensureMedia() {
  if (localStream) return localStream;
  localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
  localVideo.srcObject = localStream;
  return localStream;
}

function connectSignal() {
  if (ws && ws.readyState === WebSocket.OPEN) return;
  ws = new WebSocket('ws://localhost:3001');
  ws.onopen = () => {
    const roomId = new URLSearchParams(location.search).get('room');
    ws.send(JSON.stringify({ type: 'join', roomId }));
  };
  ws.onmessage = async (event) => {
    const msg = JSON.parse(event.data);
    switch (msg.type) {
      case 'hello':
      case 'joined':
      case 'peer-waiting':
        // no-op
        break;
      case 'start-call':
        await startPeer(msg.role);
        break;
      case 'offer':
        await ensurePeer();
        await pc.setRemoteDescription(new RTCSessionDescription(msg.payload));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        ws.send(JSON.stringify({ type: 'answer', payload: answer }));
        break;
      case 'answer':
        await pc.setRemoteDescription(new RTCSessionDescription(msg.payload));
        break;
      case 'candidate':
        try {
          await pc.addIceCandidate(msg.payload);
        } catch (_) {}
        break;
      case 'peer-left':
        // reset remote
        if (remoteVideo.srcObject) remoteVideo.srcObject = null;
        break;
      default:
        break;
    }
  };
  ws.onclose = () => {
    setTimeout(connectSignal, 1000);
  };
}

async function ensurePeer() {
  if (pc) return pc;
  pc = new RTCPeerConnection(iceServers);
  pc.onicecandidate = (e) => {
    if (e.candidate) ws?.send(JSON.stringify({ type: 'candidate', payload: e.candidate }));
  };
  pc.ontrack = (e) => {
    remoteVideo.srcObject = e.streams[0];
  };
  const stream = await ensureMedia();
  for (const track of stream.getTracks()) {
    pc.addTrack(track, stream);
  }
  dataChannel = pc.createDataChannel('story');
  dataChannel.onopen = () => {};
  dataChannel.onmessage = (e) => {
    // placeholder for story sync
  };
  return pc;
}

async function startPeer(role) {
  await ensurePeer();
  if (role === 'caller') {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    ws.send(JSON.stringify({ type: 'offer', payload: offer }));
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

startRoomButton.addEventListener('click', async () => {
  const code = generateRoomCode();
  const url = new URL(window.location.href);
  url.searchParams.set('room', code);
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
  await ensureMedia();
  connectSignal();
  window.history.replaceState({}, '', url.toString());
});

// Auto-join if room param exists
if (new URLSearchParams(location.search).get('room')) {
  ensureMedia().then(connectSignal);
}

// Init story
loadDefaultStory(); 