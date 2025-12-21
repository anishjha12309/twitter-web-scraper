/**
 * Twitter Cookie Sync - Background Service Worker
 * Monitors Twitter cookies and syncs them to the backend
 */

// Sync interval in minutes (30 min = 0.5 hour)
const SYNC_INTERVAL_MINUTES = 30;

// Setup periodic cookie sync using Chrome alarms
chrome.alarms.create('cookieSync', {
  periodInMinutes: SYNC_INTERVAL_MINUTES
});

// Listen for alarm to trigger periodic sync
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'cookieSync') {
    console.log('⏰ Periodic cookie sync triggered');
    const result = await syncCookies();
    if (result.success) {
      console.log('✅ Periodic sync completed successfully');
    } else {
      console.log('⚠️ Periodic sync failed:', result.error);
    }
  }
});

// Also sync immediately when service worker starts (extension loads/updates)
chrome.runtime.onInstalled.addListener(async () => {
  console.log('🚀 Extension installed/updated, syncing cookies...');
  // Small delay to ensure storage is ready
  setTimeout(async () => {
    const result = await syncCookies();
    console.log('Initial sync result:', result);
  }, 1000);
});

// Sync when browser starts and extension is loaded
chrome.runtime.onStartup.addListener(async () => {
  console.log('🖥️ Browser started, syncing cookies...');
  setTimeout(async () => {
    const result = await syncCookies();
    console.log('Startup sync result:', result);
  }, 2000);
});

// Get cookies from Twitter/X domains
async function getTwitterCookies() {
  const cookies = {};
  
  // Get cookies from both domains
  const domains = ['twitter.com', 'x.com'];
  
  for (const domain of domains) {
    const domainCookies = await chrome.cookies.getAll({ domain: domain });
    for (const cookie of domainCookies) {
      cookies[cookie.name] = cookie.value;
    }
  }
  
  return cookies;
}

// Sync cookies to backend
async function syncCookies() {
  const config = await chrome.storage.sync.get(['backendUrl', 'apiKey']);
  
  if (!config.backendUrl || !config.apiKey) {
    console.log('❌ Backend URL or API Key not configured');
    return { success: false, error: 'Not configured' };
  }
  
  const cookies = await getTwitterCookies();
  
  // Check if we have required cookies
  if (!cookies.auth_token || !cookies.ct0) {
    console.log('❌ Missing required cookies (auth_token or ct0). Are you logged into Twitter?');
    return { success: false, error: 'Not logged into Twitter' };
  }
  
  try {
    const response = await fetch(`${config.backendUrl}/api/cookies/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': config.apiKey
      },
      body: JSON.stringify({ cookies })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Cookies synced successfully!', result);
      // Store last sync time
      await chrome.storage.local.set({ lastSync: Date.now() });
      return { success: true, message: result.message };
    } else {
      console.log('❌ Sync failed:', result);
      return { success: false, error: result.detail || 'Unknown error' };
    }
  } catch (error) {
    console.error('❌ Network error:', error);
    return { success: false, error: error.message };
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'syncNow') {
    syncCookies().then(sendResponse);
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'getCookies') {
    getTwitterCookies().then(sendResponse);
    return true;
  }
});

// Auto-sync when Twitter cookies change (auth_token specifically)
chrome.cookies.onChanged.addListener((changeInfo) => {
  // Only sync when cookie is SET (not removed)
  if (changeInfo.removed) {
    return; // Cookie was deleted, skip sync
  }
  
  if (changeInfo.cookie.domain.includes('twitter.com') || changeInfo.cookie.domain.includes('x.com')) {
    if (changeInfo.cookie.name === 'auth_token') {
      console.log('🔄 Auth token updated, waiting for other cookies...');
      // Wait 2 seconds for all cookies to be set after login
      setTimeout(() => {
        console.log('🔄 Now syncing cookies...');
        syncCookies();
      }, 2000);
    }
  }
});
