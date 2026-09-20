// sidepanel.js
// Multimodal Deepfake Detector — side panel logic

const STORAGE_MEDIA_KEY = "pendingMedia";
const STORAGE_API_KEY = "apiBaseUrl";
const DEFAULT_API_BASE = "https://upside-shower-handling.ngrok-free.dev";

// ---------- Elements ----------
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const apiUrlInput = document.getElementById('apiUrl');
let uploadedFileObjectURL = null;
let remoteMediaInfo = null;
let saveTimer = null;

// =====================================================================
// Initialization and Persistence
// =====================================================================

// Load API URL
chrome.storage.local.get([STORAGE_API_KEY], (data) => {
    apiUrlInput.value = data[STORAGE_API_KEY] || DEFAULT_API_BASE;
});

// Save API URL
apiUrlInput.addEventListener("input", () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
        const value = apiUrlInput.value.trim() || DEFAULT_API_BASE;
        chrome.storage.local.set({ [STORAGE_API_KEY]: value });
    }, 400);
});

function getApiBase() {
    let url = (apiUrlInput.value.trim() || DEFAULT_API_BASE);
    if (!url.startsWith('http')) url = 'https://' + url;
    if (url.endsWith('/')) url = url.slice(0, -1);
    return url;
}

// Check for context menu media on load
chrome.storage.local.get([STORAGE_MEDIA_KEY], (data) => {
    if (data[STORAGE_MEDIA_KEY]) {
        loadRemoteMedia(data[STORAGE_MEDIA_KEY]);
    }
});

// Listen for context menu media while panel is open
chrome.runtime.onMessage.addListener((message) => {
    if (message && message.type === "NEW_MEDIA" && message.payload) {
        loadRemoteMedia(message.payload);
    }
});

// =====================================================================
// Media Intake
// =====================================================================

// Drag & Drop
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', (e) => { e.preventDefault(); dropZone.classList.remove('dragover'); });
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length) { 
        fileInput.files = e.dataTransfer.files; 
        processLocalFile(fileInput.files[0]); 
    }
});
fileInput.addEventListener('change', (e) => { 
    if (e.target.files.length) processLocalFile(e.target.files[0]); 
});

document.getElementById('resetBtn').addEventListener('click', resetUI);

function processLocalFile(file) {
    remoteMediaInfo = null;
    chrome.storage.local.remove(STORAGE_MEDIA_KEY);
    startAnalysis(file, null);
}

function loadRemoteMedia(info) {
    remoteMediaInfo = info;
    fileInput.value = '';
    startAnalysis(null, info);
}

// =====================================================================
// Analysis
// =====================================================================

async function startAnalysis(localFile, remoteInfo) {
    resetDashboard();
    const apiUrl = getApiBase();

    let file = localFile;
    let fileName = "remote_media";
    let fileSize = 0;
    
    // Show loading
    document.getElementById('loadingContainer').classList.remove('hidden');
    document.getElementById('resultsDashboard').classList.add('hidden');
    document.getElementById('progressBar').style.width = '10%';
    document.getElementById('loadingText').textContent = 'Preparing media...';

    if (remoteInfo) {
        fileName = guessFilename(remoteInfo.srcUrl, "");
        document.getElementById('loadingSubtext').textContent = 'Fetching media from URL...';
        try {
            file = await fetchRemoteMediaAsFile(remoteInfo);
            fileSize = file.size;
        } catch (err) {
            showError("Could not download remote media. The server might block CORS.");
            return;
        }
    } else if (file) {
        fileName = file.name;
        fileSize = file.size;
        document.getElementById('loadingSubtext').textContent = fileName;
    } else {
        return;
    }

    // Show preview
    uploadedFileObjectURL = URL.createObjectURL(file);
    const isImage = file.type.startsWith('image/');
    if (isImage) {
        document.getElementById('previewThumb').src = uploadedFileObjectURL;
        document.getElementById('previewThumb').classList.remove('hidden');
    } else {
        document.getElementById('previewThumb').classList.add('hidden');
    }
    document.getElementById('previewName').textContent = fileName;
    document.getElementById('previewSize').textContent = (fileSize / 1024 / 1024).toFixed(2) + ' MB';
    document.getElementById('uploadPrompt').classList.add('hidden');
    document.getElementById('uploadPreview').classList.remove('hidden');
    document.getElementById('uploadPreview').classList.add('flex');

    const fd = new FormData();
    fd.append('file', file);

    try {
        document.getElementById('progressBar').style.width = '30%';
        document.getElementById('loadingText').textContent = 'Running AI inference...';
        document.getElementById('loadingSubtext').textContent = 'This may take 30-60 seconds on free Colab';

        const response = await fetch(apiUrl + '/detect', {
            method: 'POST',
            headers: { 'ngrok-skip-browser-warning': 'true' },
            body: fd
        });

        document.getElementById('progressBar').style.width = '90%';
        const data = await response.json();
        document.getElementById('progressBar').style.width = '100%';

        if (data.task_id) {
            pollTask(apiUrl, data.task_id);
        } else {
            setTimeout(() => showResult(data, file), 300);
        }
    } catch (err) {
        showError("Connection Failed. Check your Ngrok URL or ensure the backend is running.");
    }
}

