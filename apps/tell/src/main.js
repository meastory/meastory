const storyTitleEl = document.getElementById('storyTitle');
const sceneTextEl = document.getElementById('sceneText');
const choicesEl = document.getElementById('choices');
const backgroundEl = document.getElementById('background');
const nextButton = document.getElementById('nextButton');
const prevButton = document.getElementById('prevButton');

const startRoomButton = document.getElementById('startRoomButton');
const joinRoomButton = document.getElementById('joinRoomButton');
const roomCodeInput = document.getElementById('roomCodeInput');

let story = null;
let currentSceneIndex = 0;

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

startRoomButton.addEventListener('click', () => {
  const code = generateRoomCode();
  const url = new URL(window.location.href);
  url.searchParams.set('room', code);
  navigator.clipboard?.writeText(url.toString());
  alert(`Room created. Link copied to clipboard:\n${url.toString()}`);
});

joinRoomButton.addEventListener('click', () => {
  const code = roomCodeInput.value.trim();
  if (!code) return alert('Enter a room code.');
  const url = new URL(window.location.href);
  url.searchParams.set('room', code.toUpperCase());
  window.location.href = url.toString();
});

// Init
loadDefaultStory(); 