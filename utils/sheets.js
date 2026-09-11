async function getAuthToken() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: false }, (token) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(token);
      }
    });
  });
}

export async function fetchSheetData(sheetId, range) {
  const token = await getAuthToken();
  const encodedRange = encodeURIComponent(range);
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodedRange}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch sheet data');
  return res.json();
}

export async function appendRow(sheetId, tabName, values) {
  const token = await getAuthToken();
  // Constrain the range to A:K so Google Sheets doesn't try to guess the start column
  const encodedRange = encodeURIComponent(`${tabName}!A:K`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodedRange}:append?valueInputOption=USER_ENTERED`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      range: `${tabName}!A:K`,
      majorDimension: 'ROWS',
      values: [values]
    })
  });
  if (!res.ok) throw new Error('Failed to append row');
  return res.json();
}

export async function updateCell(sheetId, tabName, cell, value) {
  const token = await getAuthToken();
  const encodedRange = encodeURIComponent(`${tabName}!${cell}`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodedRange}?valueInputOption=USER_ENTERED`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      range: `${tabName}!${cell}`,
      majorDimension: 'ROWS',
      values: [[value]]
    })
  });
  if (!res.ok) throw new Error('Failed to update cell');
  return res.json();
}
