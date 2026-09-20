import re

# Update vision_api.py to do strictly 1-fps keyframe extraction (removing the arbitrary 5-frame limit for full-length streams)
with open('vision_api.py', 'r', encoding='utf-8') as f:
    vision = f.read()
# Replace "if len(frames) >= 5: break" with proper stream limits if needed, or remove it so it parses the whole video at 1 fps.
vision = vision.replace('if len(frames) >= 5: break', '# if len(frames) >= 5: break # Removed to allow full stream processing at 1 fps')
with open('vision_api.py', 'w', encoding='utf-8') as f:
    f.write(vision)

# Update audio_api.py to implement simple VAD (Voice Activity Detection)
with open('audio_api.py', 'r', encoding='utf-8') as f:
    audio = f.read()
vad_logic = '''        waveform, sample_rate = librosa.load(audio_path, sr=16000)
        
        # 1. Voice Activity Detection (VAD) via RMS Energy
        # Calculate RMS energy per frame
        rms = librosa.feature.rms(y=waveform)[0]
        # Normalize RMS and find active frames
        rms_norm = rms / np.max(rms)
        active_frames = np.where(rms_norm > 0.05)[0] # Threshold for speech
        if len(active_frames) == 0:
            print("No active speech detected in audio track!")
            return {"score": 0.0, "flatness": 0.0, "phase": 0.0, "spectrogram": None}
            
        # Reconstruct waveform only keeping active segments (Streaming Optimization)
        # Convert frame indices back to sample indices
        active_samples = librosa.frames_to_samples(active_frames)
        # Just use the first 5 seconds of active speech to speed up inference
        start_idx = active_samples[0]
        end_idx = min(len(waveform), start_idx + 5 * sample_rate)
        waveform = waveform[start_idx:end_idx]
'''
audio = audio.replace('        waveform, sample_rate = librosa.load(audio_path, sr=16000)', vad_logic)
with open('audio_api.py', 'w', encoding='utf-8') as f:
    f.write(audio)
