import torch
import whisper
from flask import Flask, request, jsonify
from flask_cors import CORS
import io
import soundfile as sf
import librosa
import numpy as np
import tempfile
import os
from pydub import AudioSegment

app = Flask(__name__)
CORS(app)

# Use CUDA if available
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Using device: {device}")

# Load the Whisper model
model = whisper.load_model("base").to(device)

def process_audio(audio_file):
    # Create a temporary file to store the audio
    with tempfile.NamedTemporaryFile(delete=False, suffix='.webm') as temp_file:
        temp_file.write(audio_file.read())
        temp_file_path = temp_file.name

    try:
        # Convert WebM to WAV
        audio = AudioSegment.from_file(temp_file_path, format="webm")
        wav_path = temp_file_path.replace('.webm', '.wav')
        audio.export(wav_path, format="wav")

        # Read the WAV file
        audio, sr = sf.read(wav_path)
   
        # Resample to 16kHz if necessary
        if sr != 16000:
            audio = librosa.resample(y=audio, orig_sr=sr, target_sr=16000)
   
        # Convert to mono if stereo
        if len(audio.shape) > 1:
            audio = librosa.to_mono(audio)
   
        # Ensure audio is in float32 format
        audio = audio.astype(np.float32)
   
        return audio
    finally:
        # Clean up temporary files
        os.remove(temp_file_path)
        if os.path.exists(wav_path):
            os.remove(wav_path)

@app.route('/transcribe', methods=['POST'])
def transcribe():
    if 'audio' not in request.files:
        return jsonify({"error": "No audio file provided"}), 400
    
    audio_file = request.files['audio']
   
    try:
        # Process audio
        audio = process_audio(audio_file)
       
        # Transcribe using the Whisper model
        result = model.transcribe(audio)
        return jsonify({"text": result["text"]})
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(port=3001, debug=True)