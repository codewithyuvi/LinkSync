export async function getCsrfToken() {
  return new Promise((resolve) => {
    chrome.cookies.get({ url: 'https://www.linkedin.com', name: 'JSESSIONID' }, (cookie) => {
      if (cookie) {
        // LinkedIn wraps the token in quotes, e.g., "ajax:123456"
        resolve(cookie.value.replace(/"/g, ''));
      } else {
        resolve(null);
      }
    });
  });
}

export async function fetchRecentConnections(csrfToken) {
  const url = 'https://www.linkedin.com/voyager/api/relationships/connections?count=50&sortType=RECENTLY_ADDED';
  const res = await fetch(url, {
    headers: {
      'csrf-token': csrfToken,
      'accept': 'application/vnd.linkedin.normalized+json+2.1'
    }
  });
  if (!res.ok) throw new Error('Failed to fetch connections');
  
  const data = await res.json();
  const connections = [];

  // Parse normalized json
  if (data.included) {
    data.included.forEach(item => {
      if (item.$type === 'com.linkedin.voyager.identity.shared.MiniProfile') {
        connections.push(item.publicIdentifier);
      }
    });
  }
  return connections;
}

export async function fetchRecentMessages(csrfToken) {
  // Simplistic fetch of the recent conversations in the inbox
  const url = 'https://www.linkedin.com/voyager/api/messaging/conversations?keyVersion=LEGACY_INBOX';
  const res = await fetch(url, {
    headers: {
      'csrf-token': csrfToken,
      'accept': 'application/vnd.linkedin.normalized+json+2.1'
    }
  });
  if (!res.ok) throw new Error('Failed to fetch messages');
  
  const data = await res.json();
  const repliedProfiles = [];

  // Extract profiles of people who recently replied
  if (data.included) {
    data.included.forEach(item => {
      if (item.$type === 'com.linkedin.voyager.messaging.Event' && item.from) {
        const urn = item.from.messagingMember?.miniProfile;
        if (urn) {
          // URN looks like urn:li:fs_miniProfile:ACoAAABxxxx... we map this to public identifiers
          // Note: for robustness, parsing messages is complex because we need to check if the LAST message was from THEM, not US.
          // For this MVP, we will simply extract all recent participants as "activity".
          // A full implementation requires mapping message Events to Participants to determine direction.
        }
      }
    });
  }
  // To keep it simple and less prone to breaking when LinkedIn changes internal schemas,
  // we'll return an empty array for now and implement a more robust parser next.
  return repliedProfiles;
}
