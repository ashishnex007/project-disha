import React, { useState, useRef, useCallback } from 'react';
import { formatAudioTimestamp } from "../utils/AudioUtils";
import { webmFixDuration } from "../utils/BlobFix";

interface RecordButtonProps {
  onRecordingComplete: (audioBuffer: AudioBuffer) => Promise<void>;
}

const RecordButton: React.FC<RecordButtonProps> = ({ onRecordingComplete }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const getMimeType = useCallback(() => {
    const types = ["audio/webm", "audio/mp4", "audio/ogg", "audio/wav", "audio/aac"];
    for (let i = 0; i < types.length; i++) {
      if (MediaRecorder.isTypeSupported(types[i])) {
        return types[i];
      }
    }
    return undefined;
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getMimeType();
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
     
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      startTimeRef.current = Date.now();
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      mediaRecorder.onstop = async () => {
        const duration = Date.now() - startTimeRef.current;
        let blob = new Blob(chunksRef.current, { type: mimeType });
        if (mimeType === "audio/webm") {
          blob = await webmFixDuration(blob, duration, blob.type);
        }
        const arrayBuffer = await blob.arrayBuffer();
        const audioContext = new AudioContext({ sampleRate: 16000 });
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
       
        await onRecordingComplete(audioBuffer);
      };
      mediaRecorder.start();
      setIsRecording(true);
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setDuration((prevDuration) => prevDuration + 1);
      }, 1000);
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  }, [getMimeType, onRecordingComplete]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setDuration(0);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  }, []);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  return (
    <button
      onClick={toggleRecording}
      className={`flex items-center justify-center rounded-lg p-2 transition-all duration-200 ${
        isRecording ? 'bg-red-500 text-white' : 'bg-blue-500 text-white hover:bg-blue-600'
      }`}
    >
      <div className="w-7 h-7">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
          />
        </svg>
      </div>
      <div className="ml-2 break-text text-center text-md w-30">
        {isRecording ? `Stop (${formatAudioTimestamp(duration)})` : 'Record'}
      </div>
    </button>
  );
};

export default RecordButton;