/**
 * Job Hunter Service Worker (background.js)
 * Manages the offscreen audio playback document in Manifest V3.
 */

let creatingOffscreenPromise = null;

async function hasOffscreenDocument() {
  const offscreenPath = 'src/audio/offscreen.html';
  if ('getContexts' in chrome.runtime) {
    const contexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
      documentUrls: [chrome.runtime.getURL(offscreenPath)]
    });
    return contexts.length > 0;
  }
  // Fallback for Chromium versions where getContexts is not available
  const offscreenUrl = chrome.runtime.getURL(offscreenPath);
  const matchedClients = await self.clients.matchAll();
  return matchedClients.some((client) => client.url === offscreenUrl);
}

async function ensureOffscreenDocument() {
  if (await hasOffscreenDocument()) {
    return;
  }

  if (creatingOffscreenPromise) {
    await creatingOffscreenPromise;
    return;
  }

  creatingOffscreenPromise = chrome.offscreen.createDocument({
    url: 'src/audio/offscreen.html',
    reasons: ['AUDIO_PLAYBACK'],
    justification: 'Play continuous audio chime alert when new job is detected'
  });

  await creatingOffscreenPromise;
  creatingOffscreenPromise = null;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PLAY_ALARM') {
    ensureOffscreenDocument()
      .then(() => {
        setTimeout(() => {
          chrome.runtime.sendMessage({
            type: 'OFFSCREEN_START_CHIME',
            ringtone: message.ringtone || 'chime'
          }).catch(() => {});
        }, 80);
      })
      .catch((err) => {
        console.error('Error creating offscreen audio document:', err);
      });
  } else if (message.type === 'PREVIEW_ALARM') {
    ensureOffscreenDocument()
      .then(() => {
        setTimeout(() => {
          chrome.runtime.sendMessage({
            type: 'OFFSCREEN_PREVIEW_CHIME',
            ringtone: message.ringtone || 'chime'
          }).catch(() => {});
        }, 80);
      })
      .catch(() => {});
  } else if (message.type === 'STOP_ALARM') {
    chrome.runtime.sendMessage({ type: 'OFFSCREEN_STOP_CHIME' }).catch(() => {});
  }
});

// Toolbar action icon click handler
chrome.action.onClicked.addListener(async (tab) => {
  if (tab && tab.url && tab.url.includes('jobclerk.com')) {
    chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_UI' }).catch(() => {});
  } else {
    chrome.tabs.create({ url: 'https://www.jobclerk.com/jobs?sort=newest' });
  }
});
