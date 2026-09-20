import sys

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

html = html.replace('<!-- MASSIVE BORDERLESS / WHISPER-BORDER UPLOAD ZONE -->', '<input type="file" id="fileInput" accept="video/mp4,video/webm,audio/wav,audio/flac,image/*" style="display: none;">\n<!-- MASSIVE BORDERLESS / WHISPER-BORDER UPLOAD ZONE -->')

html = html.replace('<div class="relative rounded-2xl border border-dashed border-outline-variant/40 bg-surface-container-lowest hover:border-primary/60 transition-all duration-300 py-16 sm:py-20 px-8 flex flex-col items-center text-center cursor-pointer group shadow-[0_4px_24px_rgba(0,0,0,0.02)]">', '<div id="uploadZone" class="relative rounded-2xl border border-dashed border-outline-variant/40 bg-surface-container-lowest hover:border-primary/60 transition-all duration-300 py-16 sm:py-20 px-8 flex flex-col items-center text-center cursor-pointer group shadow-[0_4px_24px_rgba(0,0,0,0.02)]">')

html = html.replace('<button class="px-5 py-2 rounded-lg bg-on-surface text-on-primary font-label-md text-label-md text-[13px] font-medium hover:bg-black transition-all duration-150 active:scale-95 shadow-sm" type="button">', '<button id="browseBtn" class="px-5 py-2 rounded-lg bg-on-surface text-on-primary font-label-md text-label-md text-[13px] font-medium hover:bg-black transition-all duration-150 active:scale-95 shadow-sm" type="button">')

html = html.replace('<section class="max-w-4xl mx-auto w-full pt-4 space-y-12">', '<section id="resultsSection" style="display: none;" class="max-w-4xl mx-auto w-full pt-4 space-y-12">')

html = html.replace('94.2% Synthetic Probability', '<span id="fusionScore">--</span> Synthetic Probability')
html = html.replace('>94.2%<', ' id="vitScore">94.2%<')
html = html.replace('>89.4%<', ' id="cnnScore">89.4%<')
html = html.replace('>98.6%<', ' id="elaScore">98.6%<')

js = '''
<script>
    const fileInput = document.getElementById('fileInput');
    const uploadZone = document.getElementById('uploadZone');
    const browseBtn = document.getElementById('browseBtn');
    const resultsSection = document.getElementById('resultsSection');
    
    const fusionScore = document.getElementById('fusionScore');
    const vitScore = document.getElementById('vitScore');
    const cnnScore = document.getElementById('cnnScore');
    const elaScore = document.getElementById('elaScore');
    
    if(browseBtn) {
        browseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            fileInput.click();
        });
    }
    
    if(uploadZone) {
        uploadZone.addEventListener('click', () => {
            fileInput.click();
        });
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
        });
        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
        });
    }

    if(fileInput) {
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length) handleFile(e.target.files[0]);
        });
    }

    async function handleFile(file) {
        uploadZone.innerHTML = '<div class="text-primary font-headline-md">Analyzing Media... Please Wait.</div>';
        
        const formData = new FormData();
        formData.append('file', file);
        
        try {
            const res = await fetch('http://localhost:8000/detect', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            
            resultsSection.style.display = 'block';
            
            if(fusionScore) fusionScore.textContent = (data.fusion_score * 100).toFixed(1) + '%';
            if(vitScore) vitScore.textContent = data.vision_fake_probability !== null ? (data.vision_fake_probability * 100).toFixed(1) + '%' : 'N/A';
            if(cnnScore) cnnScore.textContent = data.audio_fake_probability !== null ? (data.audio_fake_probability * 100).toFixed(1) + '%' : 'N/A';
            if(elaScore) elaScore.textContent = (data.fusion_score * 100).toFixed(1) + '%';
            
            uploadZone.innerHTML = '<div class="text-primary font-headline-md">Analysis Complete! Drop another file.</div>';
            
        } catch(err) {
            console.error(err);
            uploadZone.innerHTML = '<div class="text-error font-headline-md">Error during analysis.</div>';
        }
    }
</script>
</body>
'''
html = html.replace('</body>', js)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
