const syncedChats = new Set();

function extractChatState(chatElement) {
  const profileLink = chatElement.querySelector('a[href*="/in/"]');
  if (!profileLink) return;
  
  let parts = profileLink.href.split('/in/');
  if (parts.length < 2) return;
  
  let identifier = parts[1].split('/')[0].split('?')[0].replace(/\/$/, '');

  // Look for message events in the chat
  const messages = chatElement.querySelectorAll('li.msg-s-message-list__event, .msg-s-message-list__event');
  if (messages.length === 0) return;
  
  const lastMsg = messages[messages.length - 1];
  const msgHtml = lastMsg.innerHTML.toLowerCase();
  const msgText = lastMsg.innerText || '';

  // Determine if the last message was sent by the user ("You")
  const isFromMe = lastMsg.classList.contains('msg-s-message-list__event--me') || 
                   msgHtml.includes('you sent') || 
                   msgHtml.includes('visually-hidden">you');
                   
  // Check if it was sent today. LinkedIn shows just "9:00 AM" for today, but "Sep 11" for older.
  const hasTime = msgText.includes('AM') || msgText.includes('PM');
  const hasMonth = /jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i.test(msgText);
  const isToday = hasTime && !hasMonth;

  if (isToday) {
    const cacheKey = identifier + (isFromMe ? '-sent' : '-reply');
    
    // Only send the update once per page load to avoid spamming the sheet
    if (!syncedChats.has(cacheKey)) {
      syncedChats.add(cacheKey);
      
      if (isFromMe) {
        chrome.runtime.sendMessage({ action: 'logSentMessage', identifier: identifier });
      } else {
        chrome.runtime.sendMessage({ action: 'logReplyReceived', identifier: identifier });
      }
    }
  }
}

// Check open chats every 3 seconds
setInterval(() => {
  const chats = document.querySelectorAll('.msg-convo-wrapper, .msg-overlay-conversation-bubble, .msg-thread');
  chats.forEach(chat => extractChatState(chat));
}, 3000);

// Also keep the instant keydown/click listeners just in case for instant feedback when typing locally
function instantLog(container) {
  if (!container) return;
  const profileLink = container.querySelector('a[href*="/in/"]');
  if (profileLink) {
    let parts = profileLink.href.split('/in/');
    if (parts.length > 1) {
      let identifier = parts[1].split('/')[0].split('?')[0].replace(/\/$/, '');
      const cacheKey = identifier + '-sent';
      if (!syncedChats.has(cacheKey)) {
        syncedChats.add(cacheKey);
        chrome.runtime.sendMessage({ action: 'logSentMessage', identifier: identifier });
      }
    }
  }
}

document.addEventListener('click', (e) => {
  const sendBtn = e.target.closest('button.msg-form__send-button');
  if (sendBtn) instantLog(sendBtn.closest('.msg-convo-wrapper') || sendBtn.closest('.msg-overlay-conversation-bubble') || sendBtn.closest('.msg-thread'));
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    const editor = e.target.closest('.msg-form__contenteditable') || e.target.closest('textarea.msg-form__message-texteditor');
    if (editor) instantLog(editor.closest('.msg-convo-wrapper') || editor.closest('.msg-overlay-conversation-bubble') || editor.closest('.msg-thread'));
  }
});
