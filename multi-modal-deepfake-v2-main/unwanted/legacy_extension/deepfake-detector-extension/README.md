# Multimodal Deepfake Detector — Chrome Extension

A Manifest V3 Chrome extension that lets you right-click any image, video, or
audio element on the web and check it against your own deepfake-detection
API, without ever saving the file locally.

## Files

| File | Purpose |
|---|---|
| `manifest.json` | Extension config — permissions, side panel, background worker |
| `background.js` | Creates the context menu, relays the clicked media URL to the panel |
| `sidepanel.html` | The side panel UI (dark glassmorphism theme) |
| `sidepanel.js` | Fetches remote media, handles local drag/drop, calls the API, renders results |
| `icons/` | Toolbar/extension icons (16/48/128px) |

## How it works

1. **Right-click** any image, video, or audio tag → **"Verify Media with
   Deepfake Detector"**.
2. Chrome opens the **side panel** on the right; your page stays fully usable
   on the left.
3. The panel shows a preview of the clicked media and fetches its bytes in
   the background.
4. Click **Analyze Media** — the file is POSTed as `multipart/form-data` to
   `{API endpoint}/detect`.
5. Results render as three animated score bars — **Vision**, **Audio**, and
   **Fusion** — plus a color-coded verdict (green = Real, red = Fake).

You can also click the toolbar icon to open the panel directly and use the
**drag-and-drop** zone to analyze a local file instead — no right-click
needed.

## Expected API contract

The extension expects your server at `POST {endpoint}/detect` (default
`http://localhost:8000/detect`) to accept a `file` field in form-data and
return JSON shaped like:

```json
{
  "vision_fake_probability": 0.82,
  "audio_fake_probability": null,
  "fusion_score": 0.82,
  "final_decision": "Fake"
}
```

- `vision_fake_probability` / `audio_fake_probability` — `0.0`–`1.0`, or
  `null` if that modality isn't applicable (e.g. a silent image has no audio
  score).
- `fusion_score` — `0.0`–`1.0` combined score.
- `final_decision` — the string `"Real"` or `"Fake"` (case-insensitive on
  matching; styled via CSS class `.verdict.real` / `.verdict.fake`).

The API endpoint is configurable from the ⚙ icon in the panel and is saved
across sessions via `chrome.storage.local`.

## Installing as an unpacked extension

1. Download and unzip this folder somewhere permanent (don't delete it after
   loading — Chrome reads the files live from disk).
2. Open Chrome and go to `chrome://extensions`.
3. Turn on **Developer mode** (top-right toggle).
4. Click **Load unpacked**.
5. Select the `deepfake-detector-extension` folder (the one containing
   `manifest.json`).
6. The extension icon appears in your toolbar. Pin it for quick access.
7. Make sure your detection server is running (default expected at
   `http://localhost:8000`) — set a different URL in the panel's ⚙ settings
   if it's hosted elsewhere (e.g. an ngrok tunnel).

## Notes / things to review before shipping

- `host_permissions: ["<all_urls>"]` is required so the panel can fetch
  arbitrary media URLs cross-origin for the "fetch from right-click" flow —
  narrow this to specific origins if you don't need it site-wide.
- CORS: fetching the right-clicked media file happens directly in the side
  panel using the extension's granted host permissions, so it works even on
  sites that don't set CORS headers for normal page scripts. Your **API
  server**, however, still needs to accept requests from the extension's
  origin (`chrome-extension://<id>`) — enable permissive CORS there during
  development.
- No file is ever written to disk; everything stays in memory as a `Blob`
  until it's uploaded.
