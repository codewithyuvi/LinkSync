document.addEventListener('DOMContentLoaded', async () => {
  const sheetIdInput = document.getElementById('sheetId');
  const sheetTabInput = document.getElementById('sheetTab');
  const saveBtn = document.getElementById('saveSettingsBtn');
  const authBtn = document.getElementById('authBtn');
  const authHint = document.getElementById('authHint');
  const toggleMonitorBtn = document.getElementById('toggleMonitorBtn');
  const statusText = document.getElementById('statusText');
  const logArea = document.getElementById('logArea');

  // Load existing settings
  chrome.storage.local.get(['sheetId', 'sheetTab', 'isMonitoring', 'logs'], (res) => {
    if (res.sheetId) sheetIdInput.value = res.sheetId;
    if (res.sheetTab) sheetTabInput.value = res.sheetTab;
    
    if (res.isMonitoring) {
      statusText.textContent = 'Running';
      statusText.className = 'status-text running';
      toggleMonitorBtn.textContent = 'Stop Monitoring';
      toggleMonitorBtn.style.background = '#d93025';
    }

    if (res.logs) {
      logArea.value = res.logs.join('\n');
    }
  });

  // Check auth state
  chrome.identity.getAuthToken({ interactive: false }, (token) => {
    if (token) {
      authHint.textContent = 'Signed in.';
      authBtn.textContent = 'Sign Out';
    } else {
      authHint.textContent = 'Not signed in.';
      authBtn.textContent = 'Sign in with Google';
    }
  });

  // Save Settings
  saveBtn.addEventListener('click', () => {
    const sheetId = sheetIdInput.value.trim();
    const sheetTab = sheetTabInput.value.trim();
    chrome.storage.local.set({ sheetId, sheetTab }, () => {
      saveBtn.textContent = 'Saved!';
      setTimeout(() => { saveBtn.textContent = 'Save Settings'; }, 2000);
    });
  });

  // Toggle Auth
  authBtn.addEventListener('click', () => {
    if (authBtn.textContent === 'Sign Out') {
      chrome.identity.getAuthToken({ interactive: false }, (token) => {
        if (token) {
          fetch('https://accounts.google.com/o/oauth2/revoke?token=' + token).then(() => {
            chrome.identity.removeCachedAuthToken({ token }, () => {
              authHint.textContent = 'Not signed in.';
              authBtn.textContent = 'Sign in with Google';
            });
          });
        }
      });
    } else {
      chrome.identity.getAuthToken({ interactive: true }, (token) => {
        if (token) {
          authHint.textContent = 'Signed in.';
          authBtn.textContent = 'Sign Out';
        }
      });
    }
  });

  // Toggle Monitor
  toggleMonitorBtn.addEventListener('click', () => {
    chrome.storage.local.get(['isMonitoring'], (res) => {
      const isMonitoring = !res.isMonitoring;
      chrome.storage.local.set({ isMonitoring }, () => {
        if (isMonitoring) {
          statusText.textContent = 'Running';
          statusText.className = 'status-text running';
          toggleMonitorBtn.textContent = 'Stop Monitoring';
          toggleMonitorBtn.style.background = '#d93025';
          chrome.runtime.sendMessage({ action: 'startPolling' });
        } else {
          statusText.textContent = 'Stopped';
          statusText.className = 'status-text';
          toggleMonitorBtn.textContent = 'Start Monitoring';
          toggleMonitorBtn.style.background = '#0a66c2';
          chrome.runtime.sendMessage({ action: 'stopPolling' });
        }
      });
    });
  });
});
