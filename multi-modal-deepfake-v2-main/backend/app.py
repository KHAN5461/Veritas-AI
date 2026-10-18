import os
os.environ.setdefault("LOW_MEM", "1")
import time
import uuid
import shutil
import logging
import threading
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager
from concurrent.futures import ThreadPoolExecutor

import json
import asyncio
import cv2
import requests
import torch
from fastapi import FastAPI, UploadFile, File, Form, BackgroundTasks, HTTPException, Request, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import APIKeyHeader
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

from vision_api import vision_detector
from audio_api import audio_detector
from provenance import scan_file_provenance

# =====================================================================
# Structured Logging Configuration
# =====================================================================
LOG_FORMAT = "%(asctime)s | %(levelname)-7s | %(name)s | %(message)s"
logging.basicConfig(level=logging.INFO, format=LOG_FORMAT)
logger = logging.getLogger("veritas.backend")

# Track application start time for uptime reporting
APP_START_TIME = time.time()

# =====================================================================
# Security & Rate Limiting
# =====================================================================
API_KEY = os.getenv("VERITAS_API_KEY", "dev_key_123")
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

async def verify_api_key(api_key: str = Depends(api_key_header)):
    if not api_key or api_key != API_KEY:
        if os.getenv("ENV") == "production":
            raise HTTPException(status_code=403, detail="Invalid or missing API Key")
    return api_key

class RateLimiter:
    """Thread-safe rate limiter with automated stale IP eviction."""
    def __init__(self, requests_per_minute: int = 30, max_tracked_ips: int = 10000):
        self.rpm = requests_per_minute
        self.max_tracked_ips = max_tracked_ips
        self.requests: Dict[str, List[float]] = {}
        self.lock = threading.Lock()

    def check(self, ip: str):
        now = time.time()
        with self.lock:
            # Periodic prune if dictionary exceeds max tracked IPs
            if len(self.requests) > self.max_tracked_ips:
                stale_keys = [k for k, v in self.requests.items() if not v or (now - v[-1] >= 60)]
                for k in stale_keys:
                    self.requests.pop(k, None)

            timestamps = self.requests.get(ip, [])
            # Filter timestamps within the 60 second sliding window
            timestamps = [t for t in timestamps if now - t < 60]

            if len(timestamps) >= self.rpm:
                self.requests[ip] = timestamps
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Rate limit exceeded. Try again in a minute."
                )

            timestamps.append(now)
            self.requests[ip] = timestamps

limiter = RateLimiter(requests_per_minute=40)

# =====================================================================
# Bounded LRU/TTL Memory Cache
# =====================================================================
class BoundedTTLCache:
    """Thread-safe bounded in-memory cache with Time-To-Live (TTL) eviction."""
    def __init__(self, max_items: int = 1000, default_ttl_sec: float = 7200.0):
        self.max_items = max_items
        self.default_ttl = default_ttl_sec
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.lock = threading.RLock()

    def set(self, key: str, value: Any, ttl_sec: Optional[float] = None):
        expire_at = time.time() + (ttl_sec if ttl_sec is not None else self.default_ttl)
        with self.lock:
            # Evict expired items if near capacity
            if len(self.cache) >= self.max_items:
                self.prune()
            # If still over limit, pop oldest item
            if len(self.cache) >= self.max_items:
                oldest_key = next(iter(self.cache))
                self.cache.pop(oldest_key, None)
            self.cache[key] = {"val": value, "exp": expire_at}

    def get(self, key: str) -> Optional[Any]:
        with self.lock:
            item = self.cache.get(key)
            if not item:
                return None
            if time.time() > item["exp"]:
                self.cache.pop(key, None)
                return None
            return item["val"]

    def pop(self, key: str) -> Optional[Any]:
        with self.lock:
            item = self.cache.pop(key, None)
            return item["val"] if item else None

    def __contains__(self, key: str) -> bool:
        return self.get(key) is not None

    def prune(self):
        now = time.time()
        with self.lock:
            expired = [k for k, v in self.cache.items() if now > v["exp"]]
            for k in expired:
                self.cache.pop(k, None)

    def size(self) -> int:
        with self.lock:
            return len(self.cache)

jobs_cache = BoundedTTLCache(max_items=1000, default_ttl_sec=3600.0)      # 1 hour for job results
results_cache = BoundedTTLCache(max_items=2000, default_ttl_sec=86400.0)  # 24 hours for file hashes

executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="veritas-worker")

