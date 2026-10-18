import os
import torch
import numpy as np
import cv2
import base64
from typing import List, Dict, Any, Optional, Tuple, Union
from transformers import AutoImageProcessor, AutoModelForImageClassification

import logging

logger = logging.getLogger("veritas.vision")

def generate_heatmap_b64(frame):
    if frame is None or getattr(frame, "size", 0) == 0:
        return None
    try:
        encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), 90]
        _, encoded = cv2.imencode('.jpg', frame, encode_param)
        decoded = cv2.imdecode(encoded, cv2.IMREAD_COLOR)
        diff = cv2.absdiff(frame, decoded)
        diff = cv2.cvtColor(diff, cv2.COLOR_BGR2GRAY)
        diff = cv2.normalize(diff, None, alpha=0, beta=255, norm_type=cv2.NORM_MINMAX)
        heatmap = cv2.applyColorMap(diff, cv2.COLORMAP_JET)
        _, buffer = cv2.imencode('.png', heatmap)
        return base64.b64encode(buffer).decode('utf-8')
    except Exception as e:
        logger.warning(f"Failed to generate heatmap: {e}")
        return None

def generate_fft_b64(frame):
    if frame is None or getattr(frame, "size", 0) == 0:
        return None
    try:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        f = np.fft.fft2(gray)
        fshift = np.fft.fftshift(f)
        magnitude_spectrum = 20 * np.log(np.abs(fshift) + 1)
        magnitude_spectrum = cv2.normalize(magnitude_spectrum, None, 0, 255, cv2.NORM_MINMAX, dtype=cv2.CV_8U)
        heatmap = cv2.applyColorMap(magnitude_spectrum, cv2.COLORMAP_VIRIDIS)
        _, buffer = cv2.imencode('.png', heatmap)
        return base64.b64encode(buffer).decode('utf-8')
    except Exception as e:
        logger.warning(f"Failed to generate FFT spectrum: {e}")
        return None

import math

