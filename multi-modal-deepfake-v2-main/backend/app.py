import torch
import os
import uuid
import shutil
import requests
import asyncio
from concurrent.futures import ThreadPoolExecutor
from fastapi import FastAPI, UploadFile, File, Form, BackgroundTasks, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import APIKeyHeader
import time
from collections import defaultdict
from vision_api import vision_detector
from audio_api import audio_detector

API_KEY = os.getenv("VERITAS_API_KEY", "dev_key_123")
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

class RateLimiter:
    def __init__(self, requests_per_minute: int):
        self.rpm = requests_per_minute
        self.requests = defaultdict(list)
    
    def check(self, ip: str):
        now = time.time()
        self.requests[ip] = [t for t in self.requests[ip] if now - t < 60]
        if len(self.requests[ip]) >= self.rpm:
            raise HTTPException(status_code=429, detail="Rate limit exceeded. Try again in a minute.")
        self.requests[ip].append(now)

limiter = RateLimiter(requests_per_minute=20)

async def verify_api_key(api_key: str = Depends(api_key_header)):
    if not api_key or api_key != API_KEY:
        if os.getenv("ENV") == "production":
            raise HTTPException(status_code=403, detail="Invalid or missing API Key")
    return api_key

app = FastAPI(title="Multimodal Deepfake Detection API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

AUDIO_VIDEO_EXTS = {'.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv', '.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac'}

jobs = {}
results_cache = {}
executor = ThreadPoolExecutor(max_workers=4)

def check_desync(file_path):
    try:
        res = requests.post('https://api-inference.huggingface.co/models/deepfake-desync', files={'file': open(file_path, 'rb')})
        return res.json().get('desync_score', None)
    except:
        return None

def process_job(job_id: str, file_path: str, ext: str, file_hash: str):
    try:
        is_video = ext in {'.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv'}
        has_audio = ext in AUDIO_VIDEO_EXTS
        
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
        
        # Phase 2: Metadata & Quality Flags
        # (Mock implementation of quality flags lowering confidence)
        # In a real scenario, this would use ffprobe or exiftool
        quality_flags = []
        file_size = os.path.getsize(file_path)
        if file_size < 100 * 1024 and is_video: # Less than 100kb video is heavily compressed
            quality_flags.append("Heavy Compression")
            fusion_score = fusion_score * 0.9 # lower confidence
            
        if len(vision_result.get("faces", [])) == 0 and not has_audio:
            quality_flags.append("No Face Found")
            fusion_score = 0.5 # Inconclusive if no face and no audio
            
        # Phase 2: Three Verdict Bands
        if fusion_score > 0.65:
            verdict = "Likely fake"
        elif fusion_score < 0.35:
            verdict = "Likely real"
        else:
            verdict = "Inconclusive"

        result_data = {
            "is_fake": bool(fusion_score > 0.5), # Keep for backwards compatibility
            "verdict": verdict,
            "confidence": float(fusion_score),
            "quality_flags": quality_flags,
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
        
        jobs[job_id] = {"status": "completed", "result": result_data}
        
        # Cache the result
        if file_hash:
            results_cache[file_hash] = result_data
            
    except Exception as e:
        jobs[job_id] = {"status": "failed", "error": str(e)}
    finally:
        try:
            os.remove(file_path)
        except:
            pass

@app.post("/jobs")
async def create_job(background_tasks: BackgroundTasks, request: Request, file: UploadFile = File(...), file_hash: str = Form(None), api_key: str = Depends(verify_api_key)):
    if request.client:
        limiter.check(request.client.host)
    # Early Rejection
    MAX_SIZE = 50 * 1024 * 1024 # 50MB
    # Wait, FastAPI doesn't easily expose size before reading, but we can check if it exceeds memory if we read it
    # We will just write it and check size
    
    if file_hash and file_hash in results_cache:
        return {"job_id": "cached", "status": "completed", "result": results_cache[file_hash]}
        
    os.makedirs("temp", exist_ok=True)
    ext = os.path.splitext(file.filename)[1].lower()
    
    valid_exts = {'.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv', '.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac', '.jpg', '.jpeg', '.png', '.webp'}
    if ext not in valid_exts:
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a supported media file.")
        
    unique_name = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join("temp", unique_name)
    
    file_size = 0
    with open(file_path, "wb") as buffer:
        while chunk := await file.read(8192):
            file_size += len(chunk)
            if file_size > MAX_SIZE:
                os.remove(file_path)
                raise HTTPException(status_code=400, detail="File too large. Maximum size is 50MB.")
            buffer.write(chunk)
            
    job_id = uuid.uuid4().hex
    jobs[job_id] = {"status": "processing"}
    
    # Run in thread pool to not block async loop
    background_tasks.add_task(process_job, job_id, file_path, ext, file_hash)
    
    return {"job_id": job_id, "status": "processing"}

@app.get("/jobs/{job_id}")
def get_job_status(job_id: str, request: Request, api_key: str = Depends(verify_api_key)):
    if request.client:
        limiter.check(request.client.host)
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    return jobs[job_id]

# Legacy endpoint for backwards compatibility during migration
@app.post("/detect")
async def submit_video(file: UploadFile = File(...)):
    # ... legacy synchronous code ...
    os.makedirs("temp", exist_ok=True)
    ext = os.path.splitext(file.filename)[1].lower()
    unique_name = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join("temp", unique_name)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    job_id = uuid.uuid4().hex
    jobs[job_id] = {"status": "processing"}
    process_job(job_id, file_path, ext, None)
    
    res = jobs[job_id]
    if res["status"] == "completed":
        return res["result"]
    else:
        raise HTTPException(status_code=500, detail=res.get("error", "Failed"))

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
