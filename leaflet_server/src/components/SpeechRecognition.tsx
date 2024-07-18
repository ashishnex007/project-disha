import React, { useState, useRef } from 'react';
import axios from 'axios';

const SpeechRecognition = () => {
  const [transcription, setTranscription] = useState('');
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

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
            console.log('Server response:', response.data);
            if (response.data.error) {
              setError(response.data.error);
            } else if (response.data.text) {
              setTranscription(prev => prev + ' ' + response.data.text);
            } else {
              setError('No transcription received from server');
            }
          } catch (error) {
            console.error('Error transcribing audio:', error);
            setError(`Error transcribing audio: ${error.message}`);
          }
        };
        mediaRecorder.start();
        setRecording(true);
      })
      .catch(error => {
        console.error('Error accessing microphone:', error);
        setError(`Error accessing microphone: ${error.message}`);
      });
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  return (
    <div>
      <button onClick={recording ? handleStopRecording : handleStartRecording}>
        {recording ? 'Stop Recording' : 'Start Recording'}
      </button>
      {error && <p style={{color: 'red'}}>{error}</p>}
      <p>Transcription: {transcription}</p>
    </div>
  );
};

export default SpeechRecognition;