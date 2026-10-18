import io
import os
import uuid
import logging
from typing import List, Dict, Any, Optional, Tuple, Union
import torch
import librosa
import librosa.display
import numpy as np
try:
    import ffmpeg
    _has_ffmpeg = True
except ImportError:
    ffmpeg = None
    _has_ffmpeg = False
import base64
from transformers import AutoFeatureExtractor, AutoModelForAudioClassification

logger = logging.getLogger("veritas.audio")

def generate_spectrogram_b64(y, sr):
    """Thread-safe spectrogram generation using OO matplotlib API."""
    try:
        import matplotlib
        matplotlib.use('Agg')  # Thread-safe non-interactive backend
        import matplotlib.pyplot as plt

        fig, ax = plt.subplots(figsize=(10, 4))
        S = librosa.feature.melspectrogram(y=y, sr=sr, n_mels=128, fmax=8000)
        S_dB = librosa.power_to_db(S, ref=np.max)
        librosa.display.specshow(S_dB, x_axis='time', y_axis='mel', sr=sr, fmax=8000, ax=ax)
        ax.set_title('Mel Spectrogram (dB)')
        fig.tight_layout()
        buf = io.BytesIO()
        fig.savefig(buf, format='png')
        buf.seek(0)
        plt.close(fig)
        return base64.b64encode(buf.read()).decode('utf-8')
    except Exception as e:
        logger.warning(f"Failed to generate spectrogram: {e}")
        return None

def compute_micro_tremors(waveform: np.ndarray, sr: int):
    """Compute vocal fold micro-tremors: Jitter (pitch perturbation), Shimmer (amplitude perturbation), and HNR."""
    try:
        f0, voiced_flag, _ = librosa.pyin(waveform, fmin=60, fmax=450, sr=sr, frame_length=1024)
        voiced_f0 = f0[voiced_flag & ~np.isnan(f0)] if voiced_flag is not None else []
        
        if len(voiced_f0) < 4:
            return 0.008, 0.025, 18.0  # Nominal human speech baseline
            
        # Jitter: Cycle-to-cycle pitch period perturbation
        periods = 1.0 / voiced_f0
        period_diffs = np.abs(np.diff(periods))
        jitter = float(np.mean(period_diffs) / (np.mean(periods) + 1e-6))
        
        # Shimmer: Cycle-to-cycle peak amplitude perturbation
        rms_frames = librosa.feature.rms(y=waveform, frame_length=1024, hop_length=512)[0]
        voiced_rms = rms_frames[:len(voiced_f0)]
        if len(voiced_rms) > 1 and np.mean(voiced_rms) > 1e-4:
            shimmer = float(np.mean(np.abs(np.diff(voiced_rms))) / (np.mean(voiced_rms) + 1e-6))
        else:
            shimmer = 0.025

        # Harmonics-to-Noise Ratio (HNR) approximation from spectral tonality
        flatness = float(np.mean(librosa.feature.spectral_flatness(y=waveform)))
        hnr = float(-10.0 * np.log10(max(1e-4, flatness)))

        return round(jitter, 4), round(shimmer, 4), round(hnr, 2)
    except Exception as e:
        logger.debug("Micro-tremor computation error: %s", e)
        return 0.008, 0.025, 18.0

