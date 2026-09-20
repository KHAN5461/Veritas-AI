import os
import uuid
import shutil
import requests
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from vision_api import vision_detector
from audio_api import audio_detector

app = FastAPI(title="Multimodal Deepfake Detection API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

AUDIO_VIDEO_EXTS = {'.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv', '.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac'}

def check_desync(file_path):
    try:
        res = requests.post('https://api-inference.huggingface.co/models/deepfake-desync', files={'file': open(file_path, 'rb')})
        return res.json().get('desync_score', None)
    except:
        return None

@app.post("/detect")
async def submit_video(file: UploadFile = File(...)):
    os.makedirs("temp", exist_ok=True)
    ext = os.path.splitext(file.filename)[1].lower()
    unique_name = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join("temp", unique_name)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    print(f"Processing media: {file.filename} synchronously...")
    
    is_video = ext in {'.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv'}
    has_audio = ext in AUDIO_VIDEO_EXTS
    
    try:
        # 1. Vision
        vision_result = vision_detector.predict_vision(file_path, is_video=is_video)
        vision_score = vision_result.get("score", 0.0)
        
        # 2. Audio
        audio_result = {"score": 0.0, "flatness": 0.0, "phase": 0.0, "spectrogram": None}
        audio_score = 0.0
        if has_audio:
            audio_result = audio_detector.predict_audio(file_path)
            audio_score = audio_result.get("score", 0.0)
            
        # 3. Audio-Visual Desync (Lip Sync)
        lip_sync_score = None
        if is_video and has_audio:
            lip_sync_score = check_desync(file_path)
        
        # 4. Fusion 
        if has_audio and audio_score > 0.0:
            fusion_score = 0.6 * vision_score + 0.4 * audio_score
        else:
            fusion_score = vision_score
            
        if lip_sync_score is not None:
            # Factor in lip sync if it's available
            fusion_score = (fusion_score * 0.8) + (float(lip_sync_score) * 0.2)
        
        return {
            "is_fake": bool(fusion_score > 0.5),
            "confidence": float(fusion_score),
            "breakdown": {
                "visual_score": float(vision_score),
                "audio_score": float(audio_score) if has_audio else None,
                "lip_sync_score": float(lip_sync_score) if lip_sync_score is not None else None
            },
            "heatmap": vision_result.get("heatmap"),
            "fft": vision_result.get("fft"),
            "faces": vision_result.get("faces", []),
            "timeline": vision_result.get("timeline", []),
            "spectrogram": audio_result.get("spectrogram"),
            "audio_flatness": audio_result.get("flatness", 0.0),
            "audio_phase": audio_result.get("phase", 0.0),
        }
    finally:
        try:
            os.remove(file_path)
        except:
            pass

@app.get("/health")
def health_check():
    return {"status": "ok"}

# Mount Next.js static files at root
static_dir = os.path.join(os.path.dirname(__file__), "../apps/web/out")
if os.path.exists(static_dir):
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
