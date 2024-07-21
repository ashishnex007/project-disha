// Import the Whisper pipeline
import { pipeline } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.6.0';

const map = L.map('map').setView([51.505, -0.09], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
}).addTo(map);

// Initialize the routing control with the nominatim geocoder
const control = L.Routing.control({
  waypoints: [],
  routeWhileDragging: true,
  geocoder: L.Control.Geocoder.nominatim()
}).addTo(map);

const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');
const voiceText = document.getElementById('voice-text');
const parksLayer = L.layerGroup().addTo(map);

// Add event listener for search input
searchInput.addEventListener('input', () => {
  const query = searchInput.value;
  searchResults.innerHTML = '';
  if (query.length > 2) {
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}`)
      .then(response => response.json())
      .then(data => {
        if (data.length > 0) {
          data.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item.display_name;
            li.addEventListener('click', () => {
              const lat = item.lat;
              const lon = item.lon;
              map.setView([lat, lon], 13);
              searchInput.value = item.display_name;
              searchResults.innerHTML = '';
            });
            searchResults.appendChild(li);
          });
        }
      });
  }
});

// Initialize Whisper
let whisperPipeline;
let isListening = false;
let currentMarker = null;

async function initWhisper() {
  try {
    whisperPipeline = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny');
    console.log('Whisper initialized successfully');
  } catch (error) {
    console.error('Error initializing Whisper:', error);
  }
}

initWhisper();

// Function to convert audio buffer to 16kHz Float32Array
function convertAudio(audioBuffer) {
  const offlineCtx = new OfflineAudioContext(1, audioBuffer.duration * 16000, 16000);
  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineCtx.destination);
  source.start();
  return offlineCtx.startRendering().then(renderedBuffer => {
    return renderedBuffer.getChannelData(0);
  });
}

// Function to start listening
async function startListening() {
  if (!whisperPipeline) {
    console.error('Whisper is not initialized yet');
    return;
  }

  if (isListening) return;

  isListening = true;
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mediaRecorder = new MediaRecorder(stream);
  const audioChunks = [];

  mediaRecorder.addEventListener('dataavailable', (event) => {
    audioChunks.push(event.data);
  });

  mediaRecorder.addEventListener('stop', async () => {
    const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioContext = new AudioContext();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const float32Array = await convertAudio(audioBuffer);

    const result = await whisperPipeline(float32Array);
    handleVoiceCommand(result.text);
  });

  mediaRecorder.start();

  setTimeout(() => {
    mediaRecorder.stop();
    isListening = false;
  }, 5000); // Listen for 5 seconds
}

// Function to handle voice commands
function handleVoiceCommand(command) {
  console.log('Recognized command:', command);
  voiceText.textContent = `You said: "${command}"`;

  // Implement your command handling logic here
  if (command.toLowerCase().includes('zoom to')) {
    const location = command.toLowerCase().replace('zoom to', '').trim();
    zoomToLocation(location);
  } else if (command.toLowerCase().includes('route from') && command.toLowerCase().includes('to')) {
    const [start, end] = command.toLowerCase().replace('route from', '').split('to').map(s => s.trim());
    routeFromTo(start, end);
  } else if (command.toLowerCase().includes('zoom in')) {
    map.zoomIn();
  } else if (command.toLowerCase().includes('zoom out')) {
    map.zoomOut();
  } else if (command.toLowerCase().includes('move left')) {
    map.panBy([-200, 0]);
  } else if (command.toLowerCase().includes('move right')) {
    map.panBy([200, 0]);
  } else if (command.toLowerCase().includes('move up')) {
    map.panBy([0, -200]);
  } else if (command.toLowerCase().includes('move down')) {
    map.panBy([0, 200]);
  } else if (command.toLowerCase().includes('show parks')) {
    showParks();
  } else if (command.toLowerCase().includes('hide parks')) {
    hideParks();
  }
}

// Implement the command functions (zoomToLocation, routeFromTo, showParks, hideParks) here
// You can reuse the logic from the original code

// Add a button to trigger voice recognition
const voiceButton = document.createElement('button');
voiceButton.textContent = 'Start Listening';
voiceButton.style.position = 'absolute';
voiceButton.style.top = '10px';
voiceButton.style.right = '10px';
voiceButton.style.zIndex = '1000';
document.body.appendChild(voiceButton);

voiceButton.addEventListener('click', startListening);