# =====================================================================
# Pydantic Schemas for API Documentation & Validation
# =====================================================================
class BreakdownModel(BaseModel):
    visual_score: float = Field(..., description="Vision model synthesis probability (0.0 to 1.0)")
    audio_score: Optional[float] = Field(None, description="Audio model spoofing probability (0.0 to 1.0)")
    lip_sync_score: Optional[float] = Field(None, description="AV desynchronization probability")

class FaceDetectionModel(BaseModel):
    face_id: str
    bounding_box: List[int]
    score: float

class ForensicResultModel(BaseModel):
    is_fake: bool
    verdict: str
    confidence: float
    quality_flags: List[str]
    breakdown: BreakdownModel
    heatmap: Optional[str] = None
    fft: Optional[str] = None
    faces: List[Dict[str, Any]] = []
    timeline: List[float] = []
    spectrogram: Optional[str] = None
    audio_flatness: float = 0.0
    audio_phase: float = 0.0
    temporal_stability: Optional[float] = None
    corneal_concordance: Optional[float] = None
    chrominance_noise: Optional[float] = None
    audio_jitter: Optional[float] = None
    audio_shimmer: Optional[float] = None
    audio_hnr: Optional[float] = None
    provenance: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None

class JobResponseModel(BaseModel):
    job_id: str
    status: str
    step: Optional[str] = None
    progress: Optional[int] = None
    result: Optional[ForensicResultModel] = None
    error: Optional[str] = None

class BatchJobItem(BaseModel):
    job_id: str
    filename: str
    status: str

class BatchJobResponseModel(BaseModel):
    batch_id: str
    total: int
    jobs: List[BatchJobItem]

class HealthResponseModel(BaseModel):
    status: str = "ok"

class DiagnosticsModel(BaseModel):
    status: str
    uptime_seconds: float
    device: str
    cuda_available: bool
    gpu_name: Optional[str] = None
    gpu_vram_allocated_mb: Optional[float] = None
    active_jobs_cached: int
    hash_results_cached: int
    worker_threads: int

# =====================================================================
# Temp Directory Utilities
# =====================================================================
TEMP_DIR = "temp"

def cleanup_stale_temp_files(max_age_seconds: float = 3600.0):
    """Purge orphaned temp files older than max_age_seconds on startup or maintenance."""
    if not os.path.exists(TEMP_DIR):
        os.makedirs(TEMP_DIR, exist_ok=True)
        return
    now = time.time()
    count = 0
    for filename in os.listdir(TEMP_DIR):
        file_path = os.path.join(TEMP_DIR, filename)
        try:
            if os.path.isfile(file_path):
                if now - os.path.getmtime(file_path) > max_age_seconds:
                    os.remove(file_path)
                    count += 1
        except Exception as e:
            logger.debug("Failed removing temp file %s: %s", file_path, e)
    if count > 0:
        logger.info("Cleaned up %d stale temporary files from %s", count, TEMP_DIR)

# =====================================================================
# FastAPI Lifespan Handler
# =====================================================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup sequence
    logger.info("Initializing Veritas Multimodal Deepfake Engine...")
    os.makedirs(TEMP_DIR, exist_ok=True)
    cleanup_stale_temp_files(max_age_seconds=1800.0)

    device = "cuda" if torch.cuda.is_available() else "cpu"
    logger.info("Hardware Acceleration Device: %s (CUDA Available: %s)", device, torch.cuda.is_available())
    if torch.cuda.is_available():
        logger.info("Active GPU: %s", torch.cuda.get_device_name(0))

    yield

    # Shutdown sequence
    logger.info("Shutting down Veritas Backend workers...")
    executor.shutdown(wait=False, cancel_futures=True)
    cleanup_stale_temp_files(max_age_seconds=0.0)
    logger.info("Veritas Backend terminated cleanly.")

