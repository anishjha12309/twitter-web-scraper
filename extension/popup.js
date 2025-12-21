/**
 * Twitter Cookie Sync - Popup Script
 */

document.addEventListener('DOMContentLoaded', async () => {
  const backendUrlInput = document.getElementById('backendUrl');
  const apiKeyInput = document.getElementById('apiKey');
  const saveBtn = document.getElementById('saveBtn');
  const syncBtn = document.getElementById('syncBtn');
  const statusDiv = document.getElementById('status');
  const cookieStatusDiv = document.getElementById('cookieStatus');
  
  // Load saved config
  const config = await chrome.storage.sync.get(['backendUrl', 'apiKey']);
  if (config.backendUrl) backendUrlInput.value = config.backendUrl;
  if (config.apiKey) apiKeyInput.value = config.apiKey;
  
  // Check current cookie status
  checkCookies();
  
  // Save configuration
  saveBtn.addEventListener('click', async () => {
    const backendUrl = backendUrlInput.value.trim().replace(/\/$/, ''); // Remove trailing slash
    const apiKey = apiKeyInput.value.trim();
    
    if (!backendUrl || !apiKey) {
      showStatus('Please fill in both fields', 'error');
      return;
    }
    
    await chrome.storage.sync.set({ backendUrl, apiKey });
    showStatus('Configuration saved!', 'success');
  });
  
  // Sync cookies
  syncBtn.addEventListener('click', async () => {
    syncBtn.disabled = true;
    syncBtn.textContent = '⏳ Syncing...';
    showStatus('Syncing cookies...', 'info');
    
    try {
      const result = await chrome.runtime.sendMessage({ action: 'syncNow' });
      
      if (result.success) {
        showStatus(result.message || '✅ Sync successful!', 'success');
      } else {
        showStatus(`❌ ${result.error}`, 'error');
      }
    } catch (error) {
      showStatus(`❌ ${error.message}`, 'error');
    }
    
    syncBtn.disabled = false;
    syncBtn.textContent = '🔄 Sync Cookies Now';
  });
  
  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
  }
  
  async function checkCookies() {
    const cookies = await chrome.runtime.sendMessage({ action: 'getCookies' });
    
    if (cookies.auth_token && cookies.ct0) {
      cookieStatusDiv.textContent = '✅ Twitter session detected';
      cookieStatusDiv.className = 'cookie-status valid';
    } else {
      cookieStatusDiv.textContent = '⚠️ Not logged into Twitter - please login first';
      cookieStatusDiv.className = 'cookie-status invalid';
    }
  }
});