async function fetchRemoteMediaAsFile(info) {
    const res = await fetch(info.srcUrl);
    if (!res.ok) {
        throw new Error(`Could not download media (${res.status})`);
    }
    const blob = await res.blob();
    const name = guessFilename(info.srcUrl, blob.type);
    return new File([blob], name, { type: blob.type });
}

function guessFilename(url, mimeType) {
    try {
        const clean = url.split("?")[0];
        const last = clean.substring(clean.lastIndexOf("/") + 1);
        if (last) return last;
    } catch (_) { }
    const ext = (mimeType && mimeType.split("/")[1]) || "bin";
    return `media.${ext}`;
}

function pollTask(apiUrl, taskId) {
    let interval = setInterval(async () => {
        try {
            const res = await fetch(apiUrl + '/status/' + taskId, { headers: { 'ngrok-skip-browser-warning': 'true' } });
            const data = await res.json();
            if (data.state === 'SUCCESS' || data.result) { clearInterval(interval); showResult(data.result, null); }
            else if (data.state === 'FAILURE') { clearInterval(interval); showError("Backend analysis failed."); }
            else if (data.state === 'PROGRESS' && data.status) {
                document.getElementById('progressBar').style.width = data.status.progress + '%';
                document.getElementById('loadingSubtext').textContent = data.status.step || 'Processing...';
            }
        } catch (err) { console.error(err); }
    }, 2000);
}

// =====================================================================
// UI Rendering
// =====================================================================