app = FastAPI(
    title="Veritas Multimodal Deepfake Detection API",
    description="Enterprise-grade multimodal forensic detection engine for synthetic media (images, audio, and video).",
    version="2.2.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =====================================================================
# Request Correlation & Timing Middleware
# =====================================================================
@app.middleware("http")
async def add_process_time_and_request_id(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex
    request.state.request_id = request_id
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Process-Time"] = f"{process_time:.4f}s"
    return response

# Supported extensions
AUDIO_VIDEO_EXTS = {'.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv', '.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac'}
VALID_MEDIA_EXTS = AUDIO_VIDEO_EXTS.union({'.jpg', '.jpeg', '.png', '.webp'})
MAX_UPLOAD_SIZE = 50 * 1024 * 1024  # 50 MB

# =====================================================================
# Analysis Pipeline Functions
# =====================================================================
def check_desync(file_path: str) -> Optional[float]:
    """Safe external call for audio-visual desync analysis with strict timeout."""
    if not os.path.exists(file_path):
        return None
    try:
        with open(file_path, "rb") as f:
            res = requests.post(
                "https://api-inference.huggingface.co/models/deepfake-desync",
                files={"file": f},
                timeout=(2.0, 5.0)
            )
        if res.status_code == 200:
            data = res.json()
            score = data.get("desync_score")
            return float(score) if score is not None else None
        else:
            logger.debug("Desync API returned status code %s", res.status_code)
    except requests.RequestException as e:
        logger.debug("External desync check timed out or failed (safe fallback): %s", e)
    except Exception as e:
        logger.debug("Unexpected desync error: %s", e)
    return None

def inspect_media_metadata(file_path: str, ext: str) -> Dict[str, Any]:
    """Extract resolution, duration, FPS and container metadata for forensic telemetry."""
    meta = {"file_size_bytes": os.path.getsize(file_path) if os.path.exists(file_path) else 0, "extension": ext}
    is_video = ext in {'.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv'}
    is_image = ext in {'.jpg', '.jpeg', '.png', '.webp'}
    
    if is_video or is_image:
        try:
            if is_video:
                cap = cv2.VideoCapture(file_path)
                meta["width"] = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                meta["height"] = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                meta["fps"] = round(float(cap.get(cv2.CAP_PROP_FPS)), 2)
                frames = cap.get(cv2.CAP_PROP_FRAME_COUNT)
                meta["duration_seconds"] = round(frames / meta["fps"], 2) if meta["fps"] > 0 else 0.0
                cap.release()
            elif is_image:
                img = cv2.imread(file_path)
                if img is not None:
                    meta["height"], meta["width"] = img.shape[:2]
        except Exception as e:
            logger.debug("Metadata probe exception: %s", e)
def dispatch_webhook(webhook_url: str, job_id: str, payload: Dict[str, Any]):
    """Deliver asynchronous JSON forensic dossier to external enterprise endpoint."""
    try:
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "Veritas-Forensic-Engine/2.2",
            "X-Veritas-Job-ID": job_id
        }
        res = requests.post(webhook_url, json={"job_id": job_id, "data": payload}, headers=headers, timeout=5.0)
        logger.info("Dispatched webhook for job %s to %s (Status: %s)", job_id, webhook_url, res.status_code)
    except Exception as e:
        logger.warning("Failed dispatching webhook for job %s to %s: %s", job_id, webhook_url, e)

def process_job(job_id: str, file_path: str, ext: str, file_hash: Optional[str], webhook_url: Optional[str] = None):
    """Background worker pipeline executing vision, audio, and multimodal fusion with fine-grained step tracking."""
    start_time = time.time()
    try:
        is_video = ext in {'.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv'}
        has_audio = ext in AUDIO_VIDEO_EXTS

        # 0. Metadata & Provenance Inspection
        media_meta = inspect_media_metadata(file_path, ext)
        provenance_info = scan_file_provenance(file_path)

        # 1. Vision Analysis Step
        jobs_cache.set(job_id, {"status": "processing", "step": "vision_scan", "progress": 25})
        vision_result = vision_detector.predict_vision(file_path, is_video=is_video)
        vision_score = vision_result.get("score", 0.0)

        # 2. Audio Analysis Step
        jobs_cache.set(job_id, {"status": "processing", "step": "audio_analysis", "progress": 55})
        audio_result = {"score": 0.0, "flatness": 0.0, "phase": 0.0, "spectrogram": None, "jitter": 0.0, "shimmer": 0.0, "hnr": 0.0}
        audio_score = 0.0
        if has_audio:
            audio_result = audio_detector.predict_audio(file_path)
            audio_score = audio_result.get("score", 0.0)

        # 3. Audio-Visual Desync (Lip Sync) Step
        jobs_cache.set(job_id, {"status": "processing", "step": "av_desync", "progress": 75})
        lip_sync_score = None
        if is_video and has_audio:
            lip_sync_score = check_desync(file_path)

        # 4. Multimodal Fusion Step
        jobs_cache.set(job_id, {"status": "processing", "step": "multimodal_fusion", "progress": 90})
        if has_audio and audio_score > 0.0:
            # Asymmetrical cross-modal fusion: prevents deepfake face swaps from being washed out
            # by authentic background audio, and catches voice clones over pristine video
            if vision_score >= 0.70 or audio_score >= 0.70:
                dominant = max(vision_score, audio_score)
                subordinate = min(vision_score, audio_score)
                fusion_score = 0.90 * dominant + 0.10 * subordinate
            elif vision_score <= 0.25 and audio_score <= 0.25:
                # Both modalities strongly confirm authentic media
                fusion_score = 0.55 * vision_score + 0.45 * audio_score
            else:
                # Balanced cross-modal weighting
                fusion_score = 0.60 * vision_score + 0.40 * audio_score
        else:
            fusion_score = vision_score

        if lip_sync_score is not None:
            # Factoring in audiovisual lip desync
            if lip_sync_score > 0.65:
                fusion_score = max(fusion_score, (fusion_score * 0.75) + (float(lip_sync_score) * 0.25))
            else:
                fusion_score = (fusion_score * 0.85) + (float(lip_sync_score) * 0.15)

        # Provenance confirmation override
        if provenance_info.get("has_ai_provenance"):
            fusion_score = max(fusion_score, 0.95)

        fusion_score = float(max(0.0, min(1.0, fusion_score)))

        # 5. Metadata & Forensic Quality Flags
        quality_flags = []
        file_size = media_meta.get("file_size_bytes", 0)

        if provenance_info.get("has_ai_provenance"):
            sigs = ", ".join(provenance_info.get("ai_signatures", []))
            quality_flags.append(f"AI Generator Signature: {sigs}")

        if provenance_info.get("has_c2pa"):
            quality_flags.append("C2PA Content Credentials Manifest")

        if provenance_info.get("has_camera_metadata") and fusion_score < 0.40:
            quality_flags.append("Hardware Sensor Provenance Verified")

        if is_video:
            width = media_meta.get("width", 0)
            height = media_meta.get("height", 0)
            fps = media_meta.get("fps", 0)
            if width and height and (width < 640 or height < 480):
                quality_flags.append("Low Resolution (<480p)")
            if file_size < 150 * 1024:
                quality_flags.append("High Compression")
                fusion_score = fusion_score * 0.92
            if fps and fps < 18:
                quality_flags.append("Low Framerate")
            if lip_sync_score and lip_sync_score > 0.7:
                quality_flags.append("Lip-Sync Anomaly")
            if vision_result.get("temporal_stability", 0.0) > 0.65:
                quality_flags.append("Temporal Face Jitter Anomaly")

        if len(vision_result.get("faces", [])) == 0 and not has_audio and not is_video:
            quality_flags.append("No Face Biomarkers Detected")
            fusion_score = 0.5  # Inconclusive if no facial biomarkers and no audio

        if vision_result.get("corneal_concordance", 0.5) > 0.65:
            quality_flags.append("Corneal Specular Highlight Discordance")

        if vision_result.get("chrominance_noise", 0.5) > 0.65:
            quality_flags.append("Chrominance (YCbCr) Noise Decoupling")

        if audio_result.get("flatness", 0.0) > 0.65:
            quality_flags.append("Acoustic Artifacts")

        jitter_val = audio_result.get("jitter", 0.0)
        if jitter_val > 0.035 or (0.0 < jitter_val < 0.002):
            quality_flags.append("Vocal Micro-Tremor Jitter Anomaly")

        # 6. Verdict Classification Bands
        if fusion_score > 0.65:
            verdict = "Likely fake"
        elif fusion_score < 0.35:
            verdict = "Likely real"
        else:
            verdict = "Inconclusive"

        result_data = {
            "is_fake": bool(fusion_score > 0.5),
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
            "temporal_stability": vision_result.get("temporal_stability", 0.0),
            "corneal_concordance": vision_result.get("corneal_concordance", 0.5),
            "chrominance_noise": vision_result.get("chrominance_noise", 0.5),
            "audio_jitter": audio_result.get("jitter", 0.0),
            "audio_shimmer": audio_result.get("shimmer", 0.0),
            "audio_hnr": audio_result.get("hnr", 0.0),
            "provenance": provenance_info,
            "metadata": media_meta
        }

        jobs_cache.set(job_id, {"status": "completed", "step": "done", "progress": 100, "result": result_data})

        # Cache for hash deduplication
        if file_hash:
            results_cache.set(file_hash, result_data)

        # Dispatch asynchronous webhook if configured
        if webhook_url:
            dispatch_webhook(webhook_url, job_id, {"status": "completed", "result": result_data})

        elapsed = time.time() - start_time
        logger.info("Job %s completed in %.2fs with verdict '%s' (confidence: %.2f)",
                    job_id, elapsed, verdict, fusion_score)

    except Exception as e:
        logger.error("Job %s failed with exception: %s", job_id, e, exc_info=True)
        jobs_cache.set(job_id, {"status": "failed", "step": "error", "error": str(e)})
        if webhook_url:
            dispatch_webhook(webhook_url, job_id, {"status": "failed", "error": str(e)})
    finally:
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except Exception as e:
            logger.debug("Failed to remove temporary file %s: %s", file_path, e)

# =====================================================================
# API Endpoints
# =====================================================================
@app.post("/jobs", response_model=JobResponseModel)
async def create_job(
    background_tasks: BackgroundTasks,
    request: Request,
    file: UploadFile = File(...),
    file_hash: Optional[str] = Form(None),
    webhook_url: Optional[str] = Form(None),
    api_key: str = Depends(verify_api_key)
):
    """Submit a media file for asynchronous deepfake detection analysis."""
    if request.client:
        limiter.check(request.client.host)

    # 1. Instant Cache Hit Check
    if file_hash:
        cached_result = results_cache.get(file_hash)
        if cached_result:
            logger.info("Cache hit for file hash: %s", file_hash[:16])
            if webhook_url:
                dispatch_webhook(webhook_url, "cached", {"status": "completed", "result": cached_result})
            return {
                "job_id": "cached",
                "status": "completed",
                "step": "done",
                "progress": 100,
                "result": cached_result
            }

    # 2. Extension Validation
    filename = file.filename or "media_upload"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in VALID_MEDIA_EXTS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type '{ext}'. Supported formats: {', '.join(sorted(VALID_MEDIA_EXTS))}"
        )

    # 3. Stream Upload with Size Guard
    unique_name = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(TEMP_DIR, unique_name)

    file_size = 0
    try:
        with open(file_path, "wb") as buffer:
            while chunk := await file.read(65536):
                file_size += len(chunk)
                if file_size > MAX_UPLOAD_SIZE:
                    buffer.close()
                    if os.path.exists(file_path):
                        os.remove(file_path)
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="File too large. Maximum size is 50MB."
                    )
                buffer.write(chunk)
    except HTTPException:
        raise
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        logger.error("Failed saving uploaded file: %s", e)
        raise HTTPException(status_code=500, detail="Failed to receive file upload.")

    job_id = uuid.uuid4().hex
    jobs_cache.set(job_id, {"status": "processing", "step": "queued", "progress": 5})

    # Offload execution to thread pool
    background_tasks.add_task(process_job, job_id, file_path, ext, file_hash, webhook_url)
    logger.info("Queued job %s for file '%s' (%.1f KB)", job_id, filename, file_size / 1024.0)

    return {"job_id": job_id, "status": "processing", "step": "queued", "progress": 5}

