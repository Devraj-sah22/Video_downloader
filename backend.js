// backend.js - Fixed version
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createRequire } from 'module'; // Only if you need require

const app = express();
const PORT = 5000;

// Use fs.createWriteStream, not from http
import { get as httpsGet } from 'https';
import { get as httpGet } from 'http';

// ✅ Use real Downloads folder
const DOWNLOAD_DIR = path.join(os.homedir(), 'Downloads');

if (!fs.existsSync(DOWNLOAD_DIR)) {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

app.use(cors());
app.use(express.json());

app.post('/download', async (req, res) => {
  const { videoUrl } = req.body;

  if (!videoUrl) {
    return res.status(400).json({ error: 'Video URL is required' });
  }

  try {
    const url = new URL(videoUrl);
    const filename = decodeURIComponent(path.basename(url.pathname)) || `video-${Date.now()}.mp4`;
    const filePath = path.join(DOWNLOAD_DIR, filename);

    const client = url.protocol === 'https:' ? httpsGet : httpGet;

    const file = fs.createWriteStream(filePath);

    const request = client(videoUrl, (response) => {
      if (response.statusCode !== 200) {
        fs.unlinkSync(filePath);
        return res.status(500).json({ error: `HTTP ${response.statusCode}` });
      }

      response.pipe(file);

      file.on('finish', () => {
        file.close(() => {
          res.json({
            success: true,
            message: 'Download started',
            filename,
            downloadDir: DOWNLOAD_DIR
          });
        });
      });
    });

    request.on('error', (err) => {
      fs.unlinkSync(filePath);
      console.error('Download failed:', err.message);
      res.status(500).json({ error: 'Download failed' });
    });

  } catch (err) {
    console.error('Server error:', err.message);
    res.status(500).json({ error: 'Invalid URL or network error' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📁 Videos saved to: ${DOWNLOAD_DIR}`);
});