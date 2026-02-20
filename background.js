// background.js
chrome.runtime.onInstalled.addListener(() => {
  console.log('Video Downloader Pro installed');
});

// Optional: Ping backend on startup
async function checkBackend() {
  try {
    const res = await fetch('http://localhost:5000');
    if (res.ok) {
      console.log('✅ Backend is running');
    }
  } catch (err) {
    console.warn('❌ Backend not reachable. Please run: node backend.js');
  }
}

checkBackend();