@app.post("/jobs/batch", response_model=BatchJobResponseModel)
async def create_batch_jobs(
    background_tasks: BackgroundTasks,
    request: Request,
    files: List[UploadFile] = File(...),
    webhook_url: Optional[str] = Form(None),
    api_key: str = Depends(verify_api_key)
):
    """Submit multiple media files simultaneously for parallel batch analysis."""
    if request.client:
        limiter.check(request.client.host)

    if not files:
        raise HTTPException(status_code=400, detail="No files provided for batch processing.")

    if len(files) > 20:
        raise HTTPException(status_code=400, detail="Maximum 20 files allowed per batch request.")

    batch_id = uuid.uuid4().hex[:12]
    enqueued_jobs: List[BatchJobItem] = []

    for f in files:
        filename = f.filename or "media_upload"
        ext = os.path.splitext(filename)[1].lower()
        if ext not in VALID_MEDIA_EXTS:
            continue

        unique_name = f"{uuid.uuid4().hex}{ext}"
        file_path = os.path.join(TEMP_DIR, unique_name)

        try:
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(f.file, buffer)
        except Exception as e:
            logger.warning("Batch upload failed saving file %s: %s", filename, e)
            continue

        job_id = uuid.uuid4().hex
        jobs_cache.set(job_id, {"status": "processing", "step": "queued", "progress": 5})
        background_tasks.add_task(process_job, job_id, file_path, ext, None, webhook_url)

        enqueued_jobs.append(BatchJobItem(job_id=job_id, filename=filename, status="processing"))

    logger.info("Enqueued batch %s with %d files", batch_id, len(enqueued_jobs))
    return BatchJobResponseModel(batch_id=batch_id, total=len(enqueued_jobs), jobs=enqueued_jobs)