function showResult(result, file) {
    document.getElementById('loadingContainer').classList.add('hidden');
    document.getElementById('resultsDashboard').classList.remove('hidden');

    const score = result.confidence !== undefined ? result.confidence : 0;
    const isFake = score > 0.5;
    const percent = (score * 100).toFixed(1);
    const color = isFake ? '#ef4444' : '#10b981';

    // --- Verdict Ring ---
    const ring = document.getElementById('ringFill');
    const circumference = 2 * Math.PI * 85; // ~534
    ring.style.stroke = color;
    ring.setAttribute('stroke-dashoffset', circumference - (circumference * score));

    document.getElementById('verdictPercent').textContent = percent + '%';
    document.getElementById('verdictPercent').style.color = color;
    document.getElementById('verdictTag').textContent = isFake ? 'FAKE' : 'REAL';
    document.getElementById('verdictTag').style.color = color;
    document.getElementById('verdictLabel').textContent = isFake ? 'Synthetic media detected — likely AI-generated or manipulated' : 'No signs of manipulation — media appears authentic';

    const card = document.getElementById('verdictCard');
    card.classList.remove('glow-red', 'glow-green');
    card.classList.add(isFake ? 'glow-red' : 'glow-green');

    // --- Score Bars ---
    const vScore = result.breakdown?.visual_score ?? 0;
    const aScore = result.breakdown?.audio_score;
    const lScore = result.breakdown?.lip_sync_score;

    animateBar('barVisual', 'barVisualLabel', vScore, 'indigo');
    
    if (aScore != null && aScore > 0) {
        animateBar('barAudio', 'barAudioLabel', aScore, 'cyan');
    } else {
        document.getElementById('barAudioLabel').textContent = 'No Audio';
        document.getElementById('barAudioLabel').style.color = '#64748b';
        document.getElementById('barAudio').style.width = '0%';
    }
    
    const lipSyncContainer = document.getElementById('barLip').parentElement.parentElement;
    if (lScore != null) {
        animateBar('barLip', 'barLipLabel', lScore, 'amber');
        lipSyncContainer.style.display = 'block';
    } else {
        lipSyncContainer.style.display = 'none';
    }

    // --- Audio Biomarkers ---
    document.getElementById('valFlatness').textContent = (aScore != null && result.audio_flatness != null) ? result.audio_flatness.toFixed(4) : 'N/A';
    document.getElementById('valPhase').textContent = (aScore != null && result.audio_phase != null) ? result.audio_phase.toFixed(2) : 'N/A';

    // --- ELA Heatmap ---
    const hasHeatmap = result.heatmap && result.heatmap.length > 100;
    const hasFft = result.fft && result.fft.length > 100;
    const hasSpec = result.spectrogram && result.spectrogram.length > 100;
    const hasFaces = result.faces && result.faces.length > 0;

    if (hasHeatmap || hasFft || hasFaces) {
        document.getElementById('visionRow').classList.remove('hidden');
        document.getElementById('visionRow').classList.add('grid');
    }

    if (hasHeatmap) {
        const heatImg = document.getElementById('heatmapImg');
        heatImg.src = 'data:image/png;base64,' + result.heatmap;
        heatImg.classList.remove('hidden');

        if (uploadedFileObjectURL) {
            const heatOrig = document.getElementById('heatmapOrigImg');
            heatOrig.src = uploadedFileObjectURL;
            heatOrig.classList.remove('hidden');
        }
    }

    // --- FFT ---
    if (hasFft || hasSpec) {
        document.getElementById('analysisRow').classList.remove('hidden');
        document.getElementById('analysisRow').classList.add('grid');
    }

    if (hasFft) {
        const fftImg = document.getElementById('fftImg');
        fftImg.src = 'data:image/png;base64,' + result.fft;
        fftImg.classList.remove('hidden');
    }

    // --- Spectrogram ---
    if (hasSpec) {
        const specImg = document.getElementById('spectrogramImg');
        specImg.src = 'data:image/png;base64,' + result.spectrogram;
        specImg.classList.remove('hidden');
    } else {
        document.getElementById('spectrogramPlaceholder').classList.remove('hidden');
    }

    // --- Face Detection Overlay ---
    if (file && file.type.startsWith('image/') && uploadedFileObjectURL) {
        const upImg = document.getElementById('uploadedImg');
        upImg.src = uploadedFileObjectURL;
        upImg.classList.remove('hidden');
        upImg.onload = () => drawFacesDOM(upImg, result.faces || []);
    } else if (hasHeatmap) {
        const upImg = document.getElementById('uploadedImg');
        upImg.src = 'data:image/png;base64,' + result.heatmap;
        upImg.classList.remove('hidden');
    }

    // --- Face List ---
    const faceList = document.getElementById('faceList');
    faceList.innerHTML = '';
    if (hasFaces) {
        result.faces.forEach((f, i) => {
            const fakeProb = (f.score * 100).toFixed(1);
            const isFake = f.score > 0.5;
            const fColor = isFake ? 'text-red-400' : 'text-emerald-400';
            const fBg = isFake ? 'bg-red-500/10 border-red-500/20 hover:bg-red-500/20' : 'bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20';
            
            const el = document.createElement('div');
            el.className = `flex items-center justify-between ${fBg} border rounded-lg px-3 py-2 cursor-pointer transition-colors duration-200`;
            el.innerHTML = `
                <span class="text-xs font-semibold text-slate-300"><i class="fa-solid fa-face-viewfinder ${fColor} mr-1.5"></i>Face ${i + 1}</span>
                <span class="text-xs font-bold ${fColor}">${fakeProb}% ${isFake ? 'FAKE' : 'REAL'}</span>
            `;
            
            // Hover interaction with face box
            el.addEventListener('mouseenter', () => {
                const box = document.getElementById(`face-box-${i}`);
                if (box) box.classList.add('ring-4', 'ring-white', 'scale-[1.02]');
            });
            el.addEventListener('mouseleave', () => {
                const box = document.getElementById(`face-box-${i}`);
                if (box) box.classList.remove('ring-4', 'ring-white', 'scale-[1.02]');
            });

            faceList.appendChild(el);
        });
    }

    // --- Timeline Chart ---
    if (result.timeline && result.timeline.length > 1) {
        document.getElementById('timelineRow').classList.remove('hidden');
        drawTimeline(result.timeline);
    }
}

function animateBar(barId, labelId, score, colorName) {
    const pct = (score * 100).toFixed(1);
    setTimeout(() => {
        document.getElementById(barId).style.width = pct + '%';
        document.getElementById(labelId).textContent = pct + '%';
        document.getElementById(labelId).style.color = score > 0.5 ? '#ef4444' : '#10b981';
    }, 200);
}

