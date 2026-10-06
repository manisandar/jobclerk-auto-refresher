# JobClerk Auto-Refresher & Monitor (Manifest V3)

A high-performance Chrome & Brave extension engineered specifically for monitoring newly posted jobs on [JobClerk](https://www.jobclerk.com) in real time without false alarms.

---

## Project Structure & Architecture

```
jobclerk-auto-refresher/
├── manifest.json              # Extension configuration, permissions & host matches
├── .gitignore                 # Git ignore rules (.DS_Store, logs)
├── README.md                  # Detailed documentation and usage guide
├── src/
│   ├── background/
│   │   └── background.js      # Manifest V3 service worker managing offscreen audio
│   ├── content/
│   │   ├── content.js         # DOM watcher, boundary-scan engine & draggable UI
│   │   └── styles.css         # Modern dark-slate floating control panel styling
│   └── audio/
│       ├── offscreen.html     # Hidden document for audio playback
│       └── offscreen.js       # Web Audio API continuous chime synthesizer
└── tests/
    └── test-job-board.html    # Standalone mock job board for offline testing
```

### Why Are These Files Separated?
In Chrome and Brave **Manifest V3**, the browser enforces strict process isolation and security boundaries:

1. **`src/content/content.js` (Webpage DOM Context)**:
   - Must run inside `jobclerk.com` to inspect the job cards and render the on-screen control panel.
   - It cannot play background audio unattended without browser autoplay blocking.
2. **`src/background/background.js` (Service Worker)**:
   - Runs in the background independently of any tab.
   - Chrome service workers have **no DOM access** and **no audio capability**. They exist to manage extension lifecycle events.
3. **`src/audio/offscreen.html` & `offscreen.js` (Audio Sandbox)**:
   - Google's official MV3 standard for audio playback (`chrome.offscreen`).
   - Runs under the extension's own origin (`chrome-extension://`), making it **100% exempt from web page autoplay restrictions**.
   - **Why separate HTML and JS?** Chrome Extension Content Security Policy (CSP) strictly bans inline `<script>` tags inside HTML. Scripts must always be loaded via `<script src="offscreen.js"></script>`.

---

## How to Install in Brave / Chrome

1. Open Brave (or Chrome) and go to:
   ```
   brave://extensions
   ```
2. Enable **Developer mode** using the toggle switch in the top-right corner.
3. Click the **Load unpacked** button in the top-left corner.
4. Select this extension directory:
   ```
   Auto Refresh Chrome Extension
   ```
5. The extension is now loaded and ready.

---

## Step-by-Step Usage Guide for JobClerk

### 1. Open JobClerk with Your Desired Search Filters
Navigate to your filtered JobClerk page, for example:
```
https://www.jobclerk.com/jobs?market=uk&sort=newest&grade=Junior&profession=Medical+doctor
```
> **Tip:** Ensure your search results are sorted by **Newest** so that newly posted positions appear at the top of the list.

### 2. Initial Baseline (Cold Start)
- When the page loads, the floating **Job Monitor** control box will appear in the top-right corner.
- It automatically seeds all currently visible jobs on the page into history (`chrome.storage.local`) as the baseline.
- **Zero false alarm:** Existing jobs on initial load will never trigger an alert.

### 3. Automatic 10-Second Countdown & Refresh
- The countdown badge will tick down from your set interval (`10s... 9s... 8s...`).
- When the timer reaches `0s`, the page automatically reloads and checks for new arrivals.
- You can change the refresh interval anytime via the number input or preset chips (`5s`, `10s`, `20s`, `30s`).

### 4. Smart Job Detection Logic
- **Single New Job:** If 1 new job is posted, it detects the signature, saves it, pauses the timer, and rings the continuous chime.
- **Multiple New Jobs (Batch):** If 2 or more jobs appear at once, it performs a **top-down boundary scan**, recording all new jobs in one batch and announcing `X New Jobs Detected`.
- **Closed Job Shift:** When an older job closes and the 2nd job moves up to #1, the boundary scan recognizes it in history and triggers **zero false alarms**.

### 5. Repositioning (Movable Panel)
- Click and drag the **header bar** (or grip icon) of the floating control panel to move it anywhere on your screen.
- Your position is automatically saved in `chrome.storage.local`. When the page reloads every 10 seconds, the box **remains exactly where you moved it**.

### 6. Silencing the Alarm & Pausing
- When an alert triggers, simply **click anywhere on the webpage**:
  - The chime stops instantly.
  - The auto-refresh timer pauses so the page won't reload while you inspect the job.
- When you are ready to resume monitoring, click **`Resume`** in the control box.

### 7. Minimizing & Closing
- **Minimize (`-`):** Collapses the panel into a compact pill.
- **Close (`✕`):** Dismisses the panel completely, leaving a discreet floating radar icon in the corner.
- **Keyboard Shortcut:** Press **`Option + J`** (Mac) or **`Alt + J`** (Windows) to toggle the control box open/closed at any time.
- **Reset Baseline (`Reset`):** Clears previous history and resets the baseline to the currently visible jobs.
