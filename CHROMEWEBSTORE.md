# Chrome Web Store Submission Guide — JobClerk Auto-Refresher & Monitor

> Single source of truth for Chrome Web Store Developer Dashboard fields, permissions justifications, and store listing copy.

---

## 1. Store Listing Details

**Extension Name** [REQUIRED]
```
JobClerk Auto-Refresher & Monitor
```

**Short Description** (Max 132 characters) [REQUIRED]
```
Auto-refresh JobClerk with smart top-job detection, zero false alarms, and continuous background audio alerts.
```

**Detailed Description** (Formatted for Chrome Web Store) [REQUIRED]
```
JobClerk Auto-Refresher & Monitor is a lightweight assistant designed for healthcare professionals and job hunters using JobClerk.

Never miss a newly posted vacancy again. The extension keeps your search active and alerts you the instant a new position appears at the top of your list.

KEY FEATURES:
• Smart Job Detection: Automatically scans new listings from top to bottom. If an older vacancy closes and shifts existing jobs up, the extension recognizes them and avoids false alarms.
• Multi-Job Batch Detection: Accurately identifies when multiple jobs are posted simultaneously.
• Reliable Background Audio Alerts: Plays a clear audio chime whenever a new position arrives, even if you are working in another tab or away from your computer.
• Screen-Wide Click-to-Silence: A single click anywhere on the page instantly silences the alarm and pauses the countdown so you can review the vacancy.
• Customizable Refresh Timer: Choose from convenient presets (5s, 10s, 20s, 30s) or set your own custom interval.
• Movable Control Panel: Drag and drop the compact monitor anywhere on your screen. Your preferred position is saved across page reloads.
• Full Job Title Visibility: Displays the complete title of the newest job without truncation.

HOW TO USE:
1. Navigate to your filtered JobClerk page (e.g., https://www.jobclerk.com/jobs?sort=newest).
2. The Job Monitor control panel will appear automatically.
3. Keep the tab open while you work. When a new job appears, you will hear a chime. Click anywhere to pause and review the job.

PRIVACY & PERMISSIONS:
Your privacy is fully protected. All data (preferences and recently seen job titles) stays strictly inside your local browser. No data is collected, tracked, or sent to external servers.
```

**Category** [REQUIRED]
```
Productivity
```

**Single Purpose** [REQUIRED]
```
Automatically refreshes JobClerk search pages and alerts users with an audio chime when new jobs appear.
```

**Primary Language** [REQUIRED]
```
English
```

---

## 2. Permissions Justification

| Permission | Type | Exact Justification for Review Team |
| :--- | :--- | :--- |
| `storage` | permissions | Stores the user's refresh interval preferences, panel position, and recently seen job signatures locally to prevent false alarms. |
| `offscreen` | permissions | Plays an audio chime in the background when a new job posting is detected, ensuring reliable alerts without being blocked by browser autoplay policies. |
| `https://www.jobclerk.com/*`, `https://jobclerk.com/*` | host_permissions / content_scripts | Injects the monitoring panel and reads job vacancy titles exclusively on JobClerk search results pages. |

---

## 3. Privacy Disclosures (Chrome Web Store Form)

- **Single Purpose Compliance**: Yes.
- **Permission Justification Compliance**: Yes (only requested `storage`, `offscreen`, and `jobclerk.com`).
- **Data Collection Declaration**:
  - Does the extension collect user data? **No**.
  - Does the extension transmit data to third-party servers? **No**.
  - Certify that data is not sold or transferred for purposes unrelated to the extension's core functionality: **Yes**.

---

## 4. Graphics & Assets Checklist

| Asset | Dimensions | Status | Location |
| :--- | :--- | :--- | :--- |
| Store Icon | 128×128 PNG | Ready | `assets/icons/icon-128.png` |
| Screenshot 1 | 1280×800 PNG | Needed | Capture browser window with JobClerk & floating panel |
| Small Promo Tile (Optional) | 440×280 PNG | Optional | Marketing card |
