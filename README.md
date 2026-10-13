# JobClerk Auto-Refresher and Vacancy Monitor

A lightweight Chrome and Brave extension (Manifest V3) that monitors newly listed healthcare vacancies on JobClerk in real time, plays background audio chimes, and dispatches instant Telegram alerts with active search filter details.

Built with vanilla JavaScript and CSS. No bundlers, no npm dependencies, and no external runtime requirements.

---

## Why This Was Built

Healthcare and NHS vacancies on JobClerk can open and fill rapidly. Manually refreshing the job board throughout the day is tedious, while standard auto-refresh extensions suffer from two major flaws:

1. **False Alarms When Postings Expire**: When an older job expires or closes, the second job shifts into the top position. Generic page monitors mistake this shift for a new listing and trigger unwanted alarms.
2. **Autoplay Audio Restrictions**: Modern Chromium browsers block background tabs from playing audio unless user interaction was recently detected on that specific tab.

This extension solves both problems:
- A boundary-scan algorithm checks incoming listings against cached job signatures. It verifies whether an arrival is truly new or simply an existing listing moving up.
- Manifest V3 offscreen audio synthesis ensures alert chimes trigger reliably in the background, even while you are working in other applications or away from your desk.

---

## Features

- **Scoped Exclusively to JobClerk**: Runs only on `https://*.jobclerk.com/*` and does not interact with other websites.
- **Accurate Vacancy Detection**: Distinguishes between new arrivals and closed positions shifting up.
- **Batch Detection**: Catches multiple postings that arrive within the same refresh interval and includes direct links to all of them.
- **Telegram Push Notifications**: Posts alerts straight to your Telegram channel, group, or direct chat with active search filters (profession, grades, location, keyword) and direct vacancy URLs.
- **Reliable Background Audio**: Uses the Manifest V3 Offscreen Audio API to loop audio chimes until acknowledged. Four customizable synthesized tones are included.
- **Screen-Wide Click-to-Silence**: Clicking anywhere on the page instantly silences the alarm and pauses the countdown so you can inspect the listing without disruption.
- **Draggable, Persistent Interface**: A minimal dark control box that can be dragged anywhere on screen. Coordinates and preferences persist across reloads.
- **Full Title Legibility**: Long NHS titles and band descriptions wrap cleanly and are displayed in full without truncation.

---

## Installation

### 1. Clone or Download the Repository

```bash
git clone https://github.com/manisandar/jobclerk-auto-refresher.git
```

### 2. Load the Extension in Brave or Chrome

1. Open your browser and navigate to the extensions page:
   - Brave: `brave://extensions`
   - Chrome: `chrome://extensions`
2. Turn on **Developer mode** using the toggle in the upper right corner.
3. Click **Load unpacked** in the top left.
4. Select the `jobclerk-auto-refresher` project folder.
5. The extension is now installed.

---

## Telegram Alerts Configuration

Telegram notifications are optional and configured via a local JSON file that is excluded from Git to keep your bot credentials private.

### 1. Create a Bot via BotFather

1. In Telegram, start a chat with `@BotFather`.
2. Send `/newbot`.
3. Choose a display name (for example, `JobClerk Alerts`) and a username ending in `bot` (for example, `jobclerk_my_bot`).
4. Copy the HTTP API token provided by BotFather.

### 2. Set Up Your Channel or Chat

1. Create a public or private Telegram channel (for example, `t.me/your_channel`).
2. Add your newly created bot as an **Administrator** in the channel.
3. Ensure the bot has permission to **Post Messages**.

### 3. Add Your Local Config

1. Copy the example configuration template:
   ```bash
   cp src/config/config.example.json src/config/config.json
   ```
2. Open `src/config/config.json` and insert your token and channel username:
   ```json
   {
     "ENABLED": true,
     "BOT_TOKEN": "YOUR_BOT_TOKEN_HERE",
     "CHAT_ID": "@your_channel"
   }
   ```
   *(Note: For channels, use `@channelusername`. For groups or direct messages, use the numeric chat ID.)*
3. Save the file and reload the extension in `chrome://extensions`.

---

## How It Works

### Filter Scraper
When a new vacancy is detected, the extension scrapes active filters to include in the Telegram message:
- **Canonical URL Query Parameters**: Parses parameters like `profession`, `grade`, and multi-values (e.g. `grade=Junior&grade=Senior`).
- **Path Routing**: Automatically parses category routes such as `/jobs/registered-nurse`.
- **DOM Combobox Fallback**: Scrapes active selections from JobClerk filter buttons once client-side hydration completes.
- **Clean Output**: Strips internal query parameters such as `market=uk` and `sort=newest` so notifications stay clean and focused.

### Telegram Alert Format
When listings are detected, the message is delivered in the following structure:

```
JobClerk Alert: 2 New Vacancies Detected

Target Search Filters:
- Profession: Medical doctor
- Grade: Junior, Senior

1. Specialty Doctor - General Medicine
   https://www.jobclerk.com/job/...
2. Clinical Fellow - Emergency Medicine
   https://www.jobclerk.com/job/...

Detected at 10:45:12 AM via JobClerk Refresher
```

---

## Controls and Shortcuts

- **Header Drag**: Click and drag the panel header to reposition the widget. Coordinates persist across tab reloads.
- **Click Anywhere**: A single click anywhere on the page silences the chime and pauses the countdown timer.
- **Interval Chips**: Choose 5s, 10s, 20s, or 30s presets, or enter a custom duration in seconds.
- **Tone Selector**: Select between Chime, Pulse, Bell, and Marimba tones with live audio preview.
- **Stop / Resume**: Pauses or resumes the countdown.
- **Reset**: Re-seeds the baseline with the currently visible jobs.
- **Keyboard Shortcut**: Press `Option + J` on macOS or `Alt + J` on Windows/Linux to toggle the control widget.

---

## Project Structure

```
jobclerk-auto-refresher/
├── manifest.json              # Manifest V3 configuration and permissions
├── .gitignore                 # Excludes local tokens and temporary dumps
├── README.md                  # Project documentation
├── CHROMEWEBSTORE.md          # Store listing metadata and permissions justifications
├── LICENSE                    # MIT license
├── assets/
│   └── icons/                 # Extension icons (16px, 48px, 128px)
├── src/
│   ├── audio/
│   │   ├── offscreen.html     # Manifest V3 offscreen audio sandbox
│   │   └── offscreen.js       # Web Audio API tone synthesizer
│   ├── background/
│   │   └── background.js      # Background service worker & Telegram dispatcher
│   ├── config/
│   │   ├── config.example.json# Template for credentials
│   │   └── config.json        # Local credentials (ignored by Git)
│   └── content/
│       ├── content.js         # In-page detector, filter scraper & UI controller
│       └── styles.css         # Minimal dark floating panel styles
└── tests/
    └── test-job-board.html    # Standalone mock job board for local testing
```

---

## Privacy and Security

- **Zero Third-Party Analytics**: No telemetry, tracking scripts, or external dependencies.
- **Local Credentials**: Telegram tokens are read strictly by the background service worker from your local `src/config/config.json`. The token is never exposed to content scripts or injected into webpage DOMs.
- **Storage Scope**: Extension data (`chrome.storage.local`) only stores your interval preferences, panel position, and the 50 most recent job signatures for cache eviction.

---

## License

This project is licensed under the [MIT License](LICENSE).
