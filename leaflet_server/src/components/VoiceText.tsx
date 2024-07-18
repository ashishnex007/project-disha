import React, { useState, useEffect, useRef } from 'react';

const VoiceText: React.FC = () => {
  const [text, setText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        setText(`You said: "${transcript}"`);
        handleCommand(transcript);
      };

      recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error', event.error);
      };
    } else {
      console.error('Speech recognition not supported');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const handleCommand = (command: string) => {
    // Implement your voice commands here
    if (command.toLowerCase().includes('zoom to')) {
      const location = command.split('zoom to')[1].trim();
      // Handle zoom command
      console.log('Zooming to:', location);
    } else if (command.toLowerCase().includes('route from')) {
      const [start, end] = command.split('route from')[1].split('to').map(s => s.trim());
      // Handle route command
      console.log('Routing from', start, 'to', end);
    }
    // Add other commands as needed
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
    }
    setIsListening(!isListening);
  };

  return (
    <div id="voice-text">
      <button onClick={toggleListening}>
        {isListening ? 'Stop Listening' : 'Start Listening'}
      </button>
      <p>{text}</p>
    </div>
  );
};

export default VoiceText;