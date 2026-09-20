# Advanced Forensics & Granular Breakdown Features Implementation

This plan outlines the major architectural changes required to implement advanced forensics, including Visual X-Ray heatmaps, Frequency Domain Analysis (FFT), Audio Biomarkers, and Frame-by-Frame Timeline Scrubbing.

## User Review Required
> [!IMPORTANT]
> The frame-by-frame analysis will increase processing time for videos significantly (e.g., a 10-second video at 1 fps will take 10x longer to process than a single frame). Is this acceptable, or would you prefer a cap on the maximum number of frames analyzed per video?
> Also, the heatmaps and spectrograms will be returned as Base64 encoded strings in the API response. This increases payload size but keeps the architecture serverless/stateless. Let me know if you prefer saving them as physical images and returning URLs instead.

## Open Questions
- Do you want the Chrome Extension side panel to display the full timeline scrubber, or just the main web UI (`index.html`)? (The side panel has limited width).
- For the heatmaps, should we use Error Level Analysis (ELA) which detects photoshop/compression artifacts rapidly, or PyTorch Saliency Maps which show exactly what the AI model is looking at (slower)?

## Proposed Changes

---

### Backend API Updates

#### [MODIFY] [vision_api.py](file:///C:/Users/Admin/Documents/antigravity/kind-tesla/vision_api.py)
- Refactor `FaceExtractor` to extract frames at 1 fps instead of just a single center crop.
- Implement a new `generate_heatmap()` function using OpenCV Error Level Analysis (ELA).
- Implement a new `generate_fft()` function using NumPy's `np.fft.fft2` to calculate the 2D magnitude spectrum.
- Update `predict_vision` to return a dictionary containing `frame_scores` (timeline array), `overall_score`, `heatmap_b64`, and `fft_b64`.

#### [MODIFY] [audio_api.py](file:///C:/Users/Admin/Documents/antigravity/kind-tesla/audio_api.py)
- Use `librosa.feature.spectral_flatness` to calculate the Spectral Flatness metric.
- Compute Phase Consistency using spectral centroid variance.
- Generate a Mel-Spectrogram plot using `matplotlib` or `librosa.display` and encode it to Base64.
- Update `predict_audio` to return a dictionary with the overall score and the new biomarker metrics.

#### [MODIFY] [app.py](file:///C:/Users/Admin/Documents/antigravity/kind-tesla/app.py)
- Update the `DetectionResult` Pydantic model to include the new fields: `vision_timeline`, `heatmap_b64`, `fft_b64`, `spectral_flatness`, `phase_consistency`, and `spectrogram_b64`.
- Refactor the `/detect` endpoint logic to unpack these dictionaries and fuse them correctly.

---

### Frontend Updates

#### [MODIFY] [index.html](file:///C:/Users/Admin/Documents/antigravity/kind-tesla/index.html)
- **Visual X-Ray & FFT Toggles**: Add a new image preview section with toggles to overlay the Base64 heatmap or FFT spectrum on top of the uploaded image/video poster.
- **Voice Biomarker Dashboard**: Add a new sub-section under Audio displaying the Spectrogram image and progress bars for Phase Consistency and Spectral Flatness.
- **Timeline Scrubber**: Add a horizontal timeline (e.g., using a `<canvas>` or styled `<div>` flexbox) that maps the `vision_timeline` array to color-coded blocks (green to red), allowing users to hover and see exact timestamp spikes.

#### [MODIFY] [sidepanel.html](file:///C:/Users/Admin/Documents/antigravity/kind-tesla/extension/deepfake-detector-extension/sidepanel.html) & [sidepanel.js](file:///C:/Users/Admin/Documents/antigravity/kind-tesla/extension/deepfake-detector-extension/sidepanel.js)
- Update the Extension's UI to parse the new JSON payload and gracefully display the advanced metrics without breaking the narrow layout.

## Verification Plan

### Automated/Manual Verification
- I will run a local test by uploading a dummy video to ensure the new frame-by-frame loop completes without memory leaks.
- Verify that `Base64` strings render correctly in `<img>` tags on the frontend.
- Ensure the API still gracefully falls back if the audio model is disabled or ffmpeg fails.