@app.get("/jobs/{job_id}", response_model=JobResponseModel)
def get_job_status(job_id: str, request: Request, api_key: str = Depends(verify_api_key)):
    """Poll the status, current step, or retrieve the forensic report for a queued job."""
    if request.client:
        limiter.check(request.client.host)

    job = jobs_cache.get(job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    return {
        "job_id": job_id,
        "status": job.get("status", "unknown"),
        "step": job.get("step"),
        "progress": job.get("progress"),
        "result": job.get("result"),
        "error": job.get("error")
    }

@app.get("/jobs/{job_id}/stream")
async def stream_job_status(job_id: str, request: Request):
    """Server-Sent Events (SSE) streaming endpoint for real-time progress and telemetry updates."""
    async def event_generator():
        last_step = None
        start_wait = time.time()
        while time.time() - start_wait < 120:  # 2 minute max timeout
            if await request.is_disconnected():
                break

            job = jobs_cache.get(job_id)
            if not job:
                yield f"data: {json.dumps({'status': 'not_found'})}\n\n"
                break

            current_step = job.get("step")
            status_val = job.get("status")

            if current_step != last_step or status_val in ("completed", "failed", "cancelled"):
                last_step = current_step
                payload = {
                    "job_id": job_id,
                    "status": status_val,
                    "step": current_step,
                    "progress": job.get("progress"),
                    "result": job.get("result"),
                    "error": job.get("error")
                }
                yield f"data: {json.dumps(payload)}\n\n"

            if status_val in ("completed", "failed", "cancelled"):
                break

            await asyncio.sleep(0.5)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@app.delete("/jobs/{job_id}")
def cancel_job(job_id: str, request: Request, api_key: str = Depends(verify_api_key)):
    """Cancel an ongoing job or evict a completed report from cache."""
    if request.client:
        limiter.check(request.client.host)

    job = jobs_cache.get(job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    jobs_cache.set(job_id, {"status": "cancelled", "step": "aborted", "error": "Job cancelled by client."})
    return {"job_id": job_id, "status": "cancelled"}

@app.post("/detect")
async def submit_video_legacy(file: UploadFile = File(...)):
    """Legacy synchronous endpoint for backwards compatibility."""
    filename = file.filename or "media_upload"
    ext = os.path.splitext(filename)[1].lower()
    unique_name = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(TEMP_DIR, unique_name)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    job_id = uuid.uuid4().hex
    jobs_cache.set(job_id, {"status": "processing"})
    process_job(job_id, file_path, ext, None)

    res = jobs_cache.get(job_id)
    if res and res.get("status") == "completed":
        return res["result"]
    else:
        error_msg = res.get("error", "Processing failed") if res else "Unknown error"
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=error_msg)

@app.get("/", response_model=HealthResponseModel)
@app.head("/")
@app.get("/health", response_model=HealthResponseModel)
@app.head("/health")
def health_check():
    """Standard health check probe compatible with container orchestrators."""
    return {"status": "ok"}

@app.get("/diagnostics", response_model=DiagnosticsModel)
def system_diagnostics():
    """Comprehensive engine telemetry including GPU memory, cache capacity, and worker pool status."""
    cuda_avail = torch.cuda.is_available()
    device_name = torch.cuda.get_device_name(0) if cuda_avail else None
    vram_mb = (torch.cuda.memory_allocated(0) / (1024 * 1024)) if cuda_avail else None

    return {
        "status": "operational",
        "uptime_seconds": round(time.time() - APP_START_TIME, 1),
        "device": "cuda" if cuda_avail else "cpu",
        "cuda_available": cuda_avail,
        "gpu_name": device_name,
        "gpu_vram_allocated_mb": round(vram_mb, 2) if vram_mb is not None else None,
        "active_jobs_cached": jobs_cache.size(),
        "hash_results_cached": results_cache.size(),
        "worker_threads": executor._max_workers,
    }

# =====================================================================
# Global Exception Handler
# =====================================================================
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception processing %s %s: %s", request.method, request.url.path, exc, exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred while processing your forensic request."}
    )

# Mount Next.js static files if export exists
static_dir = os.path.join(os.path.dirname(__file__), "../apps/web/out")
if os.path.exists(static_dir):
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
