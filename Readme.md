# 🎬 Ultimate Video Downloader (Premium Edition)

A **premium-quality YouTube Video & Audio Downloader** built using **Flask + yt-dlp** with a **modern Chrome Extension UI**, real-time progress tracking, and quality selection.

> 🚀 Supports **Video (360p → 4K)** and **Audio (MP3)** downloads with live progress updates.

---

## ✨ Features

### 🎥 Video Download
- Download videos in **360p, 480p, 720p, 1080p, 1440p, 2160p (4K)**
- Merges **best video + best audio** automatically
- Outputs clean **MP4 files**
- No playlist download (single video only)

### 🎵 Audio Download
- Download **audio-only (MP3)**
- Best audio quality (`--audio-quality 0`)
- No video data downloaded (true audio-only mode)

### 📊 Live Progress Tracking
- Real-time progress bar
- Download status:
  - Starting
  - Downloading
  - Processing
  - Completed
  - Failed
- Filename display during download

### 🧠 Smart Backend
- Threaded downloads (non-blocking)
- Progress stored in a temporary JSON file
- Automatic cleanup of old progress entries
- Safe termination on app exit

### 🖥 Premium Chrome Extension UI
- Auto-detects current tab URL
- Video / Audio toggle
- Quality selector
- Toast notifications
- Smooth animations and premium styling

---

## 🛠 Tech Stack

| Layer | Technology |
|-----|-----------|
| Frontend | HTML, CSS, JavaScript |
| UI | Chrome Extension |
| Backend | Python, Flask |
| Downloader | yt-dlp |
| Communication | REST API (JSON) |

---

## 📂 Project Structure


Video_downloader/
│
├── app.py # Flask backend
├── popup.js # Chrome extension logic
├── popup.html # Extension UI
├── popup.css # Premium styling
├── manifest.json # Chrome extension config
├── README.md # Project documentation
└── VideoDownloads/ # Downloaded files (auto-created)


---

## ⚙️ Installation & Setup

### 1️⃣ Install Python Dependencies
```bash
pip install flask flask-cors yt-dlp

⚠️ Recommended: Always keep yt-dlp updated

python -m pip install -U yt-dlp
2️⃣ Run Backend Server
python app.py

Backend runs at:

http://localhost:5000
3️⃣ Load Chrome Extension

Open Chrome

Go to chrome://extensions

Enable Developer Mode

Click Load unpacked

Select your extension folder

🔁 API Endpoints
▶️ Start Download
POST /download

Request Body

{
  "videoUrl": "https://www.youtube.com/watch?v=XXXX",
  "quality": "1080p",
  "format": "video"
}

Response

{
  "message": "Download started",
  "videoKey": "VIDEO_ID"
}
📈 Get Progress
GET /progress/<videoKey>
🎯 Supported Formats
Video

360p

480p

720p

1080p

1440p

2160p (4K)

Audio

MP3 (Best Quality)

🔐 Notes & Limitations

Single video download only (no playlists)

Quality depends on availability on YouTube

Some formats may be restricted by YouTube

Uses Android extractor for better compatibility

🚀 Future Enhancements

🎚 Audio bitrate selector (128 / 192 / 320 kbps)

📁 Separate folders for Audio & Video

⏸ Pause / Resume downloads

🌙 Dark / Light mode toggle

☁ Cloud-based backend deployment

👨‍💻 Developed By

Devraj Sah
🎓 B.Tech CSE
🌐 Portfolio: https://sahdevraj.com.np

⭐ Support

If you like this project:

⭐ Star the repository

📚 Use it for college projects

🚀 Extend it into a desktop or cloud app

💡 Built with passion, patience, and precision.