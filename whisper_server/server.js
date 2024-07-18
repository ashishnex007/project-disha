const express = require('express');
const multer = require('multer');
const { PythonShell } = require('python-shell');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS
app.use(cors());

// Multer configuration for handling file uploads
const upload = multer({ dest: 'uploads/' });

// Endpoint for transcribing audio
app.post('/transcribe', upload.single('audio'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    const audioPath = req.file.path;
    // Path to your Python script handling Whisper
    const pythonScript = path.join(__dirname, 'whisper.py');

    // Execute Python script
    const options = {
      mode: 'text',
      pythonOptions: ['-u'], // unbuffered output
      args: [audioPath],
    };

    PythonShell.run(pythonScript, options, (err, results) => {
      if (err) throw err;
      res.json({ text: results[0] });
    });
  } catch (error) {
    console.error('Error transcribing audio:', error);
    res.status(500).json({ error: 'Error transcribing audio' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});