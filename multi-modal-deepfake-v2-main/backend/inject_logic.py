import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

js = '''
<input type="file" id="universalFileInput" accept="video/mp4,video/webm,audio/wav,audio/flac,image/*" style="display: none;">
<div id="universalResultOverlay" style="display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.8); z-index: 9999; flex-direction: column; align-items: center; justify-content: center; color: white; font-family: sans-serif;">
    <div style="background: white; color: black; padding: 2rem; border-radius: 12px; max-width: 500px; width: 90%; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
        <h2 style="margin-top: 0; font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem;">Analysis Result</h2>
        <div id="overlayLoader" style="font-size: 1.1rem; color: #666;">Analyzing Media... Please Wait.</div>
        <div id="overlayContent" style="display: none;">
            <div style="font-size: 3rem; font-weight: bold; margin-bottom: 0.5rem;" id="overlayScore">94.2%</div>
            <div style="font-size: 1.1rem; color: #444; margin-bottom: 1.5rem;" id="overlayVerdict">Synthetic Probability</div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; text-align: left; background: #f5f5f5; padding: 1rem; border-radius: 8px;">
                <div><strong>Vision Fake:</strong> <span id="overlayVit">--</span></div>
                <div><strong>Audio Fake:</strong> <span id="overlayAudio">--</span></div>
            </div>
            
            <button id="closeOverlayBtn" style="margin-top: 1.5rem; background: #000; color: #fff; border: none; padding: 0.75rem 1.5rem; border-radius: 6px; font-size: 1rem; cursor: pointer; width: 100%;">Close</button>
        </div>
    </div>
</div>

<script>
    const fileInput = document.getElementById('universalFileInput');
    const overlay = document.getElementById('universalResultOverlay');
    const overlayLoader = document.getElementById('overlayLoader');
    const overlayContent = document.getElementById('overlayContent');
    const overlayScore = document.getElementById('overlayScore');
    const overlayVerdict = document.getElementById('overlayVerdict');
    const overlayVit = document.getElementById('overlayVit');
    const overlayAudio = document.getElementById('overlayAudio');
    const closeBtn = document.getElementById('closeOverlayBtn');
    
    // Find a button to bind to. Bind to any button that looks like an upload/start button.
    document.body.addEventListener('click', (e) => {
        const btn = e.target.closest('button') || e.target.closest('a');
        if (btn) {
            const text = btn.textContent.toLowerCase();
            if (text.includes('upload') || text.includes('start') || text.includes('detect') || text.includes('scan') || text.includes('check')) {
                e.preventDefault();
                fileInput.click();
            }
        }
    });
    
    closeBtn.addEventListener('click', () => {
        overlay.style.display = 'none';
    });

    fileInput.addEventListener('change', async (e) => {
        if (e.target.files.length) {
            const file = e.target.files[0];
            overlay.style.display = 'flex';
            overlayLoader.style.display = 'block';
            overlayContent.style.display = 'none';
            
            const formData = new FormData();
            formData.append('file', file);
            
            try {
                const res = await fetch('http://localhost:8000/detect', {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();
                
                overlayLoader.style.display = 'none';
                overlayContent.style.display = 'block';
                
                const fusion = (data.fusion_score * 100).toFixed(1);
                overlayScore.textContent = fusion + '%';
                overlayScore.style.color = fusion > 50 ? '#e53e3e' : '#38a169';
                overlayVerdict.textContent = fusion > 50 ? 'Synthetic Deepfake' : 'Authentic Media';
                
                overlayVit.textContent = data.vision_fake_probability !== null ? (data.vision_fake_probability * 100).toFixed(1) + '%' : 'N/A';
                overlayAudio.textContent = data.audio_fake_probability !== null ? (data.audio_fake_probability * 100).toFixed(1) + '%' : 'N/A';
                
            } catch(err) {
                console.error(err);
                overlayLoader.textContent = 'Error connecting to the API.';
            }
            
            fileInput.value = '';
        }
    });
</script>
</body>
'''

if 'universalResultOverlay' not in html:
    html = html.replace('</body>', js)
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(html)
