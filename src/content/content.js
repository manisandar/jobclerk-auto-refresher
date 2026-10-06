/**
 * Job Hunter Auto-Refresher - Content Script
 * Manifest V3 - Plain Vanilla JavaScript (Zero External Dependencies)
 * Humanized UI, Zero Emojis, Draggable Floating Panel, Full Title Display
 */

(() => {
  'use strict';

  // Prevent multiple injections
  if (window.__JH_MONITOR_INITIALIZED__) return;
  window.__JH_MONITOR_INITIALIZED__ = true;

  // Configuration Constants & Selectors
  const STORAGE_KEYS = {
    SEEN_JOBS: 'jh_seen_jobs',
    INTERVAL: 'jh_interval_sec',
    IS_MONITORING: 'jh_is_monitoring',
    IS_MINIMIZED: 'jh_is_minimized',
    IS_CLOSED: 'jh_is_closed',
    UI_POSITION: 'jh_ui_pos'
  };

  const MAX_STORED_JOBS = 50;
  const DEFAULT_INTERVAL_SEC = 10;
  const JOB_SELECTOR = 'h2.text-secondary, .flex.items-start.justify-between h2, h2.font-semibold';

  // Crisp SVG Icon Assets (Replacing all emojis)
  const ICONS = {
    GRIP: `<svg width="8" height="14" viewBox="0 0 8 14" fill="currentColor"><circle cx="2" cy="2" r="1.2"/><circle cx="6" cy="2" r="1.2"/><circle cx="2" cy="7" r="1.2"/><circle cx="6" cy="7" r="1.2"/><circle cx="2" cy="12" r="1.2"/><circle cx="6" cy="12" r="1.2"/></svg>`,
    MINIMIZE: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
    EXPAND: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>`,
    CLOSE: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    PAUSE: `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>`,
    PLAY: `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"/></svg>`,
    RESET: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>`,
    RADAR: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>`
  };

  // Runtime State
  let isMonitoring = true;
  let isClosed = false;
  let refreshIntervalSec = DEFAULT_INTERVAL_SEC;
  let remainingSeconds = DEFAULT_INTERVAL_SEC;
  let countdownTimerId = null;
  let isAlarming = false;
  let detectedNewJobs = [];
  let isMinimized = false;
  let uiPosition = null;

  // DOM Elements
  let uiBox = null;
  let countdownBadge = null;
  let statusText = null;
  let topJobPreview = null;
  let statusDot = null;
  let toggleBtn = null;
  let intervalInput = null;
  let alarmContainer = null;

  /* ==========================================================================
     Storage Helpers (Async/Await)
     ========================================================================== */

  async function getStorageData() {
    return new Promise((resolve) => {
      chrome.storage.local.get(
        [
          STORAGE_KEYS.SEEN_JOBS,
          STORAGE_KEYS.INTERVAL,
          STORAGE_KEYS.IS_MONITORING,
          STORAGE_KEYS.IS_MINIMIZED,
          STORAGE_KEYS.IS_CLOSED,
          STORAGE_KEYS.UI_POSITION
        ],
        (result) => resolve(result || {})
      );
    });
  }

  async function setStorageData(data) {
    return new Promise((resolve) => {
      chrome.storage.local.set(data, resolve);
    });
  }

  /* ==========================================================================
     Job Extraction & Multi-Job Boundary Check
     ========================================================================== */

  function getVisibleJobs() {
    const headings = document.querySelectorAll(JOB_SELECTOR);
    const jobs = [];

    headings.forEach((heading) => {
      const title = heading.textContent.trim().replace(/\s+/g, ' ');
      if (!title) return;

      const card = heading.closest('a') || heading.closest('article, [data-id], .group, .flex') || heading;
      const linkEl = card.querySelector('a[href]') || (card.tagName === 'A' ? card : null);
      const href = linkEl ? linkEl.getAttribute('href') : '';
      const signature = href ? `${title}::${href}` : title;

      jobs.push({ title, signature });
    });

    return jobs;
  }

  async function waitForJobCards(maxWaitMs = 2500) {
    const startTime = Date.now();
    let jobs = getVisibleJobs();
    while (jobs.length === 0 && Date.now() - startTime < maxWaitMs) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      jobs = getVisibleJobs();
    }
    return jobs;
  }

  /* ==========================================================================
     Audio Alarm Controller (Delegated to MV3 Offscreen Document)
     Exempt from web-page autoplay restrictions across tab reloads.
     ========================================================================== */

  function startAlarmLoop() {
    if (isAlarming) return;
    isAlarming = true;
    try {
      chrome.runtime.sendMessage({ type: 'PLAY_ALARM' });
    } catch (e) {
      // Extension context safeguard
    }
  }

  function stopAlarm() {
    if (!isAlarming) return;
    isAlarming = false;
    try {
      chrome.runtime.sendMessage({ type: 'STOP_ALARM' });
    } catch (e) {
      // Extension context safeguard
    }
  }

  /* ==========================================================================
     Countdown & Auto-Refresh Logic
     ========================================================================== */

  function startCountdown() {
    stopCountdown();
    if (!isMonitoring || isAlarming) return;

    remainingSeconds = refreshIntervalSec;
    updateStatusDisplay();

    countdownTimerId = setInterval(() => {
      remainingSeconds--;
      if (remainingSeconds <= 0) {
        stopCountdown();
        if (isMonitoring && !isAlarming) {
          window.location.reload();
        }
      } else {
        updateStatusDisplay();
      }
    }, 1000);
  }

  function stopCountdown() {
    if (countdownTimerId) {
      clearInterval(countdownTimerId);
      countdownTimerId = null;
    }
  }

  /* ==========================================================================
     Global Click-To-Stop (Screen Wide)
     ========================================================================== */

  function handleGlobalStop() {
    if (!isMonitoring && !isAlarming) return;

    stopAlarm();
    stopCountdown();

    isMonitoring = false;
    setStorageData({ [STORAGE_KEYS.IS_MONITORING]: false });

    updateUIState();
  }

  window.addEventListener(
    'click',
    (event) => {
      if (event.target && event.target.closest('#jh-monitor-box')) {
        return;
      }
      handleGlobalStop();
    },
    true
  );

  /* ==========================================================================
     Draggable Position Management
     ========================================================================== */

  function applySavedPosition() {
    if (!uiBox) return;

    if (uiPosition && typeof uiPosition.left === 'number' && typeof uiPosition.top === 'number') {
      const maxLeft = Math.max(10, window.innerWidth - 350);
      const maxTop = Math.max(10, window.innerHeight - 120);

      const safeLeft = Math.max(10, Math.min(maxLeft, uiPosition.left));
      const safeTop = Math.max(10, Math.min(maxTop, uiPosition.top));

      uiBox.style.left = `${safeLeft}px`;
      uiBox.style.top = `${safeTop}px`;
      uiBox.style.right = 'auto';
      uiBox.style.bottom = 'auto';
    } else {
      uiBox.style.top = '20px';
      uiBox.style.right = '20px';
      uiBox.style.left = 'auto';
      uiBox.style.bottom = 'auto';
    }
  }

  function makeDraggable(box, handle) {
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialLeft = 0;
    let initialTop = 0;

    handle.addEventListener('mousedown', (e) => {
      if (e.target.closest('.jh-icon-btn')) return;

      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;

      const rect = box.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;

      box.style.left = `${initialLeft}px`;
      box.style.top = `${initialTop}px`;
      box.style.right = 'auto';
      box.style.bottom = 'auto';

      handle.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';

      function onMouseMove(moveEvent) {
        if (!isDragging) return;

        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;

        let newLeft = initialLeft + dx;
        let newTop = initialTop + dy;

        const maxLeft = Math.max(10, window.innerWidth - box.offsetWidth - 10);
        const maxTop = Math.max(10, window.innerHeight - box.offsetHeight - 10);

        newLeft = Math.max(10, Math.min(maxLeft, newLeft));
        newTop = Math.max(10, Math.min(maxTop, newTop));

        box.style.left = `${newLeft}px`;
        box.style.top = `${newTop}px`;
      }

      function onMouseUp() {
        if (!isDragging) return;
        isDragging = false;
        handle.style.cursor = 'grab';
        document.body.style.userSelect = '';

        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);

        const currentRect = box.getBoundingClientRect();
        uiPosition = {
          left: Math.round(currentRect.left),
          top: Math.round(currentRect.top)
        };
        setStorageData({ [STORAGE_KEYS.UI_POSITION]: uiPosition });
      }

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  }

  /* ==========================================================================
     UI Construction & Controls
     ========================================================================== */

  function createUIBox() {
    if (document.getElementById('jh-monitor-box')) return;

    uiBox = document.createElement('div');
    uiBox.id = 'jh-monitor-box';
    if (isMinimized) uiBox.classList.add('minimized');

    applySavedPosition();

    uiBox.innerHTML = `
      <div class="jh-header" id="jh-header-toggle" title="Click & drag to reposition">
        <div class="jh-title-row">
          <span class="jh-drag-grip">${ICONS.GRIP}</span>
          <div class="jh-status-dot" id="jh-status-dot"></div>
          <span>Job Monitor</span>
        </div>
        <div class="jh-actions-header">
          <button class="jh-icon-btn" id="jh-min-btn" title="Minimize / Expand">${isMinimized ? ICONS.EXPAND : ICONS.MINIMIZE}</button>
          <button class="jh-icon-btn jh-close-btn" id="jh-close-btn" title="Close Panel">✕</button>
        </div>
      </div>

      <div class="jh-body">
        <div class="jh-status-card">
          <div class="jh-status-top">
            <span class="jh-status-label" id="jh-status-text">Monitoring Active</span>
            <span class="jh-countdown-pill" id="jh-countdown-badge">10s</span>
          </div>

          <div class="jh-job-container">
            <div class="jh-job-header-label">Top Job on Page</div>
            <div class="jh-job-preview" id="jh-job-preview">Checking jobs...</div>
          </div>
        </div>

        <div id="jh-alarm-container"></div>

        <div class="jh-interval-section">
          <div class="jh-section-title">Refresh Interval</div>
          <div class="jh-interval-row">
            <input type="number" min="3" max="3600" class="jh-number-input" id="jh-interval-input" value="${refreshIntervalSec}" />
            <div class="jh-presets-wrap">
              <button class="jh-preset-btn" data-sec="5">5s</button>
              <button class="jh-preset-btn" data-sec="10">10s</button>
              <button class="jh-preset-btn" data-sec="20">20s</button>
              <button class="jh-preset-btn" data-sec="30">30s</button>
            </div>
          </div>
        </div>

        <div class="jh-buttons-row">
          <button class="jh-btn jh-btn-danger" id="jh-toggle-btn">
            ${ICONS.PAUSE}
            <span>Stop</span>
          </button>
          <button class="jh-btn jh-btn-secondary" id="jh-reset-history-btn" title="Reset baseline to current jobs">
            ${ICONS.RESET}
            <span>Reset</span>
          </button>
        </div>
      </div>
    `;

    document.documentElement.appendChild(uiBox);

    // Make panel draggable via header
    const headerEl = uiBox.querySelector('#jh-header-toggle');
    makeDraggable(uiBox, headerEl);

    // Cache element references
    countdownBadge = uiBox.querySelector('#jh-countdown-badge');
    statusText = uiBox.querySelector('#jh-status-text');
    topJobPreview = uiBox.querySelector('#jh-job-preview');
    statusDot = uiBox.querySelector('#jh-status-dot');
    toggleBtn = uiBox.querySelector('#jh-toggle-btn');
    intervalInput = uiBox.querySelector('#jh-interval-input');
    alarmContainer = uiBox.querySelector('#jh-alarm-container');

    // Bind Controls
    uiBox.querySelector('#jh-min-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMinimize();
    });

    uiBox.querySelector('#jh-close-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      closeExtensionBox();
    });

    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (isMonitoring) {
        handleGlobalStop();
      } else {
        stopAlarm();
        isMonitoring = true;
        setStorageData({ [STORAGE_KEYS.IS_MONITORING]: true });
        startCountdown();
        updateUIState();
      }
    });

    intervalInput.addEventListener('change', (e) => {
      e.stopPropagation();
      const val = parseInt(intervalInput.value, 10);
      if (val && val >= 3) {
        updateInterval(val);
      } else {
        intervalInput.value = refreshIntervalSec;
      }
    });

    uiBox.querySelectorAll('.jh-preset-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const sec = parseInt(btn.getAttribute('data-sec'), 10);
        if (sec) updateInterval(sec);
      });
    });

    uiBox.querySelector('#jh-reset-history-btn').addEventListener('click', async (e) => {
      e.stopPropagation();
      const visible = getVisibleJobs();
      const allSignatures = visible.map((j) => j.signature).slice(0, MAX_STORED_JOBS);
      await setStorageData({ [STORAGE_KEYS.SEEN_JOBS]: allSignatures });
      topJobPreview.textContent = visible.length > 0 ? visible[0].title : 'No jobs found';
    });

    highlightActivePreset();
  }

  function closeExtensionBox() {
    stopAlarm();
    stopCountdown();
    isMonitoring = false;
    isClosed = true;
    setStorageData({
      [STORAGE_KEYS.IS_MONITORING]: false,
      [STORAGE_KEYS.IS_CLOSED]: true
    });
    if (uiBox) {
      uiBox.remove();
      uiBox = null;
    }
    createLauncherButton();
  }

  function createLauncherButton() {
    if (document.getElementById('jh-launcher-btn') || document.getElementById('jh-monitor-box')) return;
    const launcher = document.createElement('div');
    launcher.id = 'jh-launcher-btn';
    launcher.title = 'Open Job Monitor (Option+J)';
    launcher.innerHTML = ICONS.RADAR;
    launcher.addEventListener('click', (e) => {
      e.stopPropagation();
      reopenExtensionBox();
    });
    document.documentElement.appendChild(launcher);
  }

  function reopenExtensionBox() {
    const launcher = document.getElementById('jh-launcher-btn');
    if (launcher) launcher.remove();
    isClosed = false;
    setStorageData({ [STORAGE_KEYS.IS_CLOSED]: false });
    createUIBox();
    updateUIState();
    const visible = getVisibleJobs();
    if (visible.length > 0 && topJobPreview) {
      topJobPreview.textContent = visible[0].title;
    }
  }

  window.addEventListener('keydown', (e) => {
    if (e.altKey && (e.key === 'j' || e.key === 'J')) {
      if (uiBox) {
        closeExtensionBox();
      } else {
        reopenExtensionBox();
      }
    }
  });

  function toggleMinimize() {
    isMinimized = !isMinimized;
    uiBox.classList.toggle('minimized', isMinimized);
    uiBox.querySelector('#jh-min-btn').innerHTML = isMinimized ? ICONS.EXPAND : ICONS.MINIMIZE;
    setStorageData({ [STORAGE_KEYS.IS_MINIMIZED]: isMinimized });
  }

  function updateInterval(newSec) {
    refreshIntervalSec = newSec;
    intervalInput.value = newSec;
    setStorageData({ [STORAGE_KEYS.INTERVAL]: newSec });
    highlightActivePreset();
    if (isMonitoring && !isAlarming) {
      remainingSeconds = newSec;
      startCountdown();
    }
  }

  function highlightActivePreset() {
    if (!uiBox) return;
    uiBox.querySelectorAll('.jh-preset-btn').forEach((btn) => {
      const sec = parseInt(btn.getAttribute('data-sec'), 10);
      btn.classList.toggle('active', sec === refreshIntervalSec);
    });
  }

  function updateStatusDisplay() {
    if (!countdownBadge || !statusText || !statusDot) return;

    if (isAlarming) {
      countdownBadge.textContent = 'ALARM';
      countdownBadge.className = 'jh-countdown-pill alarm';
      statusText.textContent = `${detectedNewJobs.length} New Job${detectedNewJobs.length > 1 ? 's' : ''} Detected`;
      statusDot.className = 'jh-status-dot alarm';
    } else if (isMonitoring) {
      countdownBadge.textContent = `${remainingSeconds}s`;
      countdownBadge.className = 'jh-countdown-pill';
      statusText.textContent = 'Monitoring Active';
      statusDot.className = 'jh-status-dot';
    } else {
      countdownBadge.textContent = 'PAUSED';
      countdownBadge.className = 'jh-countdown-pill paused';
      statusText.textContent = 'Paused';
      statusDot.className = 'jh-status-dot paused';
    }
  }

  function updateUIState() {
    if (!toggleBtn) return;

    if (isMonitoring) {
      toggleBtn.className = 'jh-btn jh-btn-danger';
      toggleBtn.innerHTML = `${ICONS.PAUSE} <span>Stop</span>`;
    } else {
      toggleBtn.className = 'jh-btn jh-btn-primary';
      toggleBtn.innerHTML = `${ICONS.PLAY} <span>Resume</span>`;
    }

    if (alarmContainer) {
      if (isAlarming && detectedNewJobs.length > 0) {
        alarmContainer.innerHTML = `
          <div class="jh-alarm-box">
            <div class="jh-alarm-title">${detectedNewJobs.length} New Job${detectedNewJobs.length > 1 ? 's' : ''} Found</div>
            <div><strong>Latest:</strong> ${detectedNewJobs[0].title}</div>
            <div class="jh-alarm-hint">Click anywhere on the screen to silence audio and pause</div>
          </div>
        `;
      } else {
        alarmContainer.innerHTML = '';
      }
    }

    updateStatusDisplay();
  }

  /* ==========================================================================
     Core Orchestration & Initialization
     ========================================================================== */

  async function init() {
    const storage = await getStorageData();

    if (typeof storage[STORAGE_KEYS.IS_MONITORING] === 'boolean') {
      isMonitoring = storage[STORAGE_KEYS.IS_MONITORING];
    }
    if (typeof storage[STORAGE_KEYS.INTERVAL] === 'number') {
      refreshIntervalSec = storage[STORAGE_KEYS.INTERVAL];
    }
    if (typeof storage[STORAGE_KEYS.IS_MINIMIZED] === 'boolean') {
      isMinimized = storage[STORAGE_KEYS.IS_MINIMIZED];
    }
    if (typeof storage[STORAGE_KEYS.IS_CLOSED] === 'boolean') {
      isClosed = storage[STORAGE_KEYS.IS_CLOSED];
    }
    if (storage[STORAGE_KEYS.UI_POSITION]) {
      uiPosition = storage[STORAGE_KEYS.UI_POSITION];
    }

    remainingSeconds = refreshIntervalSec;

    if (isClosed) {
      createLauncherButton();
      return;
    }

    createUIBox();
    updateUIState();

    const visibleJobs = await waitForJobCards();

    if (visibleJobs.length > 0) {
      // Show full un-truncated title
      topJobPreview.textContent = visibleJobs[0].title;
    } else {
      topJobPreview.textContent = 'No job cards detected on page';
    }

    const seenSignatures = storage[STORAGE_KEYS.SEEN_JOBS] || null;

    if (!seenSignatures || !Array.isArray(seenSignatures) || seenSignatures.length === 0) {
      const allCurrent = visibleJobs.map((j) => j.signature).slice(0, MAX_STORED_JOBS);
      await setStorageData({ [STORAGE_KEYS.SEEN_JOBS]: allCurrent });
    } else if (visibleJobs.length > 0) {
      const newJobsFound = [];
      for (const job of visibleJobs) {
        if (!seenSignatures.includes(job.signature)) {
          newJobsFound.push(job);
        } else {
          break;
        }
      }

      if (newJobsFound.length > 0) {
        detectedNewJobs = newJobsFound;

        const updatedSeen = [
          ...newJobsFound.map((j) => j.signature),
          ...seenSignatures
        ].slice(0, MAX_STORED_JOBS);

        await setStorageData({ [STORAGE_KEYS.SEEN_JOBS]: updatedSeen });

        startAlarmLoop();
        updateUIState();
        return;
      }
    }

    if (isMonitoring) {
      startCountdown();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
