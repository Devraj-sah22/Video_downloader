from flask import Flask, request, jsonify
from flask_cors import CORS
import subprocess
import threading
import os
import json
import time
import re
import atexit
from urllib.parse import urlparse
 
# Hello
app = Flask(__name__)
CORS(app)

DOWNLOAD_DIR = os.path.expanduser('~/VideoDownloads')
os.makedirs(DOWNLOAD_DIR, exist_ok=True)
PROGRESS_FILE = os.path.join(DOWNLOAD_DIR, '.progress.json')

QUALITY_PRESETS = {
    '2160p': 'bestvideo[height<=2160][vcodec^=avc1]+bestaudio/best[height<=2160]/bestvideo[height<=2160]+bestaudio/best[height<=2160]',
    '1440p': 'bestvideo[height<=1440][vcodec^=avc1]+bestaudio/best[height<=1440]/bestvideo[height<=1440]+bestaudio/best[height<=1440]',
    '1080p': 'bestvideo[height<=1080][vcodec^=avc1]+bestaudio/best[height<=1080]/bestvideo[height<=1080]+bestaudio/best[height<=1080]',
    '720p': 'bestvideo[height<=720][vcodec^=avc1]+bestaudio/best[height<=720]/bestvideo[height<=720]+bestaudio/best[height<=720]',
    '480p': 'bestvideo[height<=480]+bestaudio/best[height<=480]',
    '360p': 'bestvideo[height<=360]+bestaudio/best[height<=360]',
    'best': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
    'audio': 'bestaudio/best'
}

def cleanup_old_entries():
    try:
        if os.path.exists(PROGRESS_FILE):
            with open(PROGRESS_FILE, 'r') as f:
                progress_data = json.load(f)
            
            current_time = int(time.time())
            progress_data = {k: v for k, v in progress_data.items() 
                           if current_time - v.get('timestamp', 0) < 86400}
            
            with open(PROGRESS_FILE, 'w') as f:
                json.dump(progress_data, f)
    except Exception as e:
        print(f"Cleanup failed: {e}")

def update_progress(video_url, data):
    try:
        progress_data = {}
        if os.path.exists(PROGRESS_FILE):
            try:
                with open(PROGRESS_FILE, 'r') as f:
                    progress_data = json.load(f)
            except json.JSONDecodeError:
                progress_data = {}
        
        progress_data[video_url] = {
            **progress_data.get(video_url, {}),
            **data,
            'timestamp': int(time.time())
        }
        
        temp_file = PROGRESS_FILE + '.tmp'
        with open(temp_file, 'w') as f:
            json.dump(progress_data, f)
        os.replace(temp_file, PROGRESS_FILE)
    except Exception as e:
        print(f"Progress update failed: {e}")

@app.route('/download', methods=['POST'])
def download_video():
    data = request.get_json()
    video_url = data.get('videoUrl', '').strip()
    quality = data.get('quality', 'best')
    format_type = data.get('format', 'video')

    if not video_url:
        return jsonify({"error": "Missing video URL"}), 400

    def run_download():
        try:
            normalized_url = video_url.replace('https://', 'https:/').replace('http://', 'http:/')
            
            update_progress(normalized_url, {
                'status': 'starting',
                'progress': 0,
                'filename': None
            })

            if format_type == 'audio':
                format_selector = QUALITY_PRESETS['audio']
                ext = 'mp3'
                output_template = "%(title)s.%(ext)s"
            else:
                format_selector = QUALITY_PRESETS.get(quality, QUALITY_PRESETS['best'])
                ext = 'mp4'
                output_template = "%(title)s_[%(resolution)s].%(ext)s"

            cmd = [
                'yt-dlp',
                '--newline',
                '--no-playlist',
                '-f', format_selector,
                '--merge-output-format', ext,
                '--output', os.path.join(DOWNLOAD_DIR, output_template),
                '--no-check-certificate',
                '--console-title',
                '--force-ipv4',
                '--verbose',
                video_url
            ]

            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                bufsize=1,
                universal_newlines=True,
                encoding='utf-8',
                errors='replace'
            )

            atexit.register(lambda: process.terminate())

            last_progress = 0
            filename = None

            for line in process.stdout:
                line = line.strip()
                print(line)
                
                if '[download]' in line and '%' in line:
                    progress_match = re.search(r'(\d+\.\d+)%', line)
                    if progress_match:
                        last_progress = float(progress_match.group(1))
                        update_progress(normalized_url, {
                            'status': 'downloading',
                            'progress': last_progress,
                            'filename': filename
                        })
                
                elif 'Destination:' in line:
                    filename = line.split('Destination:')[-1].strip()
                    update_progress(normalized_url, {
                        'status': 'downloading',
                        'progress': last_progress,
                        'filename': filename
                    })
                
                elif '[ExtractAudio]' in line or '[Merger]' in line:
                    update_progress(normalized_url, {
                        'status': 'processing',
                        'progress': 99,
                        'filename': filename
                    })

            process.wait()
            
            if process.returncode == 0:
                update_progress(normalized_url, {
                    'status': 'completed',
                    'progress': 100,
                    'filename': filename
                })
            else:
                update_progress(normalized_url, {
                    'status': 'failed',
                    'progress': last_progress,
                    'filename': filename,
                    'error': f"Process exited with code {process.returncode}"
                })

        except Exception as e:
            print(f"Download error: {e}")
            update_progress(normalized_url, {
                'status': 'error',
                'progress': 0,
                'filename': None,
                'error': str(e)
            })

    threading.Thread(target=run_download, daemon=True).start()
    return jsonify({
        "message": "Download started",
        "videoUrl": video_url,
        "quality": quality,
        "format": format_type
    })

@app.route('/progress/<path:video_url>')
def get_progress(video_url):
    try:
        video_url = video_url.replace('https:/', 'https://').replace('http:/', 'http://')
        
        if os.path.exists(PROGRESS_FILE):
            with open(PROGRESS_FILE, 'r') as f:
                data = json.load(f)
                for url, progress in data.items():
                    if url.lower() == video_url.lower():
                        return jsonify(progress)
                
        return jsonify({
            "status": "queued",
            "progress": 0,
            "filename": None
        })
    except Exception as e:
        print(f"Progress check failed: {e}")
        return jsonify({
            "status": "error",
            "progress": 0,
            "filename": None
        })

# New way to handle startup in Flask 2.4+
with app.app_context():
    cleanup_old_entries()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)