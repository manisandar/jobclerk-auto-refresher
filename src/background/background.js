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

/* ==========================================================================
   Telegram Alert Configuration Loader (from src/config/config.json)
   Kept separate and excluded from Git for privacy and security.
   ========================================================================== */
async function getTelegramConfig() {
  try {
    const configUrl = chrome.runtime.getURL('src/config/config.json');
    const response = await fetch(configUrl);
    if (response.ok) {
      const data = await response.json();
      return {
        ENABLED: data.ENABLED !== false,
        BOT_TOKEN: (data.BOT_TOKEN || data.TELEGRAM_BOT_TOKEN || '').trim(),
        CHAT_ID: (data.CHAT_ID || data.TELEGRAM_CHAT_ID || '').trim()
      };
    }
  } catch (err) {
    // config.json not present or unreadable
  }
  return {
    ENABLED: false,
    BOT_TOKEN: '',
    CHAT_ID: ''
  };
}

/* ==========================================================================
   Telegram API Notification Dispatcher
   ========================================================================== */

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatJobAlertMessage(jobs) {
  const count = jobs.length;
  let text = `<b>JobClerk Alert: ${count} New Vacanc${count > 1 ? 'ies' : 'y'} Detected</b>\n\n`;
  jobs.slice(0, 5).forEach((job, idx) => {
    const jobTitle = escapeHtml(job.title || 'Untitled Vacancy');
    const jobUrl = job.href ? escapeHtml(job.href) : 'https://www.jobclerk.com/jobs';
    text += `${idx + 1}. <a href="${jobUrl}"><b>${jobTitle}</b></a>\n`;
  });
  if (jobs.length > 5) {
    text += `\n<i>...and ${jobs.length - 5} more new vacancies.</i>\n`;
  }
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  text += `\n<i>Detected at ${timeStr} via JobClerk Refresher</i>`;
  return text;
}

async function sendTelegramMessage(token, chatId, text) {
  if (!token || !chatId) {
    return { success: false, error: 'Bot Token or Chat ID is missing.' };
  }
  const cleanToken = token.trim();
  const cleanChatId = chatId.trim();
  const url = `https://api.telegram.org/bot${cleanToken}/sendMessage`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: cleanChatId,
        text: text,
        parse_mode: 'HTML',
        disable_web_page_preview: false
      })
    });
    const data = await response.json();
    if (data.ok) {
      return { success: true, result: data.result };
    } else {
      return { success: false, error: data.description || 'Telegram API request failed.' };
    }
  } catch (err) {
    return { success: false, error: err.message || 'Network request failed.' };
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SEND_TELEGRAM_ALERT') {
    getTelegramConfig().then((config) => {
      if (!config.ENABLED || !config.BOT_TOKEN || !config.CHAT_ID) {
        console.warn('[JobClerk Refresher] Telegram alerts disabled or not configured in src/config/config.json');
        return;
      }
      const alertText = formatJobAlertMessage(message.jobs || []);
      sendTelegramMessage(config.BOT_TOKEN, config.CHAT_ID, alertText)
        .then((res) => {
          if (!res.success) {
            console.error('[JobClerk Refresher] Telegram alert error:', res.error);
          } else {
            console.log('[JobClerk Refresher] Telegram alert successfully posted to channel!');
          }
        })
        .catch((err) => console.error('[JobClerk Refresher] Telegram send error:', err));
    });
  }

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