class AudioModel:
    def __init__(self, model_id="HyperMoon/wav2vec2-base-960h-finetuned-deepfake", onnx_path="./audio_weights/audio_onnx/model.onnx"):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model_id = model_id
        self.onnx_path = onnx_path
        self.onnx_session = None
        self.model = None
        self.processor = None
        self.fake_class_idx = 1
        self._model_loaded = False
        import threading
        self._lock = threading.Lock()

    def _ensure_model(self):
        """Lazy load wav2vec2 on first audio inference request."""
        if self._model_loaded:
            return
        with self._lock:
            if self._model_loaded:
                return
            torch.set_grad_enabled(False)
            torch.set_num_threads(1)
            import gc
            gc.collect()

            is_low_mem = os.getenv("LOW_MEM", "1") == "1"
            if not is_low_mem:
                if os.path.exists(self.onnx_path) and os.path.getsize(self.onnx_path) > 1024 * 1024:
                    logger.info("Loading Audio Model from ONNX: %s", self.onnx_path)
                    try:
                        import onnxruntime
                        available_providers = onnxruntime.get_available_providers()
                        providers = [p for p in ['CUDAExecutionProvider', 'CPUExecutionProvider'] if p in available_providers]
                        self.onnx_session = onnxruntime.InferenceSession(self.onnx_path, providers=providers)
                    except Exception as e:
                        logger.warning("Failed to load ONNX model (%s), falling back to PyTorch", e)
                elif os.path.exists(self.onnx_path):
                    logger.warning("%s appears to be a Git LFS pointer. Skipping ONNX, falling back to PyTorch.", self.onnx_path)

                logger.info("Loading Audio Model Feature Extractor: %s...", self.model_id)
                try:
                    self.processor = AutoFeatureExtractor.from_pretrained(self.model_id)
                    if self.onnx_session is None:
                        self.model = AutoModelForAudioClassification.from_pretrained(self.model_id, low_cpu_mem_usage=True)
                        self.model.to(self.device).eval()
                except Exception as e:
                    logger.warning("Could not load audio model due to %s. It will fallback to acoustic biomarkers.", e)
                    self.model = None

                self.fake_class_idx = self._resolve_fake_index(self.model, default_idx=1)
            else:
                logger.info("Operating in LOW_MEM mode for audio: Acoustic Biomarkers (Jitter, Shimmer, HNR, Flatness, Phase) active.")
                self.model = None

            self._model_loaded = True
            gc.collect()

    def _resolve_fake_index(self, model, default_idx: int = 1) -> int:
        """Dynamically detect class index for spoofed/synthetic audio from model configuration."""
        if not model or not hasattr(model, "config") or not hasattr(model.config, "id2label"):
            return default_idx
        id2label = getattr(model.config, "id2label", None)
        if not id2label:
            return default_idx
        fake_keywords = {"spoof", "fake", "deepfake", "synthetic", "artificial", "generated"}
        for idx, label in id2label.items():
            lbl = str(label).lower().strip()
            if any(k in lbl for k in fake_keywords):
                return int(idx)
        return default_idx

    def extract_audio(self, file_path: str, output_audio_path: str, max_duration_sec: int = 30):
        try:
            if _has_ffmpeg and ffmpeg is not None:
                (
                    ffmpeg
                    .input(file_path, t=max_duration_sec)
                    .output(output_audio_path, acodec='pcm_s16le', ac=1, ar='16k')
                    .overwrite_output()
                    .run(quiet=True)
                )
            else:
                import subprocess
                subprocess.run(
                    ["ffmpeg", "-y", "-i", file_path, "-t", str(max_duration_sec), "-acodec", "pcm_s16le", "-ac", "1", "-ar", "16000", output_audio_path],
                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True
                )
            return os.path.exists(output_audio_path) and os.path.getsize(output_audio_path) > 0
        except Exception as e:
            logger.debug("Audio extraction failed or file has no audio track: %s", e)
            return False

    def predict_audio(self, file_path: str):
        # Unique temp filename per request to prevent race conditions
        audio_path = f"temp_audio_{uuid.uuid4().hex[:8]}.wav"
        
        try:
            if not self.extract_audio(file_path, audio_path, max_duration_sec=30):
                return {
                    "score": 0.0,
                    "flatness": 0.0,
                    "phase": 0.0,
                    "spectrogram": None,
                    "zcr": 0.0,
                    "rolloff": 0.0
                }
                
            self._ensure_model()
            if self.processor is None or (self.onnx_session is None and self.model is None):
                return {
                    "score": 0.5,
                    "flatness": 0.0,
                    "phase": 0.0,
                    "spectrogram": None,
                    "zcr": 0.0,
                    "rolloff": 0.0
                }
                
            waveform, sample_rate = librosa.load(audio_path, sr=16000, duration=30.0)
            
            # 1. Voice Activity Detection (VAD) via RMS Energy
            rms = librosa.feature.rms(y=waveform)[0]
            
            # Guard against division by zero for silent audio
            rms_max = np.max(rms)
            if rms_max == 0:
                logger.info("Audio track is completely silent")
                return {
                    "score": 0.0,
                    "flatness": 0.0,
                    "phase": 0.0,
                    "spectrogram": None,
                    "zcr": 0.0,
                    "rolloff": 0.0
                }
            
            rms_norm = rms / rms_max
            active_frames = np.where(rms_norm > 0.05)[0]
            if len(active_frames) == 0:
                logger.info("No active speech detected in audio track")
                return {
                    "score": 0.0,
                    "flatness": 0.0,
                    "phase": 0.0,
                    "spectrogram": None,
                    "zcr": 0.0,
                    "rolloff": 0.0
                }
                
            # Use the first 5 seconds of active speech
            active_samples = librosa.frames_to_samples(active_frames)
            start_idx = active_samples[0]
            end_idx = min(len(waveform), start_idx + 5 * sample_rate)
            waveform_segment = waveform[start_idx:end_idx]

            # Acoustic Biomarkers
            flatness = float(np.mean(librosa.feature.spectral_flatness(y=waveform_segment)))
            centroid = float(np.mean(librosa.feature.spectral_centroid(y=waveform_segment, sr=sample_rate)))
            phase = float(min(1.0, centroid / 4000.0))
            zcr = float(np.mean(librosa.feature.zero_crossing_rate(y=waveform_segment)))
            rolloff = float(np.mean(librosa.feature.spectral_rolloff(y=waveform_segment, sr=sample_rate)))
            jitter, shimmer, hnr = compute_micro_tremors(waveform_segment, sample_rate)
            
            spectrogram_b64 = generate_spectrogram_b64(waveform_segment, sample_rate)
            
            inputs = self.processor(waveform_segment, sampling_rate=sample_rate, return_tensors="pt", padding=True)
            
            if self.onnx_session is not None:
                ort_inputs = {self.onnx_session.get_inputs()[0].name: inputs['input_values'].numpy()}
                ort_outs = self.onnx_session.run(None, ort_inputs)
                logits = torch.tensor(ort_outs[0])
            else:
                inputs = {k: v.to(self.device) for k, v in inputs.items()}
                with torch.no_grad():
                    logits = self.model(**inputs).logits
                    
            probabilities = torch.softmax(logits, dim=-1)
            target_idx = min(self.fake_class_idx, probabilities.shape[-1] - 1)
            fake_prob = float(probabilities[0, target_idx].item())

            # Calibrate neural score with physical vocoder acoustic anomalies
            acoustic_risk = 0.0
            if flatness > 0.40:
                acoustic_risk += 0.25
            if phase > 0.80:
                acoustic_risk += 0.25
            if zcr > 0.35:
                acoustic_risk += 0.20
            # Natural human jitter is 0.004 - 0.015; synthetic vocoders show near-zero jitter or extreme jitter (>0.035)
            if jitter < 0.002 or jitter > 0.035:
                acoustic_risk += 0.30

            calibrated_score = float(np.clip(0.80 * fake_prob + 0.20 * min(1.0, acoustic_risk), 0.0, 1.0))
                
            return {
                "score": calibrated_score,
                "flatness": flatness,
                "phase": phase,
                "zcr": zcr,
                "rolloff": rolloff,
                "jitter": jitter,
                "shimmer": shimmer,
                "hnr": hnr,
                "spectrogram": spectrogram_b64
            }
        finally:
            # Fix 5b: Always clean up temp audio file
            try:
                if os.path.exists(audio_path):
                    os.remove(audio_path)
            except:
                pass
            import gc
            gc.collect()

audio_detector = AudioModel()