class FaceExtractor:
    def __init__(self):
        try:
            from uniface.detection import RetinaFace
            from uniface.tracking import BYTETracker
            self.detector = RetinaFace(confidence_threshold=0.6, nms_threshold=0.4)
            self.tracker = BYTETracker()
            logger.info("Successfully loaded UniFace for Multi-Face Tracking")
        except ImportError:
            self.detector = None
            self.tracker = None
            logger.info("uniface not installed. Multi-Face tracking will fall back to center crop.")

    def extract_image_faces(self, file_path):
        frame = cv2.imread(file_path)
        if frame is None:
            return [], frame
            
        faces = []
        if self.detector:
            detected_faces = self.detector.detect(frame)
            if detected_faces:
                for face in detected_faces:
                    x1, y1, x2, y2 = map(int, face.bbox[:4])
                    h, w, _ = frame.shape
                    
                    box_w, box_h = x2 - x1, y2 - y1
                    pad_x = int(box_w * 0.5)
                    pad_y = int(box_h * 0.5)
                    
                    crop_x1 = max(0, x1 - pad_x)
                    crop_y1 = max(0, y1 - pad_y)
                    crop_x2 = min(w, x2 + pad_x)
                    crop_y2 = min(h, y2 + pad_y)
                    
                    if (crop_x2 - crop_x1) > 0 and (crop_y2 - crop_y1) > 0:
                        cropped = frame[crop_y1:crop_y2, crop_x1:crop_x2]
                        cropped_rgb = cv2.cvtColor(cropped, cv2.COLOR_BGR2RGB)
                        faces.append({"bbox": [crop_x1, crop_y1, crop_x2 - crop_x1, crop_y2 - crop_y1], "img": cropped_rgb})
            
        if not faces:
            # Fallback Center Crop
            h_img, w_img = frame.shape[:2]
            ch, cw = h_img // 2, w_img // 2
            size = min(h_img, w_img) // 4
            cropped = frame[ch-size:ch+size, cw-size:cw+size]
            if cropped.size > 0:
                faces.append({"bbox": [cw-size, ch-size, size*2, size*2], "img": cv2.cvtColor(cropped, cv2.COLOR_BGR2RGB)})
                
        return faces, frame

    def extract_video_timeline(self, file_path, max_frames: int = 30):
        cap = cv2.VideoCapture(file_path)
        try:
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            fps = cap.get(cv2.CAP_PROP_FPS)
            if fps <= 0 or math.isnan(fps):
                fps = 30.0
            
            # Dynamically calculate step to evenly sample across the entire video
            if total_frames > 0 and total_frames > max_frames:
                step = max(1, total_frames // max_frames)
            else:
                step = max(1, int(fps))
            
            frames = []
            frame_idx = 0
            while cap.isOpened() and len(frames) < max_frames:
                ret, frame = cap.read()
                if not ret:
                    break
                if frame_idx % step == 0:
                    detected_faces = None
                    if self.detector:
                        detected_faces = self.detector.detect(frame)
                    
                    frame_crops = []
                    if detected_faces and len(detected_faces) > 0:
                        for det_face in detected_faces:
                            x1, y1, x2, y2 = map(int, det_face.bbox[:4])
                            h_img, w_img, _ = frame.shape
                            
                            w, h = x2 - x1, y2 - y1
                            pad_x = int(w * 0.5)
                            pad_y = int(h * 0.5)
                            
                            crop_x1 = max(0, x1 - pad_x)
                            crop_y1 = max(0, y1 - pad_y)
                            crop_x2 = min(w_img, x2 + pad_x)
                            crop_y2 = min(h_img, y2 + pad_y)
                            
                            cw, ch = crop_x2 - crop_x1, crop_y2 - crop_y1
                            if cw > 0 and ch > 0:
                                cropped = frame[crop_y1:crop_y2, crop_x1:crop_x2]
                                if cropped.size > 0:
                                    frame_crops.append(cv2.cvtColor(cropped, cv2.COLOR_BGR2RGB))
                    
                    if not frame_crops:
                        h_img, w_img = frame.shape[:2]
                        x, y = w_img // 4, h_img // 4
                        w, h = w_img // 2, h_img // 2
                        if w > 0 and h > 0:
                            cropped = frame[y:y+h, x:x+w]
                            if cropped.size > 0:
                                frame_crops.append(cv2.cvtColor(cropped, cv2.COLOR_BGR2RGB))
                    
                    for crop in frame_crops:
                        if len(frames) < max_frames:
                            frames.append((crop, frame))
                frame_idx += 1
            return frames
        finally:
            cap.release()

class VisionModel:
    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        
        # Check if the user has fine-tuned their own custom model
        custom_model_dir = "./custom_weights"
        if os.path.exists(custom_model_dir) and os.path.exists(os.path.join(custom_model_dir, "config.json")):
            self.model_vit_id = custom_model_dir
            logger.info("Found Custom Weights! Will load Fine-Tuned ViT model from %s", custom_model_dir)
        else:
            self.model_vit_id = "dima806/deepfake_vs_real_image_detection"
            
        self.model_cnn_id = "prithivMLmods/Deep-Fake-Detector-Model"
        self.model_gan_id = "umm-maybe/AI-image-detector"
        
        self.model_vit = None
        self.processor_vit = None
        self.model_cnn = None
        self.processor_cnn = None
        self.model_gan = None
        self.processor_gan = None
        
        self.vit_fake_idx = 1
        self.cnn_fake_idx = 0
        self.gan_fake_idx = 0

        self.mp_face_mesh = None
        self.face_extractor = FaceExtractor()
        self._models_loaded = False
        import threading
        self._lock = threading.Lock()

    def _ensure_models(self):
        """Lazy load deep learning models with strict memory budgeting for cloud containers."""
        if self._models_loaded:
            return
        with self._lock:
            if self._models_loaded:
                return
            
            # Pin torch to single thread to prevent CPU spike and RAM inflation
            torch.set_num_threads(1)
            
            try:
                logger.info("Lazy loading Primary Model A (ViT: %s)...", self.model_vit_id)
                self.processor_vit = AutoImageProcessor.from_pretrained(self.model_vit_id)
                self.model_vit = AutoModelForImageClassification.from_pretrained(
                    self.model_vit_id,
                    low_cpu_mem_usage=True
                ).to(self.device).eval()
                self.vit_fake_idx = self._resolve_fake_index(self.model_vit, default_idx=1)
                logger.info("Loaded Ensemble Model A (ViT - Deepfake/Swap)")
            except Exception as e:
                logger.warning("Could not load ViT model: %s", e)

            # In constrained environments (Render free tier with 512MB RAM), skip secondary heavy models to prevent OOM
            is_low_mem = os.getenv("LOW_MEM", "1") == "1"
            if not is_low_mem:
                try:
                    self.processor_cnn = AutoImageProcessor.from_pretrained(self.model_cnn_id)
                    self.model_cnn = AutoModelForImageClassification.from_pretrained(
                        self.model_cnn_id,
                        low_cpu_mem_usage=True
                    ).to(self.device).eval()
                    self.cnn_fake_idx = self._resolve_fake_index(self.model_cnn, default_idx=0)
                    logger.info("Loaded Ensemble Model B (CNN)")
                except Exception as e:
                    logger.warning("Could not load CNN model: %s", e)
                    
                try:
                    self.processor_gan = AutoImageProcessor.from_pretrained(self.model_gan_id)
                    self.model_gan = AutoModelForImageClassification.from_pretrained(
                        self.model_gan_id,
                        low_cpu_mem_usage=True
                    ).to(self.device).eval()
                    self.gan_fake_idx = self._resolve_fake_index(self.model_gan, default_idx=0)
                    logger.info("Loaded Ensemble Model C (ViT - GAN/Synthetic)")
                except Exception as e:
                    logger.warning("Could not load GAN model: %s", e)
            else:
                logger.info("Operating in LOW_MEM mode (512MB footprint): Primary ViT + Physical Forensics active.")

            # Load MediaPipe FaceMesh for biometric analysis
            try:
                import mediapipe as mp
                self.mp_face_mesh = mp.solutions.face_mesh.FaceMesh(static_image_mode=True, max_num_faces=1, refine_landmarks=True)
                logger.info("Loaded MediaPipe FaceMesh for biometric analysis")
            except ImportError:
                logger.info("mediapipe not installed. Skipping biometric mesh checks.")
            except Exception as e:
                logger.warning("Could not initialize MediaPipe FaceMesh: %s", e)

            self._models_loaded = True

    def _resolve_fake_index(self, model, default_idx: int = 1) -> int:
        """Dynamically identify the class index corresponding to synthetic/deepfake media."""
        if not model or not hasattr(model, "config") or not hasattr(model.config, "id2label"):
            return default_idx
        id2label = getattr(model.config, "id2label", None)
        if not id2label:
            return default_idx
        
        fake_keywords = {"fake", "deepfake", "spoof", "artificial", "synthetic", "manipulated", "generated"}
        for idx, label in id2label.items():
            lbl = str(label).lower().strip()
            if any(k in lbl for k in fake_keywords):
                return int(idx)

        real_keywords = {"real", "authentic", "bonafide", "bona-fide", "human", "pristine"}
        for idx, label in id2label.items():
            lbl = str(label).lower().strip()
            if any(k in lbl for k in real_keywords):
                other = [int(i) for i in id2label.keys() if int(i) != int(idx)]
                if other:
                    return other[0]
        return default_idx

    def analyze_chrominance_noise(self, face_rgb: np.ndarray) -> float:
        """Analyze high-frequency noise covariance in YCbCr chrominance channels.
        Synthetic models and GAN inpainting exhibit abnormal noise decoupling across color planes."""
        try:
            if face_rgb is None or getattr(face_rgb, "size", 0) == 0:
                return 0.5
            ycbcr = cv2.cvtColor(face_rgb, cv2.COLOR_RGB2YCrCb)
            cb = ycbcr[:, :, 1].astype(np.float32)
            cr = ycbcr[:, :, 2].astype(np.float32)

            med_cb = cv2.medianBlur(ycbcr[:, :, 1], 3).astype(np.float32)
            med_cr = cv2.medianBlur(ycbcr[:, :, 2], 3).astype(np.float32)

            res_cb = cb - med_cb
            res_cr = cr - med_cr

            std_cb = np.std(res_cb)
            std_cr = np.std(res_cr)
            if std_cb < 1e-4 or std_cr < 1e-4:
                return 0.5

            cov = np.mean(res_cb * res_cr)
            corr = cov / (std_cb * std_cr + 1e-6)

            # Natural camera sensors exhibit moderate positive correlation in noise residuals (0.15 - 0.55).
            # Synthetic generators frequently show near-zero or negative correlation, or extreme variance imbalance.
            corr_abs = abs(corr)
            var_ratio = max(std_cb, std_cr) / (min(std_cb, std_cr) + 1e-6)

            noise_anomaly = 0.0
            if corr_abs < 0.08 or corr < -0.15:
                noise_anomaly += 0.40
            if var_ratio > 3.0:
                noise_anomaly += 0.35

            return float(np.clip(noise_anomaly, 0.0, 1.0))
        except Exception as e:
            logger.debug("Chrominance noise analysis error: %s", e)
            return 0.5

    def analyze_corneal_specular_concordance(self, face_rgb: np.ndarray, landmarks) -> float:
        """Verify that corneal specular reflections in the left and right eyes match physical lighting angles."""
        try:
            if not landmarks or len(landmarks) < 474:
                return 0.5  # Neutral if refined iris landmarks are unavailable

            h, w, _ = face_rgb.shape
            # Left eye pupil & corners
            lx1, ly1 = int(landmarks[33].x * w), int(min(landmarks[159].y, landmarks[145].y) * h)
            lx2, ly2 = int(landmarks[133].x * w), int(max(landmarks[159].y, landmarks[145].y) * h)
            # Right eye pupil & corners
            rx1, ry1 = int(landmarks[362].x * w), int(min(landmarks[386].y, landmarks[374].y) * h)
            rx2, ry2 = int(landmarks[263].x * w), int(max(landmarks[386].y, landmarks[374].y) * h)

            # Crop eyes safely
            left_eye = face_rgb[max(0, ly1-2):min(h, ly2+2), max(0, lx1-2):min(w, lx2+2)]
            right_eye = face_rgb[max(0, ry1-2):min(h, ry2+2), max(0, rx1-2):min(w, rx2+2)]

            if left_eye.size == 0 or right_eye.size == 0:
                return 0.5

            # Convert to grayscale and find specular highlights (top 8% brightest pixels)
            lgray = cv2.cvtColor(left_eye, cv2.COLOR_RGB2GRAY)
            rgray = cv2.cvtColor(right_eye, cv2.COLOR_RGB2GRAY)

            l_thresh = np.percentile(lgray, 92)
            r_thresh = np.percentile(rgray, 92)

            l_pts = np.argwhere(lgray >= l_thresh)
            r_pts = np.argwhere(rgray >= r_thresh)

            if len(l_pts) == 0 or len(r_pts) == 0:
                return 0.5

            # Compute specular center of mass relative to eye center
            l_center = np.mean(l_pts, axis=0) - (np.array(lgray.shape) / 2.0)
            r_center = np.mean(r_pts, axis=0) - (np.array(rgray.shape) / 2.0)

            l_norm = np.linalg.norm(l_center)
            r_norm = np.linalg.norm(r_center)

            if l_norm < 1.0 or r_norm < 1.0:
                return 0.3  # Centered light reflection is consistent

            cos_sim = float(np.dot(l_center, r_center) / (l_norm * r_norm + 1e-6))
            # If reflection direction vectors point in opposite directions (cos_sim < 0.2), discordant light source!
            concordance_risk = 1.0 / (1.0 + np.exp(4.0 * (cos_sim - 0.25)))
            return float(np.clip(concordance_risk, 0.0, 1.0))
        except Exception as e:
            logger.debug("Corneal specular concordance error: %s", e)
            return 0.5

    def analyze_temporal_stability(self, landmark_history: List[Any]) -> float:
        """Measure landmark velocity and acceleration variance across consecutive video frames.
        Face reenactment and deepfake video models exhibit inter-frame jitter and micro-flicker."""
        if not landmark_history or len(landmark_history) < 3:
            return 0.0
        try:
            velocities = []
            for t in range(1, len(landmark_history)):
                l1 = landmark_history[t - 1]
                l2 = landmark_history[t]
                if l1 is None or l2 is None:
                    continue
                # Interpupillary distance for normalization
                ipd = abs(l2[33].x - l2[263].x) + 1e-6
                pts1 = np.array([[p.x, p.y, p.z] for p in l1[:468]])
                pts2 = np.array([[p.x, p.y, p.z] for p in l2[:468]])
                disp = np.linalg.norm(pts2 - pts1, axis=1) / ipd
                velocities.append(disp)

            if len(velocities) < 2:
                return 0.0

            # Acceleration / Jerk (second derivative of facial coordinates)
            accelerations = []
            for t in range(1, len(velocities)):
                accel = np.abs(velocities[t] - velocities[t - 1])
                accelerations.append(np.mean(accel))

            jitter_metric = float(np.mean(accelerations))
            # Smooth real motion has jitter < 0.04; deepfake jitter typically exceeds 0.09
            jitter_prob = 1.0 / (1.0 + np.exp(-(jitter_metric - 0.065) / 0.015))
            return float(np.clip(jitter_prob, 0.0, 1.0))
        except Exception as e:
            logger.debug("Temporal stability analysis error: %s", e)
            return 0.0

    def process_tensors(self, faces_list):
        if not faces_list:
            return []
        
        self._ensure_models()
        
        num_faces = len(faces_list)
        fake_probs_vit = [0.5] * num_faces
        fake_probs_cnn = [0.5] * num_faces
        fake_probs_gan = [0.5] * num_faces
        fake_probs_ela = [0.5] * num_faces
        fake_probs_bio = [0.5] * num_faces
        fake_probs_fft = [0.5] * num_faces
        fake_probs_chroma = [0.5] * num_faces
        fake_probs_corneal = [0.5] * num_faces
            
        # 1. Calibrated Localized ELA, FFT Spectral, Chrominance & Biometrics
        for i, face_img in enumerate(faces_list):
            # Error Level Analysis (ELA)
            try:
                face_bgr = cv2.cvtColor(face_img, cv2.COLOR_RGB2BGR)
                encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), 90]
                _, encoded = cv2.imencode('.jpg', face_bgr, encode_param)
                decoded = cv2.imdecode(encoded, cv2.IMREAD_COLOR)
                diff = cv2.absdiff(face_bgr, decoded)
                gray_diff = cv2.cvtColor(diff, cv2.COLOR_BGR2GRAY)
                variance = float(np.var(gray_diff))
                ela_prob = 1.0 / (1.0 + np.exp(-(variance - 22.0) / 10.0))
                fake_probs_ela[i] = float(np.clip(ela_prob, 0.0, 1.0))
            except Exception as e:
                logger.debug("ELA extraction exception: %s", e)

            # Frequency Domain Spectral Artifacts (FFT)
            try:
                f = np.fft.fft2(cv2.cvtColor(face_img, cv2.COLOR_RGB2GRAY))
                fshift = np.fft.fftshift(f)
                magnitude_spectrum = 20 * np.log(np.abs(fshift) + 1)
                h, w = magnitude_spectrum.shape
                cy, cx = h // 2, w // 2
                r = min(h, w) // 4
                y, x = np.ogrid[:h, :w]
                high_mask = (x - cx)**2 + (y - cy)**2 > r**2
                low_mask = (x - cx)**2 + (y - cy)**2 <= (r // 2)**2
                
                high_freq_energy = float(np.mean(magnitude_spectrum[high_mask])) if np.any(high_mask) else 0.0
                low_freq_energy = float(np.mean(magnitude_spectrum[low_mask])) if np.any(low_mask) else 1.0
                
                ratio = high_freq_energy / (low_freq_energy + 1e-6)
                fft_prob = 1.0 / (1.0 + np.exp(-(ratio - 0.72) / 0.12))
                fake_probs_fft[i] = float(np.clip(fft_prob, 0.0, 1.0))
            except Exception as e:
                logger.debug("FFT extraction exception: %s", e)
            
            # Chrominance Noise Residuals
            fake_probs_chroma[i] = self.analyze_chrominance_noise(face_img)

            # Pose-Compensated Biometric & Corneal Specular Concordance
            bio_prob = 0.5
            corneal_prob = 0.5
            if self.mp_face_mesh:
                try:
                    results = self.mp_face_mesh.process(face_img)
                    if results and results.multi_face_landmarks:
                        landmarks = results.multi_face_landmarks[0].landmark
                        ipd = abs(landmarks[33].x - landmarks[263].x) + 1e-6
                        left_eye_w = abs(landmarks[33].x - landmarks[133].x) / ipd
                        right_eye_w = abs(landmarks[362].x - landmarks[263].x) / ipd
                        
                        eye_mid_x = (landmarks[33].x + landmarks[263].x) / 2.0
                        yaw_offset = abs(landmarks[1].x - eye_mid_x) / ipd
                        expected_asymmetry = yaw_offset * 0.35
                        
                        raw_diff = abs(left_eye_w - right_eye_w)
                        corrected_diff = max(0.0, raw_diff - expected_asymmetry)
                        bio_prob = 1.0 / (1.0 + np.exp(-(corrected_diff - 0.12) / 0.04))

                        if len(landmarks) > 468:
                            left_iris_w = abs(landmarks[474].x - landmarks[476].x)
                            left_iris_h = abs(landmarks[475].y - landmarks[477].y)
                            right_iris_w = abs(landmarks[469].x - landmarks[471].x)
                            right_iris_h = abs(landmarks[470].y - landmarks[472].y)
                            
                            left_ar = left_iris_w / (left_iris_h + 1e-6)
                            right_ar = right_iris_w / (right_iris_h + 1e-6)
                            iris_distortion = abs(left_ar - 1.0) + abs(right_ar - 1.0)
                            iris_prob = float(np.clip(iris_distortion / 0.45, 0.0, 1.0))
                            bio_prob = max(bio_prob, iris_prob)

                            # Corneal specular highlight concordance
                            corneal_prob = self.analyze_corneal_specular_concordance(face_img, landmarks)
                except Exception as ex:
                    logger.debug("MediaPipe landmark processing exception: %s", ex)
            fake_probs_bio[i] = float(np.clip(bio_prob, 0.0, 1.0))
            fake_probs_corneal[i] = float(np.clip(corneal_prob, 0.0, 1.0))
            
        # 2. Batched Neural Inference
        def _predict_model_batches(model, processor, images, target_idx, batch_size=16):
            if not model or not processor or not images:
                return [0.5] * len(images)
            predictions = []
            for start_idx in range(0, len(images), batch_size):
                chunk = images[start_idx:start_idx + batch_size]
                try:
                    inputs = processor(images=chunk, return_tensors="pt")
                    inputs = {k: v.to(self.device) for k, v in inputs.items()}
                    with torch.no_grad():
                        outputs = model(**inputs).logits
                    probs = torch.softmax(outputs, dim=1)
                    predictions.extend(probs[:, target_idx].cpu().numpy().tolist())
                except Exception as e:
                    logger.warning("Batch inference chunk failed: %s", e)
                    predictions.extend([0.5] * len(chunk))
            return predictions

        if self.model_vit:
            fake_probs_vit = _predict_model_batches(self.model_vit, self.processor_vit, faces_list, self.vit_fake_idx)
            
        if self.model_cnn:
            fake_probs_cnn = _predict_model_batches(self.model_cnn, self.processor_cnn, faces_list, self.cnn_fake_idx)
            
        if self.model_gan:
            fake_probs_gan = _predict_model_batches(self.model_gan, self.processor_gan, faces_list, self.gan_fake_idx)
            
        # 3. Consensus-Weighted Ensemble Integration with Physical Forensics
        ensemble_probs = []
        for i in range(num_faces):
            active_models = []
            if self.model_vit:
                active_models.append(fake_probs_vit[i])
            if self.model_cnn:
                active_models.append(fake_probs_cnn[i])
            if self.model_gan:
                active_models.append(fake_probs_gan[i])
            
            if active_models:
                nn_mean = sum(active_models) / len(active_models)
                nn_max = max(active_models)
            else:
                nn_mean = fake_probs_ela[i]
                nn_max = fake_probs_ela[i]
            
            # Consensus logic: If 2 or more models agree or strong signal is confirmed
            if nn_max > 0.82 and nn_mean > 0.45:
                nn_score = 0.75 * nn_max + 0.25 * nn_mean
            elif nn_max > 0.70 and nn_mean > 0.35:
                nn_score = 0.60 * nn_max + 0.40 * nn_mean
            else:
                nn_score = nn_mean

            # Calibrated composite fusion (75% neural consensus, 25% physical & spectral forensics)
            weighted_prob = (
                0.75 * nn_score +
                0.07 * fake_probs_ela[i] +
                0.05 * fake_probs_bio[i] +
                0.05 * fake_probs_fft[i] +
                0.04 * fake_probs_chroma[i] +
                0.04 * fake_probs_corneal[i]
            )
            ensemble_probs.append(float(np.clip(weighted_prob, 0.0, 1.0)))
            
        import gc
        gc.collect()
            
        return {
            "probabilities": ensemble_probs,
            "chroma_scores": fake_probs_chroma,
            "corneal_scores": fake_probs_corneal
        }

    def predict_vision(self, file_path: str, is_video: bool = False):
        if is_video:
            frames = self.face_extractor.extract_video_timeline(file_path)
            if not frames:
                return {
                    "score": 0.0,
                    "timeline": [],
                    "heatmap": None,
                    "fft": None,
                    "faces": [],
                    "temporal_stability": 0.0,
                    "corneal_concordance": 0.5,
                    "chrominance_noise": 0.5
                }
            
            faces_list = [f[0] for f in frames]
            full_frame = frames[0][1]
            tensor_results = self.process_tensors(faces_list)
            fake_probs = tensor_results["probabilities"]

            # Extract landmark history across video timeline for temporal stability
            landmark_history = []
            if self.mp_face_mesh:
                for f_img in faces_list:
                    try:
                        res = self.mp_face_mesh.process(f_img)
                        if res and res.multi_face_landmarks:
                            landmark_history.append(res.multi_face_landmarks[0].landmark)
                        else:
                            landmark_history.append(None)
                    except:
                        landmark_history.append(None)

            temporal_stability = self.analyze_temporal_stability(landmark_history)
            overall_score = float(max(fake_probs)) if fake_probs else 0.0
            if temporal_stability > 0.70:
                overall_score = max(overall_score, (overall_score * 0.75) + (temporal_stability * 0.25))

            return {
                "score": float(np.clip(overall_score, 0.0, 1.0)),
                "timeline": fake_probs,
                "heatmap": generate_heatmap_b64(full_frame),
                "fft": generate_fft_b64(full_frame),
                "faces": [],
                "temporal_stability": round(temporal_stability, 3),
                "corneal_concordance": round(float(np.mean(tensor_results["corneal_scores"])), 3) if tensor_results["corneal_scores"] else 0.5,
                "chrominance_noise": round(float(np.mean(tensor_results["chroma_scores"])), 3) if tensor_results["chroma_scores"] else 0.5
            }
        else:
            extracted_faces, full_frame = self.face_extractor.extract_image_faces(file_path)
            if not extracted_faces:
                return {
                    "score": 0.0,
                    "timeline": [],
                    "heatmap": None,
                    "fft": None,
                    "faces": [],
                    "temporal_stability": 0.0,
                    "corneal_concordance": 0.5,
                    "chrominance_noise": 0.5
                }
                
            faces_list = [f["img"] for f in extracted_faces]
            tensor_results = self.process_tensors(faces_list)
            fake_probs = tensor_results["probabilities"]
            
            result_faces = []
            for i, f in enumerate(extracted_faces):
                result_faces.append({
                    "face_id": f"face_{i}",
                    "bounding_box": f["bbox"],
                    "score": float(fake_probs[i])
                })
                
            overall_score = float(max(fake_probs)) if fake_probs else 0.0
            
            return {
                "score": overall_score,
                "timeline": [],
                "heatmap": generate_heatmap_b64(full_frame),
                "fft": generate_fft_b64(full_frame),
                "faces": result_faces,
                "temporal_stability": 0.0,
                "corneal_concordance": round(float(np.mean(tensor_results["corneal_scores"])), 3) if tensor_results["corneal_scores"] else 0.5,
                "chrominance_noise": round(float(np.mean(tensor_results["chroma_scores"])), 3) if tensor_results["chroma_scores"] else 0.5
            }

vision_detector = VisionModel()
