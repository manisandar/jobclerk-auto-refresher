# JobClerk Auto-Refresher & Monitor

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Target Browser](https://img.shields.io/badge/Browser-Brave%20%7C%20Chrome-orange.svg)](https://brave.com/)
[![Pure Vanilla JS](https://img.shields.io/badge/JavaScript-Vanilla%20(No%20Bundler)-yellow.svg)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

A high-performance, lightweight Chromium extension designed specifically to monitor newly posted jobs on **[JobClerk](https://www.jobclerk.com)** in real time with continuous audio chime alerts and zero false alarms.

---

## Key Highlights

- **Tailored for JobClerk**: Matches strictly to `https://*.jobclerk.com/*` so it never runs on or interferes with unrelated websites.
- **False-Alarm Proof**: Uses a top-down boundary scan algorithm. When an old job closes and the 2nd job shifts to the top, it recognizes it in cache and suppresses false alerts.
- **Multi-Job Batch Detection**: Catches multiple jobs arriving in the same refresh interval and records them all in one batch.
- **Unattended Audio Alerts**: Built with the Manifest V3 Offscreen Audio API (`chrome.offscreen`). Chimes trigger reliably in the background without getting blocked by Chromium's autoplay policy.
- **Screen-Wide Click-to-Stop**: A single click anywhere on the webpage instantly silences the alarm and pauses the refresh countdown.
- **Movable & Persistent HUD**: Drag and drop the control box anywhere on your screen. The panel stays pinned to your custom coordinates across all 10-second reloads.
- **Full Title Legibility**: Long medical and clinical job titles wrap naturally and are displayed completely without truncation.
- **Zero Bloat**: Plain Vanilla JavaScript and CSS. Zero npm packages, zero external build tools, zero external audio files.

---

## Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/manisandar/jobclerk-auto-refresher.git
```

### 2. Load into Brave or Chrome
1. Open your browser and navigate to the extensions page:
   - **Brave**: `brave://extensions`
   - **Chrome**: `chrome://extensions`
2. Enable **Developer mode** via the toggle switch in the top-right corner.
3. Click the **Load unpacked** button in the top-left corner.
4. Select the cloned `jobclerk-auto-refresher` directory.
5. The extension is now loaded and active.

---

## How to Use with JobClerk

### 1. Open JobClerk with Your Preferred Search Filters
Navigate to your target JobClerk search URL, for example:
```
https://www.jobclerk.com/jobs?market=uk&sort=newest&grade=Junior&profession=Medical+doctor
```
> **Recommendation:** Ensure your results are sorted by **Newest** so that newly posted listings appear at the top.

### 2. Automatic Baseline Initialization
- When you first open JobClerk, the **Job Monitor** control box will appear on the screen.
- It automatically seeds all currently visible jobs into local extension storage (`chrome.storage.local`) as the baseline.
- Existing jobs on initial load will **never** trigger an alarm.

### 3. Live Countdown & Auto-Refresh
- The on-screen badge displays a real-time countdown (`10s... 9s... 8s...`).
- When the countdown finishes, the page automatically reloads and checks for new arrivals.
- You can change the interval anytime using the number input or quick preset chips (`5s`, `10s`, `20s`, `30s`).

### 4. When a New Job Arrives
- A continuous, pleasant two-tone melodic chime starts looping (every ~1.2s).
- The refresh timer automatically **halts** so the page will not refresh away while you review or apply for the job.
- The control box displays the number of new jobs and the full title of the latest arrival.

### 5. Silencing & Resuming
- **To Silence & Pause**: Click **anywhere on the webpage**. The audio immediately stops and the countdown pauses.
- **To Resume**: When you are ready to continue monitoring, click **`Resume`** in the control box.

---

## Controls & Keyboard Shortcuts

| Control / Action | Description |
| :--- | :--- |
| **Header Drag** | Click and drag the panel header to reposition it anywhere on your screen. Coordinates persist across reloads. |
| **Click Anywhere** | Silences the audio alarm and pauses the auto-refresh timer immediately. |
| **Preset Chips (`5s`, `10s`, `20s`, `30s`)** | Instantly switches the refresh interval. Persists in storage. |
| **`Stop` / `Resume`** | Toggles monitoring on or off manually. |
| **`Reset`** | Re-seeds the baseline with the currently visible jobs on the page. |
| **`_` (Minimize)** | Collapses the panel into an unobtrusive mini-pill. |
| **`✕` (Close)** | Dismisses the panel and pauses monitoring, leaving a discreet corner launcher button. |
| **`Option + J`** *(Mac)* / **`Alt + J`** *(Win)* | Keyboard shortcut to toggle the control panel open or closed. |

---

## Project Structure

```
jobclerk-auto-refresher/
├── manifest.json              # Manifest V3 extension configuration & permissions
├── .gitignore                 # Git ignore rules
├── README.md                  # Project documentation
├── src/
│   ├── background/
│   │   └── background.js      # Background service worker managing offscreen audio
│   ├── content/
│   │   ├── content.js         # DOM detection, boundary scan & draggable UI
│   │   └── styles.css         # Modern dark-slate floating panel styling
│   └── audio/
│       ├── offscreen.html     # Offscreen audio host document
│       └── offscreen.js       # Web Audio API continuous chime synthesizer
└── tests/
    └── test-job-board.html    # Mock job board for local offline testing
```

---

## Technical Details

- **Target DOM Selector**: `h2.text-secondary, .flex.items-start.justify-between h2, h2.font-semibold`
- **History Capping**: Retains the 50 most recent job signatures using FIFO eviction to ensure zero memory bloat.
- **Audio Engine**: Synthesized via browser Web Audio API oscillator nodes (587.33 Hz $\rightarrow$ 880.00 Hz) inside an offscreen document sandbox.

---

## License

This project is licensed under the [MIT License](LICENSE).
