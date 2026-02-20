// contentScript.js - Universal Video Downloader (Enhanced)
(function () {
  console.log('🎬 Video Downloader: Content script loaded');

  const BACKEND_URL = 'http://localhost:5000';

  // Inject buttons on page load and when DOM changes
  injectDownloadButtons();
  const observer = new MutationObserver(injectDownloadButtons);
  observer.observe(document.body, { childList: true, subtree: true });

  function injectDownloadButtons() {
    const videos = document.querySelectorAll('video');

    videos.forEach((video) => {
      if (video.hasAttribute('data-downloader-injected')) return;

      // Mark as processed
      video.setAttribute('data-downloader-injected', 'true');

      // Create UI container
      const container = createButtonContainer(video);
      video.parentNode.insertBefore(container, video);
    });
  }

  function createButtonContainer(video) {
    const container = document.createElement('div');
    container.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      z-index: 999999;
      display: flex;
      gap: 5px;
      background: rgba(0, 0, 0, 0.7);
      padding: 6px 10px;
      border-radius: 6px;
      border: 1px solid #444;
    `;

    // Quality selector
    const qualitySelect = document.createElement('select');
    qualitySelect.innerHTML = `
      <option value="best">Best</option>
      <option value="720p">720p</option>
      <option value="480p">480p</option>
      <option value="360p">360p</option>
    `;
    qualitySelect.style.cssText = 'padding: 4px; border-radius: 4px; font-size: 12px;';

    // Download button
    const downloadBtn = document.createElement('button');
    downloadBtn.textContent = '⬇️ Download';
    downloadBtn.style.cssText = `
      background: #4CAF50;
      color: white;
      border: none;
      padding: 4px 8px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      font-weight: bold;
    `;
    downloadBtn.onmouseenter = () => (downloadBtn.style.background = '#45a049');
    downloadBtn.onmouseleave = () => (downloadBtn.style.background = '#4CAF50');

    // Append elements
    container.appendChild(qualitySelect);
    container.appendChild(downloadBtn);

    // Make video container relative
    if (!['relative', 'absolute', 'fixed'].includes(getComputedStyle(video).position)) {
      video.style.position = 'relative';
    }

    // Click handler
    // Inside handleDownload function
let videoUrl = video.src || video.querySelector('source')?.src;

// If no direct video, use current page (for YouTube, etc.)
if (!videoUrl || !isValidUrl(videoUrl)) {
  videoUrl = window.location.href; // Let backend try to extract
}
    downloadBtn.addEventListener('click', async () => {
      await handleDownload(video, downloadBtn, qualitySelect);
    });

    return container;
  }

  async function handleDownload(video, button, qualitySelect) {
    let videoUrl = video.src || video.querySelector('source')?.src;

    // 🎯 Try to get direct video URL
    if (!videoUrl || !isValidUrl(videoUrl)) {
      // Fallback 1: Look for blob or media source
      if (video.currentSrc && video.currentSrc.startsWith('blob:')) {
        alert('⚠️ This video is streamed (blob). Try copying the direct link from network tab.');
        return;
      }

      // Fallback 2: Use current page URL (for YouTube, TikTok, etc.)
      videoUrl = window.location.href;
      console.log('📄 No direct video found. Using page URL:', videoUrl);
    }

    // Disable button
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = '🚀 Downloading...';

    try {
      const response = await fetch(`${BACKEND_URL}/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl,
          quality: qualitySelect.value,
          format: videoUrl === window.location.href ? 'video' : 'video', // can be enhanced later
        }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log('✅ Download started:', data);
        showSuccessToast(`Downloading: ${data.filename || 'video'}`);
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err) {
      console.error('❌ Download failed:', err);
      showErrorToast(`Failed: ${err.message}`);
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  }

  // ✅ URL Validator
  function isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch {
      return false;
    }
  }

  // ✅ Toast Notifications (non-blocking)
  function showSuccessToast(message) {
    showToast(message, '#4CAF50');
  }

  function showErrorToast(message) {
    showToast(message, '#f44336');
  }

  function showToast(message, bg) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${bg};
      color: white;
      padding: 12px 16px;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 9999999;
      font-size: 14px;
      max-width: 300px;
      word-wrap: break-word;
      transition: opacity 0.5s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => document.body.removeChild(toast), 500);
    }, 3000);
  }
})();