import { fetchSheetData, appendRow, updateCell } from './utils/sheets.js';
import { getCsrfToken, fetchRecentConnections } from './utils/linkedin.js';

function logToStorage(msg) {
  chrome.storage.local.get(['logs'], (res) => {
    const logs = res.logs || [];
    logs.unshift(`[${new Date().toLocaleTimeString()}] ${msg}`);
    if (logs.length > 30) logs.pop(); 
    chrome.storage.local.set({ logs });
  });
}

chrome.webRequest.onCompleted.addListener(
  function(details) {
    if (details.method === "POST" && (details.statusCode === 201 || details.statusCode === 200)) {
      const url = details.url.toLowerCase();
      // Catch connection requests
      if (url.includes('norminvitations') || url.includes('createv2') || url.includes('relationships')) {
        logToStorage(`Network hit: Intercepted connection API.`);
        
        let targetTabId = details.tabId;
        
        if (targetTabId === -1) {
          chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            if (tabs && tabs[0]) {
              executeExtraction(tabs[0].id);
            }
          });
        } else {
          executeExtraction(targetTabId);
        }
      }
    }
  },
  { urls: ["https://www.linkedin.com/voyager/api/*"] }
);

function executeExtraction(tabId) {
  logToStorage(`Injecting scraper into Tab ${tabId}...`);
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: () => {
      if (!window.location.href.includes('/in/')) return null;

      // The most bulletproof way to get the name on a profile page is the page title!
      let rawTitle = document.title || '';
      rawTitle = rawTitle.replace(/^\(\d+\)\s*/, ''); // Remove (1) notification counters
      let name = rawTitle.split(' | ')[0].trim();

      // Fallback to DOM if title is weird
      if (!name || name === 'LinkedIn') {
        const nameEl = document.querySelector('main h1') || document.querySelector('.text-heading-xlarge');
        name = nameEl ? nameEl.innerText.trim() : 'Unknown';
      }

      // Headline / Company
      const headlineEl = document.querySelector('main .text-body-medium') || document.querySelector('.text-body-medium');
      const company = headlineEl ? headlineEl.innerText.trim() : 'Unknown';

      let url = window.location.href.split('?')[0]; 
      if (url.endsWith('/')) url = url.slice(0, -1);

      return { name, company, url };
    }
  }).then((results) => {
    if (results && results[0] && results[0].result) {
      const data = results[0].result;
      logToStorage(`Scraped: ${data.name}`);
      handleSentConnection(data);
    } else {
      logToStorage('Scraping skipped (not on /in/ page).');
    }
  }).catch((e) => {
    logToStorage(`Scripting Err: ${e.message}`);
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'debugLog') {
    // Legacy content.js logs
  } else if (request.action === 'logSentConnection') {
    handleSentConnection(request.data);
  } else if (request.action === 'startPolling') {
    chrome.alarms.create('linkedinSync', { periodInMinutes: 5 });
    logToStorage('Started monitoring background sync.');
    performSync(); 
  } else if (request.action === 'stopPolling') {
    chrome.alarms.clear('linkedinSync');
    logToStorage('Stopped monitoring.');
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'linkedinSync') {
    performSync();
  }
});

async function handleSentConnection(data) {
  try {
    const { sheetId, sheetTab } = await chrome.storage.local.get(['sheetId', 'sheetTab']);
    if (!sheetId || !sheetTab) {
      logToStorage('Cannot log: Sheet ID/Tab not set.');
      return;
    }

    logToStorage(`Writing ${data.name} to Sheet...`);

    const sheetData = await fetchSheetData(sheetId, `${sheetTab}!A:A`);
    const sNo = sheetData.values ? sheetData.values.length : 1;
    const today = new Date().toLocaleDateString('en-GB');

    const rowData = [
      sNo,
      data.name,
      data.url,
      data.company,
      'Pending',
      'Sent',
      today
    ];

    await appendRow(sheetId, sheetTab, rowData);
    logToStorage(`Success! Appended row ${sNo + 1}`);
  } catch (err) {
    console.error(err);
    logToStorage(`Sheet Error: ${err.message}`);
  }
}

async function performSync() {
  try {
    const { sheetId, sheetTab } = await chrome.storage.local.get(['sheetId', 'sheetTab']);
    if (!sheetId || !sheetTab) return;

    const csrfToken = await getCsrfToken();
    if (!csrfToken) return;

    const sheetData = await fetchSheetData(sheetId, `${sheetTab}!A:Z`);
    if (!sheetData.values || sheetData.values.length < 2) return;

    const recentConnections = await fetchRecentConnections(csrfToken);
    logToStorage(`Sync: Fetched ${recentConnections.length} recent connections from API.`);

    for (let i = 1; i < sheetData.values.length; i++) {
      const row = sheetData.values[i];
      const url = row[2] || '';
      const connectedStatus = row[4] || '';

      if (connectedStatus.toLowerCase() === 'pending' && url.includes('linkedin.com/in/')) {
        const parts = url.split('/in/');
        if (parts.length > 1) {
          let identifier = parts[1].split('/')[0].split('?')[0];
          // Some URLs end with a trailing slash which leaves it at the end of identifier, strip it
          identifier = identifier.replace(/\/$/, '');
          
          if (recentConnections.includes(identifier)) {
            const sheetRowNumber = i + 1; 
            logToStorage(`Accepted connection: ${row[1]}. Updating sheet...`);
            await updateCell(sheetId, sheetTab, `E${sheetRowNumber}`, 'Yes');
          }
        }
      }
    }
  } catch (err) {
    console.error(err);
    logToStorage(`Sync Error: ${err.message}`);
  }
}
