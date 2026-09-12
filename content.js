const syncedChats = new Set();
let isOrphaned = false;

// Create a connection to the background script
try {
  const port = chrome.runtime.connect({ name: "content-script-port" });
  port.onDisconnect.addListener(() => {
    isOrphaned = true; // The extension was reloaded/updated!
  });
} catch (e) {
  isOrphaned = true;
}

function dlog(msg) {
  if (isOrphaned) return;
  try {
    chrome.runtime.sendMessage({ action: 'debugLog', msg: msg });
  } catch (e) {
    isOrphaned = true;
  }
}

function extractChatState(chatElement) {
  let participantName = '';
  const nameEl = chatElement.querySelector('h2, h3, .msg-overlay-bubble-header__title, .msg-thread__participant-name');
  
  if (nameEl) {
    participantName = nameEl.innerText.trim().split('\n')[0];
  }

  // Fallback to searching for profile links if the H2 didn't have a name
  if (!participantName || participantName.toLowerCase() === 'messaging') {
    const links = Array.from(chatElement.querySelectorAll('a[href*="/in/"]'));
    const profileLink = links.find(a => !a.href.includes('/in/me') && !a.innerText.toLowerCase().includes('you') && !a.innerText.toLowerCase().includes('view') && a.innerText.trim().length > 1);
    if (profileLink) {
      participantName = profileLink.innerText.trim().split('\n')[0];
    }
  }

  if (!participantName || participantName.toLowerCase().includes('yuvraj')) {
    return;
  }
  
  // We don't strictly need the identifier anymore since we match by name perfectly!
  const identifier = participantName.toLowerCase().replace(/\s+/g, '-'); 

  const messages = chatElement.querySelectorAll('li');
  if (messages.length === 0) return;
  
  let lastMsg = null;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].innerText && messages[i].innerText.trim().length > 0) {
      lastMsg = messages[i];
      break;
    }
  }

  if (!lastMsg) return;

  const msgHtml = lastMsg.innerHTML.toLowerCase();
  const msgText = lastMsg.innerText || '';

  // Grab the logged-in user's name from the nav bar
  const myNameEl = document.querySelector('.global-nav__me-photo');
  const myName = myNameEl ? myNameEl.getAttribute('alt').toLowerCase().trim() : 'UNKNOWN_USER';

  // Determine if sent by user
  const isFromMe = msgHtml.includes('msg-s-message-list__event--me') || 
                   msgHtml.includes('msg-s-message-group--me') ||
                   msgHtml.includes('you sent') || 
                   msgHtml.includes('visually-hidden">you') ||
                   (myName !== 'UNKNOWN_USER' && msgHtml.includes(myName));
                   
  const hasTime = msgText.includes('AM') || msgText.includes('PM') || msgText.includes(':');
  const hasMonth = /jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i.test(msgText);
  const isToday = hasTime && !hasMonth;

  if (isToday) {
    const cacheKey = identifier + (isFromMe ? '-sent' : '-reply');
    
    if (!syncedChats.has(cacheKey)) {
      syncedChats.add(cacheKey);
      
      dlog(`MATCH FOUND: Name=${participantName}, Identifier=${identifier}, isMe=${isFromMe}`);
      
      if (isOrphaned) return;
      try {
        if (isFromMe) {
          chrome.runtime.sendMessage({ action: 'logSentMessage', identifier: identifier, name: participantName });
        } else {
          chrome.runtime.sendMessage({ action: 'logReplyReceived', identifier: identifier, name: participantName });
        }
      } catch (e) {
        isOrphaned = true;
      }
    }
  }
}

let intervalId = setInterval(() => {
  if (isOrphaned) {
    clearInterval(intervalId);
    return;
  }
  const chats = document.querySelectorAll('.msg-convo-wrapper, .msg-overlay-conversation-bubble, .msg-thread, .msg-s-message-list-container, aside');
  if (chats.length === 0) {
    dlog("Heartbeat: No chat wrappers found on the screen.");
  } else {
    dlog(`Heartbeat: Found ${chats.length} chat wrappers.`);
    chats.forEach(chat => extractChatState(chat));
  }
}, 3000);
