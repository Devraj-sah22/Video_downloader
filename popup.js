// popup.js - Ultimate Video Downloader (Fixed & Optimized)
document.addEventListener('DOMContentLoaded', () => {
  const videoUrlInput = document.getElementById('videoUrl');
  const downloadBtn = document.getElementById('downloadBtn');
  const formatButtons = document.querySelectorAll('.format-btn');
  const qualityButtons = document.querySelectorAll('.quality-btn');
  const progressContainer = document.getElementById('progressContainer');
  const progressFill = document.getElementById('progressFill');
  const progressPercent = document.getElementById('progressPercent');
  const statusText = document.getElementById('statusText');
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toastMessage');

  let currentFormat = 'video';
  let currentQuality = '1080p';
  let progressInterval = null;
  const BACKEND_URL = 'http://localhost:5000';

  // Initialize UI
  async function initUI() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentUrl = tabs[0]?.url || '';
      
      // Only auto-fill if it's a direct video link
      if (/\.(mp4|webm|mov|mkv|avi|flv|wmv)$/i.test(currentUrl)) {
        videoUrlInput.value = currentUrl;
      } else {
        videoUrlInput.value = currentUrl;
      }
    } catch (err) {
      console.warn('Unable to get current tab URL');
    }

    // Format selection
    formatButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        formatButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFormat = btn.dataset.format;
        
        // Update badge
        const badge = document.querySelector('.quality-badge');
        if (badge) {
          badge.textContent = currentFormat === 'audio' ? 'AUDIO' : currentQuality.toUpperCase();
        }
      });
    });

    // Quality selection
    qualityButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        qualityButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentQuality = btn.dataset.quality;
        
        if (currentFormat === 'video') {
          const badge = document.querySelector('.quality-badge');
          if (badge) badge.textContent = currentQuality.toUpperCase();
        }
      });
    });
  }

  // Show toast notification
  function showToast(message, type = 'success', duration = 3000) {
    toast.className = `toast ${type}`;
    toastMessage.textContent = message;
    toast.querySelector('i').className = 
      type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-circle';
    
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, duration);
  }

  // Check if backend is reachable
  async function isBackendAvailable() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const res = await fetch(BACKEND_URL, {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return res.ok;
    } catch (err) {
      console.error('Backend unreachable:', err.message);
      return false;
    }
  }

  // Start download
  async function startDownload() {
    const videoUrl = videoUrlInput.value.trim();
    if (!videoUrl) {
      showToast('Please enter a valid URL', 'error');
      return;
    }

    // Check backend
    if (!(await isBackendAvailable())) {
      showToast('❌ Backend not running!\nRun: node backend.js', 'error', 5000);
      return;
    }

    // Reset progress
    resetProgress();
    progressContainer.style.display = 'block';
    downloadBtn.disabled = true;
    downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PROCESSING...';
    statusText.textContent = 'Connecting to backend...';

    try {
      const response = await fetch(`${BACKEND_URL}/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl,
          quality: currentQuality,
          format: currentFormat
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP ${response.status}`);
      }

      const result = await response.json();
      showToast(`✅ Download started: ${result.filename || 'video'}`);
      statusText.textContent = 'Download in progress...';

      // Optional: Poll for progress (only if backend supports /progress)
      // Commented out until you add /progress endpoint
      /*
      const encodedUrl = encodeURIComponent(videoUrl);
      progressInterval = setInterval(async () => {
        try {
          const res = await fetch(`${BACKEND_URL}/progress/${encodedUrl}`);
          const data = await res.json();
          const progress = Math.round(data.progress || 0);
          progressFill.style.width = `${progress}%`;
          progressPercent.textContent = `${progress}%`;

          if (data.status === 'completed') {
            statusText.textContent = `✅ Complete: ${data.filename}`;
            showToast('Download completed!');
            cleanupProgress();
          } else if (data.status === 'failed') {
            statusText.textContent = `❌ Failed: ${data.error}`;
            showToast('Download failed', 'error');
            cleanupProgress();
          }
        } catch (err) {
          console.warn('Progress check failed');
        }
      }, 1000);
      */

      // Simulate progress for demo (remove when real progress is added)
      simulateProgress();

    } catch (err) {
      console.error('Download failed:', err);
      statusText.textContent = `❌ ${err.message}`;
      showToast(`Failed: ${err.message}`, 'error');
    } finally {
      setTimeout(() => {
        downloadBtn.disabled = false;
        downloadBtn.innerHTML = '<i class="fas fa-cloud-download-alt"></i> DOWNLOAD NOW';
      }, 2000);
    }
  }

  function simulateProgress() {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress >= 100) {
        progress = 100;
        progressFill.style.width = '100%';
        progressPercent.textContent = '100%';
        statusText.textContent = '✅ Download complete!';
        clearInterval(interval);
        setTimeout(() => {
          progressContainer.style.display = 'none';
        }, 2000);
        return;
      }
      progressFill.style.width = `${progress}%`;
      progressPercent.textContent = `${Math.round(progress)}%`;
      statusText.textContent = `Downloading... ${Math.round(progress)}%`;
    }, 600);
  }

  function resetProgress() {
    progressFill.style.width = '0%';
    progressPercent.textContent = '0%';
    statusText.textContent = 'Ready to download';
  }

  function cleanupProgress() {
    if (progressInterval) clearInterval(progressInterval);
    progressInterval = null;
  }

  // Event Listeners
  downloadBtn.addEventListener('click', startDownload);

  // Init
  initUI();
});