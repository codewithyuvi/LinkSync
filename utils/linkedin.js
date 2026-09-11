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

  if (data.included) {
    const conversations = data.included.filter(item => item.$type === 'com.linkedin.voyager.messaging.Conversation');
    
    for (const convo of conversations) {
      if (convo.unreadCount > 0 && convo.participants) {
        // If there's an unread message, it means someone replied to us!
        // We will extract all participants' public identifiers.
        for (const participant of convo.participants) {
          if (participant.messagingMember && participant.messagingMember.miniProfile && participant.messagingMember.miniProfile.publicIdentifier) {
            repliedProfiles.push(participant.messagingMember.miniProfile.publicIdentifier);
          }
        }
      }
    }
  }

  return repliedProfiles;
}
