import io
import os
import uuid
import torch
import librosa
import librosa.display
import numpy as np
import ffmpeg
import base64
import matplotlib
matplotlib.use('Agg')  # Thread-safe non-interactive backend
import matplotlib.pyplot as plt
from transformers import AutoFeatureExtractor, AutoModelForAudioClassification

def generate_spectrogram_b64(y, sr):
    """Thread-safe spectrogram generation using OO matplotlib API."""
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

class AudioModel:
    def __init__(self, model_id="HyperMoon/wav2vec2-base-960h-finetuned-deepfake", onnx_path="./audio_weights/audio_onnx/model.onnx"):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.onnx_session = None
        self.model = None
        self.processor = None
        
        if os.path.exists(onnx_path) and os.path.getsize(onnx_path) > 1024 * 1024:
            print(f"Loading Audio Model from ONNX: {onnx_path}")
            try:
                import onnxruntime
                available_providers = onnxruntime.get_available_providers()
                providers = [p for p in ['CUDAExecutionProvider', 'CPUExecutionProvider'] if p in available_providers]
                self.onnx_session = onnxruntime.InferenceSession(onnx_path, providers=providers)
            except ImportError:
                print("onnxruntime not installed, falling back to PyTorch")
            except Exception as e:
                print(f"Warning: Failed to load ONNX model ({e}), falling back to PyTorch")
        elif os.path.exists(onnx_path):
            print(f"Warning: {onnx_path} appears to be a Git LFS pointer (too small). Skipping ONNX, falling back to PyTorch.")

        print(f"Loading Audio Model Feature Extractor: {model_id}...")
        try:
            self.processor = AutoFeatureExtractor.from_pretrained(model_id)
            if self.onnx_session is None:
                self.model = AutoModelForAudioClassification.from_pretrained(model_id)
                self.model.to(self.device)
                self.model.eval()
        except Exception as e:
            print(f"Warning: Could not load audio model due to {e}. It will fallback to a default score.")
            self.model = None

    def extract_audio(self, file_path: str, output_audio_path: str):
        try:
            (
                ffmpeg
                .input(file_path)
                .output(output_audio_path, acodec='pcm_s16le', ac=1, ar='16k')
                .overwrite_output()
                .run(quiet=True)
            )
            return True
        except Exception as e:
            print("Audio extraction failed or file has no audio track:", e)
            return False

    def predict_audio(self, file_path: str):
        # Fix 5: Use unique temp filename per request to prevent race conditions
        audio_path = f"temp_audio_{uuid.uuid4().hex[:8]}.wav"
        
        try:
            if not self.extract_audio(file_path, audio_path):
                return {"score": 0.0, "flatness": 0.0, "phase": 0.0, "spectrogram": None}
                
            if self.processor is None or (self.onnx_session is None and self.model is None):
                return {"score": 0.5, "flatness": 0.0, "phase": 0.0, "spectrogram": None}
                
            waveform, sample_rate = librosa.load(audio_path, sr=16000)
            
            # 1. Voice Activity Detection (VAD) via RMS Energy
            rms = librosa.feature.rms(y=waveform)[0]
            
            # Fix 6: Guard against division by zero for silent audio
            rms_max = np.max(rms)
            if rms_max == 0:
                print("Audio track is completely silent!")
                return {"score": 0.0, "flatness": 0.0, "phase": 0.0, "spectrogram": None}
            
            rms_norm = rms / rms_max
            active_frames = np.where(rms_norm > 0.05)[0]
            if len(active_frames) == 0:
                print("No active speech detected in audio track!")
                return {"score": 0.0, "flatness": 0.0, "phase": 0.0, "spectrogram": None}
                
            # Use the first 5 seconds of active speech
            active_samples = librosa.frames_to_samples(active_frames)
            start_idx = active_samples[0]
            end_idx = min(len(waveform), start_idx + 5 * sample_rate)
            waveform = waveform[start_idx:end_idx]

            # Biomarkers
            flatness = np.mean(librosa.feature.spectral_flatness(y=waveform))
            centroid = np.mean(librosa.feature.spectral_centroid(y=waveform, sr=sample_rate))
            phase = min(1.0, centroid / 4000.0)
            
            spectrogram_b64 = generate_spectrogram_b64(waveform, sample_rate)
            
            inputs = self.processor(waveform, sampling_rate=sample_rate, return_tensors="pt", padding=True)
            
            if self.onnx_session is not None:
                ort_inputs = {self.onnx_session.get_inputs()[0].name: inputs['input_values'].numpy()}
                ort_outs = self.onnx_session.run(None, ort_inputs)
                logits = torch.tensor(ort_outs[0])
            else:
                inputs = {k: v.to(self.device) for k, v in inputs.items()}
                with torch.no_grad():
                    logits = self.model(**inputs).logits
                    
            probabilities = torch.softmax(logits, dim=-1)
            fake_prob = probabilities[0, 1].item()  # Index 1 = "spoof" (fake)
                
            return {
                "score": fake_prob,
                "flatness": float(flatness),
                "phase": float(phase),
                "spectrogram": spectrogram_b64
            }
        finally:
            # Fix 5b: Always clean up temp audio file
            try:
                if os.path.exists(audio_path):
                    os.remove(audio_path)
            except:
                pass

audio_detector = AudioModel()