function drawFacesDOM(img, faces) {
    const container = document.getElementById('faceBoxesContainer');
    container.innerHTML = '';
    
    // Calculate scale based on natural vs rendered size (object-fit: contain logic)
    const natW = img.naturalWidth;
    const natH = img.naturalHeight;
    const visW = img.clientWidth;
    const visH = img.clientHeight;

    const scale = Math.min(visW / natW, visH / natH);
    const actW = natW * scale;
    const actH = natH * scale;
    const offX = (visW - actW) / 2;
    const offY = (visH - actH) / 2;

    faces.forEach((f, i) => {
        const [x, y, w, h] = f.bounding_box;
        const isFakeFace = f.score > 0.5;
        const colorHex = isFakeFace ? '#ef4444' : '#10b981';
        
        const boxX = offX + (x * scale);
        const boxY = offY + (y * scale);
        const boxW = w * scale;
        const boxH = h * scale;

        const box = document.createElement('div');
        box.id = `face-box-${i}`;
        box.className = 'absolute border-2 pointer-events-auto cursor-pointer transition-all duration-200';
        box.style.left = `${boxX}px`;
        box.style.top = `${boxY}px`;
        box.style.width = `${boxW}px`;
        box.style.height = `${boxH}px`;
        box.style.borderColor = colorHex;
        if (isFakeFace) {
            box.classList.add('shadow-[0_0_15px_rgba(239,68,68,0.5)]');
        }

        // Label
        const label = document.createElement('div');
        label.className = 'absolute -top-6 left-[-2px] px-2 py-0.5 text-[10px] font-bold text-white whitespace-nowrap rounded-t-md';
        label.style.backgroundColor = colorHex;
        label.textContent = `Face ${i+1}: ${(f.score*100).toFixed(0)}%`;
        
        box.appendChild(label);
        container.appendChild(box);
    });
}

let timelineChartInstance = null;
function drawTimeline(data) {
    const ctx = document.getElementById('timelineChart').getContext('2d');
    if (timelineChartInstance) timelineChartInstance.destroy();
    timelineChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map((_, i) => i + 's'),
            datasets: [{
                label: 'Fake Probability',
                data: data.map(v => (v * 100).toFixed(1)),
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99,102,241,0.1)',
                fill: true,
                tension: 0.3,
                pointRadius: 3,
                pointBackgroundColor: data.map(v => v > 0.5 ? '#ef4444' : '#10b981'),
            }, {
                label: 'Threshold (50%)',
                data: data.map(() => 50),
                borderColor: 'rgba(239,68,68,0.4)',
                borderDash: [5, 5],
                pointRadius: 0,
                fill: false
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { labels: { color: '#94a3b8', font: { size: 11 } } } },
            scales: {
                x: { ticks: { color: '#64748b' }, grid: { color: 'rgba(71,85,105,0.2)' } },
                y: { min: 0, max: 100, ticks: { color: '#64748b', callback: v => v + '%' }, grid: { color: 'rgba(71,85,105,0.2)' } }
            }
        }
    });
}

function showError(msg) {
    document.getElementById('loadingContainer').classList.add('hidden');
    document.getElementById('resultsDashboard').classList.remove('hidden');
    const ring = document.getElementById('ringFill');
    ring.setAttribute('stroke-dashoffset', '534');
    ring.style.stroke = '#64748b';
    document.getElementById('verdictPercent').textContent = 'ERROR';
    document.getElementById('verdictPercent').style.color = '#64748b';
    document.getElementById('verdictTag').textContent = '';
    document.getElementById('verdictLabel').textContent = msg;
}

function resetDashboard() {
    document.getElementById('resultsDashboard').classList.add('hidden');
    document.getElementById('loadingContainer').classList.add('hidden');
    document.getElementById('visionRow').classList.add('hidden');
    document.getElementById('analysisRow').classList.add('hidden');
    document.getElementById('timelineRow').classList.add('hidden');
    document.getElementById('heatmapImg').classList.add('hidden');
    if (document.getElementById('heatmapOrigImg')) {
        document.getElementById('heatmapOrigImg').classList.add('hidden');
    }
    document.getElementById('fftImg').classList.add('hidden');
    document.getElementById('spectrogramImg').classList.add('hidden');
    document.getElementById('spectrogramPlaceholder').classList.add('hidden');
    document.getElementById('uploadedImg').classList.add('hidden');
    document.getElementById('faceList').innerHTML = '';
    document.getElementById('barVisual').style.width = '0%';
    document.getElementById('barAudio').style.width = '0%';
    document.getElementById('barLip').style.width = '0%';
}

function resetUI() {
    resetDashboard();
    document.getElementById('uploadPrompt').classList.remove('hidden');
    document.getElementById('uploadPreview').classList.add('hidden');
    if (uploadedFileObjectURL) { URL.revokeObjectURL(uploadedFileObjectURL); uploadedFileObjectURL = null; }
    fileInput.value = '';
    remoteMediaInfo = null;
    chrome.storage.local.remove(STORAGE_MEDIA_KEY);
}
