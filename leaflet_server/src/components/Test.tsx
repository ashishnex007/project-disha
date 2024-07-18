import React, { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, LayerGroup } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import 'leaflet-routing-machine';
import 'leaflet-control-geocoder';

const VoiceEnabledMap: React.FC = () => {
  const [transcription, setTranscription] = useState('');
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mapRef = useRef<L.Map | null>(null);
  const routingControlRef = useRef<L.Routing.Control | null>(null);
  const parksLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (mapRef.current) {
      routingControlRef.current = L.Routing.control({
        waypoints: [],
        routeWhileDragging: true,
        geocoder: L.Control.Geocoder.nominatim()
      }).addTo(mapRef.current);

      parksLayerRef.current = L.layerGroup().addTo(mapRef.current);
    }
  }, []);

  const handleStartRecording = () => {
    setError(null);
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];
        mediaRecorder.ondataavailable = (event) => {
          audioChunksRef.current.push(event.data);
        };
        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const formData = new FormData();
          formData.append('audio', audioBlob, 'audio.webm');
          try {
            const response = await axios.post('http://localhost:3001/transcribe', formData, {
              headers: {
                'Content-Type': 'multipart/form-data',
              },
            });
            if (response.data.error) {
              setError(response.data.error);
            } else if (response.data.text) {
              const newTranscription = response.data.text;
              setTranscription(prev => prev + ' ' + newTranscription);
              handleVoiceCommand(newTranscription);
            } else {
              setError('No transcription received from server');
            }
          } catch (error) {
            console.error('Error transcribing audio:', error);
            setError(`Error transcribing audio: ${error}`);
          }
        };
        mediaRecorder.start();
        setRecording(true);
      })
      .catch(error => {
        console.error('Error accessing microphone:', error);
        setError(`Error accessing microphone: ${error}`);
      });
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const handleVoiceCommand = (command: string) => {
    const lowerCommand = command.toLowerCase();

    if (lowerCommand.startsWith('zoom to')) {
      const location = lowerCommand.replace('zoom to', '').trim();
      zoomToLocation(location);
    } else if (lowerCommand.startsWith('route from') && lowerCommand.includes('to')) {
      const [start, end] = lowerCommand.replace('route from', '').split('to').map(s => s.trim());
      routeBetweenLocations(start, end);
    } else if (lowerCommand === 'zoom in') {
      mapRef.current?.zoomIn();
    } else if (lowerCommand === 'zoom out') {
      mapRef.current?.zoomOut();
    } else if (lowerCommand === 'move left') {
      mapRef.current?.panBy([-200, 0]);
    } else if (lowerCommand === 'move right') {
      mapRef.current?.panBy([200, 0]);
    } else if (lowerCommand === 'move up') {
      mapRef.current?.panBy([0, -200]);
    } else if (lowerCommand === 'move down') {
      mapRef.current?.panBy([0, 200]);
    } else if (lowerCommand === 'show parks') {
      showParks();
    } else if (lowerCommand === 'hide parks') {
      hideParks();
    }
  };

  const zoomToLocation = (location: string) => {
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`)
      .then(response => response.json())
      .then(data => {
        if (data.length > 0) {
          const { lat, lon } = data[0];
          mapRef.current?.setView([parseFloat(lat), parseFloat(lon)], 13);
        }
      });
  };

  const routeBetweenLocations = (start: string, end: string) => {
    Promise.all([
      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(start)}`).then(res => res.json()),
      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(end)}`).then(res => res.json())
    ]).then(([startData, endData]) => {
      if (startData.length > 0 && endData.length > 0) {
        const startPoint = L.latLng(parseFloat(startData[0].lat), parseFloat(startData[0].lon));
        const endPoint = L.latLng(parseFloat(endData[0].lat), parseFloat(endData[0].lon));
        routingControlRef.current?.setWaypoints([startPoint, endPoint]);
      }
    });
  };

  const showParks = () => {
    if (mapRef.current && parksLayerRef.current) {
      const bounds = mapRef.current.getBounds();
      const bbox = `${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()}`;
      
      const query = `
        [out:json][timeout:25];
        (
          node["leisure"="park"](${bbox});
          way["leisure"="park"](${bbox});
          relation["leisure"="park"](${bbox});
        );
        out body;
        >;
        out skel qt;
      `;

      fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`)
        .then(response => response.json())
        .then(data => {
          parksLayerRef.current?.clearLayers();
          data.elements.forEach((element: any) => {
            if (element.type === 'node' && element.tags && element.tags.leisure === 'park') {
              L.marker([element.lat, element.lon])
                .bindPopup(element.tags.name || 'Unnamed Park')
                .addTo(parksLayerRef.current!);
            } else if (element.type === 'way' && element.tags && element.tags.leisure === 'park') {
              const coords = element.nodes.map((nodeId: number) => {
                const node = data.elements.find((el: any) => el.type === 'node' && el.id === nodeId);
                return [node.lat, node.lon];
              });
              L.polygon(coords)
                .bindPopup(element.tags.name || 'Unnamed Park')
                .addTo(parksLayerRef.current!);
            }
          });
        })
        .catch(error => {
          console.error('Error fetching parks:', error);
          setError('Error fetching parks');
        });
    }
  };

  const hideParks = () => {
    parksLayerRef.current?.clearLayers();
  };

  return (
    <div>
      <MapContainer
        center={[51.505, -0.09]}
        zoom={13}
        style={{ height: '80vh', width: '100%' }}
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
      </MapContainer>
      <div>
        <button onClick={recording ? handleStopRecording : handleStartRecording}>
          {recording ? 'Stop Recording' : 'Start Recording'}
        </button>
        {error && <p style={{color: 'red'}}>{error}</p>}
        <p>Transcription: {transcription}</p>
      </div>
    </div>
  );
};

export default VoiceEnabledMap;