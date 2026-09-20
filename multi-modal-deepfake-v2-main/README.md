# Multimodal Deepfake Detection API

This project provides a robust, production-ready AI pipeline for detecting deepfakes across multiple media modalities: **Video, Audio, and Image**. 

It uses a dual-model approach, fusing the visual analysis of a video's frames with the audio analysis of its sound track to provide a highly accurate "Fusion Score". It also supports standalone images (Vision-only) and standalone audio clips (Audio-only).

## 🧠 The AI Models
We abandoned placeholder mocks in favor of genuine, pre-trained HuggingFace models:
- **Vision Model**: `prithivMLmods/Deep-Fake-Detector-Model`
  - *Mechanism*: Uses OpenCV Haar Cascades to instantly detect and crop the subject's face from the media. The cropped face is passed through the neural network to identify visual forgeries (e.g., blending boundaries, artifacting).
- **Audio Model**: `HyperMoon/wav2vec2-base-960h-finetuned-deepfake`
  - *Mechanism*: Extracts the audio track using `ffmpeg`, standardizes it to a 16kHz waveform using `librosa`, and runs it through a fine-tuned Wav2Vec2 transformer to detect voice cloning, TTS synthesis, and audio manipulation.

## 🏗️ Architecture
- **Backend**: Python `FastAPI`. Provides a single, unified `/detect` endpoint.
- **Frontend**: A sleek, glassmorphism HTML/JS/CSS single-page application (`index.html`) featuring drag-and-drop file uploading and animated progress bars for scoring.
- **ONNX Ready**: Code contains built-in dynamic routing (`export_to_onnx.py`) to run inference using `onnxruntime` if `.onnx` models are compiled, otherwise safely falling back to native `PyTorch`.

---

## 🚀 How to Run the Project

### 1. Prerequisites
Ensure you have the Anaconda/Miniconda environment set up.
```powershell
conda create -n deepfake_api python=3.8
conda activate deepfake_api
pip install fastapi uvicorn python-multipart torch transformers onnx onnxruntime tf2onnx opencv-python librosa ffmpeg-python
```
*(Note: You must also have `ffmpeg` installed on your system PATH for audio extraction).*

### 2. Start the Backend API
The FastAPI server handles the heavy AI inference.
```powershell
conda activate deepfake_api
uvicorn app:app --host 0.0.0.0 --port 8000
```
*Note: The very first time you hit the API, it will take a few moments to download the ~700MB of model weights from HuggingFace.*

### 3. Start the Frontend UI
The frontend requires a basic HTTP server to avoid local CORS restrictions. Open a new terminal:
```powershell
python -m http.server 8080
```
Navigate to `http://localhost:8080` in your web browser.

---

## 📡 API Documentation

### `POST /detect`
Upload a media file to receive deepfake probabilities.
- **Form Data**: `file` (UploadFile)
- **Supported MIME Types**: `video/*`, `image/*`, `audio/*`

**Response Example (Video):**
```json
{
  "vision_fake_probability": 0.89,
  "audio_fake_probability": 0.12,
  "fusion_score": 0.659,
  "final_decision": "FAKE"
}
```

**Response Example (Image):**
```json
{
  "vision_fake_probability": 0.95,
  "audio_fake_probability": null,
  "fusion_score": 0.95,
  "final_decision": "FAKE"
}
```

### Fusion Logic
If a video is provided, the API uses a weighted fusion algorithm to determine the final score:
`Fusion Score = (Vision Probability * 0.7) + (Audio Probability * 0.3)`
If the Fusion Score > 0.5, the media is classified as `FAKE`.
