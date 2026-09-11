function extractAndLogMessage(container) {
  if (!container) return;
  const profileLink = container.querySelector('a[href*="/in/"]');
  if (profileLink) {
    let url = profileLink.href;
    let parts = url.split('/in/');
    if (parts.length > 1) {
      let identifier = parts[1].split('/')[0].split('?')[0].replace(/\/$/, '');
      chrome.runtime.sendMessage({ action: 'logSentMessage', identifier: identifier });
    }
  }
}

document.addEventListener('click', (e) => {
  const sendBtn = e.target.closest('button.msg-form__send-button');
  if (sendBtn) {
    const container = sendBtn.closest('.msg-convo-wrapper') || sendBtn.closest('.msg-overlay-conversation-bubble') || sendBtn.closest('.msg-thread');
    extractAndLogMessage(container);
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    // LinkedIn uses contenteditable divs for message input
    const editor = e.target.closest('.msg-form__contenteditable') || e.target.closest('textarea.msg-form__message-texteditor');
    if (editor) {
      const container = editor.closest('.msg-convo-wrapper') || editor.closest('.msg-overlay-conversation-bubble') || editor.closest('.msg-thread');
      extractAndLogMessage(container);
    }
  }
});
