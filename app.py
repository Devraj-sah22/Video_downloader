from flask import Flask, request, jsonify
from flask_cors import CORS
import subprocess
import threading
import os
import json
import time
import re
import atexit
from urllib.parse import urlparse, parse_qs

# --------------------------------------------------
# Helpers
# --------------------------------------------------
def get_video_id(url):
    parsed = urlparse(url)
    if "youtube" in parsed.netloc:
        query = parse_qs(parsed.query)
        return query.get("v", ["unknown"])[0]
    return re.sub(r'\W+', '_', url)


# --------------------------------------------------
# App setup
# --------------------------------------------------
app = Flask(__name__)
CORS(app)

@app.route('/', methods=['GET'])
def health():
    return {'status': 'ok'}, 200


DOWNLOAD_DIR = os.path.expanduser('~/VideoDownloads')
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

PROGRESS_FILE = os.path.join(DOWNLOAD_DIR, '.progress.json')


QUALITY_PRESETS = {
    '2160p': 'bestvideo[height<=2160]+bestaudio/best[height<=2160]',
    '1440p': 'bestvideo[height<=1440]+bestaudio/best[height<=1440]',
    '1080p': 'bestvideo[height<=1080]+bestaudio/best[height<=1080]',
    '720p':  'bestvideo[height<=720]+bestaudio/best[height<=720]',
    '480p':  'bestvideo[height<=480]+bestaudio/best[height<=480]',
    '360p':  'bestvideo[height<=360]+bestaudio/best[height<=360]',
    'best':  'bestvideo+bestaudio/best',
    'audio': 'bestaudio'
}


# --------------------------------------------------
# Progress helpers
# --------------------------------------------------
def cleanup_old_entries():
    try:
        if os.path.exists(PROGRESS_FILE):
            with open(PROGRESS_FILE, 'r') as f:
                data = json.load(f)

            now = int(time.time())
            data = {
                k: v for k, v in data.items()
                if now - v.get('timestamp', 0) < 86400
            }

            with open(PROGRESS_FILE, 'w') as f:
                json.dump(data, f)
    except Exception as e:
        print(f"Cleanup failed: {e}")


def update_progress(video_key, payload):
    try:
        data = {}
        if os.path.exists(PROGRESS_FILE):
            try:
                with open(PROGRESS_FILE, 'r') as f:
                    data = json.load(f)
            except json.JSONDecodeError:
                data = {}

        data[video_key] = {
            **data.get(video_key, {}),
            **payload,
            'timestamp': int(time.time())
        }

        tmp = PROGRESS_FILE + '.tmp'
        with open(tmp, 'w') as f:
            json.dump(data, f)
        os.replace(tmp, PROGRESS_FILE)

    except Exception as e:
        print(f"Progress update failed: {e}")


# --------------------------------------------------
# Download endpoint
# --------------------------------------------------
@app.route('/download', methods=['POST'])
def download_video():
    data = request.get_json()
    video_url = data.get('videoUrl', '').strip()
    quality = data.get('quality', 'best')
    format_type = data.get('format', 'video')

    if not video_url:
        return jsonify({"error": "Missing video URL"}), 400

    video_key = get_video_id(video_url)

    def run_download():
        try:
            update_progress(video_key, {
                'status': 'starting',
                'progress': 0,
                'filename': None
            })

            if format_type == 'audio':
                cmd = [
                    'yt-dlp',
                    '--newline',
                    '-x',
                    '--audio-format', 'mp3',
                    '--audio-quality', '0',
                    '--output', os.path.join(DOWNLOAD_DIR, '%(title)s.%(ext)s'),
                    video_url
                ]
            else:
                format_selector = QUALITY_PRESETS.get(quality, QUALITY_PRESETS['best'])
                output_template = "%(title)s_[%(resolution)s].mp4"

                cmd = [
                    'yt-dlp',
                    '--newline',
                    '--no-playlist',
                    '-f', format_selector,
                    '--merge-output-format', 'mp4',
                    '--remux-video', 'mp4',
                    #'--extractor-args', 'youtube:player_client=android',
                    '--user-agent', 'Mozilla/5.0',
                    '--concurrent-fragments', '1',
                    '--force-ipv4',
                    '--output', os.path.join(DOWNLOAD_DIR, output_template),
                    video_url
                ]

            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                bufsize=1,
                text=True,
                errors='replace'
            )

            atexit.register(lambda: process.terminate())

            last_progress = 0
            filename = None

            for line in process.stdout:
                line = line.strip()
                print(line)

                if '[download]' in line and '%' in line:
                    match = re.search(r'(\d+(?:\.\d+)?)%', line)
                    if match:
                        last_progress = float(match.group(1))
                        update_progress(video_key, {
                            'status': 'downloading',
                            'progress': last_progress,
                            'filename': filename
                        })

                elif 'Destination:' in line:
                    filename = line.split('Destination:')[-1].strip()
                    update_progress(video_key, {
                        'status': 'downloading',
                        'progress': last_progress,
                        'filename': filename
                    })

                elif '[ExtractAudio]' in line or '[Merger]' in line:
                    update_progress(video_key, {
                        'status': 'processing',
                        'progress': 99,
                        'filename': filename
                    })

            process.wait()

            if process.returncode == 0:
                update_progress(video_key, {
                    'status': 'completed',
                    'progress': 100,
                    'filename': filename
                })
            else:
                update_progress(video_key, {
                    'status': 'failed',
                    'progress': last_progress,
                    'filename': filename,
                    'error': f"Exit code {process.returncode}"
                })

        except Exception as e:
            update_progress(video_key, {
                'status': 'error',
                'progress': 0,
                'filename': None,
                'error': str(e)
            })

    threading.Thread(target=run_download, daemon=True).start()

    return jsonify({
        "message": "Download started",
        "videoKey": video_key
    })


# --------------------------------------------------
# Progress endpoint
# --------------------------------------------------
@app.route('/progress/<video_key>')
def get_progress(video_key):
    try:
        if os.path.exists(PROGRESS_FILE):
            with open(PROGRESS_FILE, 'r') as f:
                data = json.load(f)
                return jsonify(data.get(video_key, {
                    "status": "queued",
                    "progress": 0,
                    "filename": None
                }))
        return jsonify({"status": "queued", "progress": 0, "filename": None})
    except Exception as e:
        return jsonify({"status": "error", "progress": 0, "error": str(e)})


# --------------------------------------------------
# Startup
# --------------------------------------------------
with app.app_context():
    cleanup_old_entries()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True, use_reloader=False)