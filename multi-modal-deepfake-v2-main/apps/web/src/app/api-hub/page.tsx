'use client';
import React, { useState } from 'react';
import { Card, Button, Chip } from '@repo/ui';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

type CodeLanguage = 'curl' | 'python' | 'javascript' | 'go';

export default function ApiHubPage() {
  const [activeLang, setActiveLang] = useState<CodeLanguage>('curl');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string = 'Code') => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const handleGenerateKey = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const newKey = `vrt_live_${Math.random().toString(36).substring(2, 12)}_${Math.random().toString(36).substring(2, 10)}`;
      setGeneratedKey(newKey);
      setIsGenerating(false);
      toast.success('New API key generated successfully!');
    }, 600);
  };

  const handleSimulateApi = () => {
    setSimulating(true);
    setSimulationResult(null);
    setTimeout(() => {
      setSimulating(false);
      setSimulationResult(JSON.stringify({
        status: "success",
        scan_id: "scn_99f2b84a",
        timestamp: new Date().toISOString(),
        verdict: "MANIPULATED",
        confidence: 0.942,
        processing_time_ms: 248,
        models_evaluated: ["ViT-Deepfake-v3", "AudioBiometrics-v2", "FFT-Artifact-Detector"],
        breakdown: {
          visual_manipulation: 0.961,
          audio_synthesis: 0.124,
          sync_anomaly: 0.887
        }
      }, null, 2));
      toast.success("Simulation returned HTTP 200 OK");
    }, 800);
  };

  const codeSnippets: Record<CodeLanguage, string> = {
    curl: `curl -X POST https://api.veritas-ai.io/v1/detect/media \\
  -H "Authorization: Bearer ${generatedKey || 'vrt_live_your_api_key_here'}" \\
  -H "Content-Type: multipart/form-data" \\
  -F "file=@suspect_video.mp4" \\
  -F "sensitivity=high" \\
  -F "models=visual,audio,sync"`,

    python: `import requests

url = "https://api.veritas-ai.io/v1/detect/media"
headers = {
    "Authorization": "Bearer ${generatedKey || 'vrt_live_your_api_key_here'}"
}

with open("suspect_video.mp4", "rb") as f:
    files = {"file": f}
    data = {"sensitivity": "high", "models": "visual,audio,sync"}
    response = requests.post(url, headers=headers, files=files, data=data)

result = response.json()
print(f"Verdict: {result['verdict']} ({result['confidence']*100:.1f}%)")`,

    javascript: `import { readFileSync } from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

const form = new FormData();
form.append('file', readFileSync('suspect_video.mp4'), 'suspect_video.mp4');
form.append('sensitivity', 'high');

const response = await fetch('https://api.veritas-ai.io/v1/detect/media', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ${generatedKey || 'vrt_live_your_api_key_here'}',
    ...form.getHeaders()
  },
  body: form
});

const data = await response.json();
console.log('Detection Verdict:', data.verdict);`,

    go: `package main

import (
	"bytes"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
)

func main() {
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	file, _ := os.Open("suspect_video.mp4")
	defer file.Close()

	part, _ := writer.CreateFormFile("file", "suspect_video.mp4")
	io.Copy(part, file)
	writer.Close()

	req, _ := http.NewRequest("POST", "https://api.veritas-ai.io/v1/detect/media", body)
	req.Header.Set("Authorization", "Bearer ${generatedKey || 'vrt_live_your_api_key_here'}")
	req.Header.Set("Content-Type", writer.FormDataContentType())

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil { panic(err) }
	fmt.Println("Status:", resp.Status)
}`
  };

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto flex flex-col gap-8 w-full pb-28">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-on-surface mb-1 flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-[36px]">api</span>
            Developer & Enterprise API
          </h1>
          <p className="text-on-surface-variant">Integrate state-of-the-art forensic detection models directly into your workflows.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="filled" 
            onClick={handleGenerateKey} 
            disabled={isGenerating}
            className="flex items-center gap-2 shadow-lg shadow-primary/20"
          >
            <span className="material-symbols-outlined text-[18px]">key</span>
            {isGenerating ? 'Generating...' : (generatedKey ? 'Regenerate Key' : 'Generate API Key')}
          </Button>
        </div>
      </div>

      {/* API Key Banner / Generator Display */}
      <AnimatePresence>
        {generatedKey && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-surface-container-high border-2 border-primary/40 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined">vpn_key</span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wider font-semibold text-primary">Your Active Sandbox Key</p>
                  <p className="font-mono text-sm text-on-surface font-semibold truncate select-all">{generatedKey}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="tonal" onClick={() => copyToClipboard(generatedKey, 'API Key')} className="text-xs !py-2 !px-3">
                  <span className="material-symbols-outlined text-[16px] mr-1">content_copy</span>
                  Copy Key
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Telemetry / Quotas Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="flex flex-col gap-1 p-5">
          <span className="text-xs font-semibold text-on-surface-variant flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-primary">speed</span>
            Average Latency
          </span>
          <span className="text-2xl font-bold text-on-surface">240ms</span>
          <span className="text-[11px] text-emerald-400 font-medium">Global CDN edge routing</span>
        </Card>

        <Card className="flex flex-col gap-1 p-5">
          <span className="text-xs font-semibold text-on-surface-variant flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-emerald-400">check_circle</span>
            System Uptime
          </span>
          <span className="text-2xl font-bold text-emerald-400">99.98%</span>
          <span className="text-[11px] text-on-surface-variant font-medium">Last 30-day verified</span>
        </Card>

        <Card className="flex flex-col gap-1 p-5">
          <span className="text-xs font-semibold text-on-surface-variant flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-secondary">tune</span>
            Rate Limit (Sandbox)
          </span>
          <span className="text-2xl font-bold text-on-surface">60 req/min</span>
          <span className="text-[11px] text-on-surface-variant font-medium">Burst capacity enabled</span>
        </Card>

        <Card className="flex flex-col gap-1 p-5">
          <span className="text-xs font-semibold text-on-surface-variant flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-tertiary">hub</span>
            Supported Formats
          </span>
          <span className="text-2xl font-bold text-on-surface">MP4, JPG, WAV</span>
          <span className="text-[11px] text-on-surface-variant font-medium">+12 media codecs</span>
        </Card>
      </div>

      {/* Interactive Code Playground */}
      <Card className="p-0 overflow-hidden border border-outline-variant/40 shadow-xl">
        <div className="bg-surface-container-high px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant/20">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">code</span>
            <div>
              <h2 className="text-lg font-bold text-on-surface">Endpoint Specification & Code SDKs</h2>
              <p className="text-xs text-on-surface-variant">Production-ready snippets for instant forensic integration.</p>
            </div>
          </div>
          
          <div className="flex items-center bg-surface-container rounded-xl p-1 gap-1 border border-outline-variant/30">
            {(['curl', 'python', 'javascript', 'go'] as CodeLanguage[]).map((lang) => (
              <button
                key={lang}
                onClick={() => setActiveLang(lang)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  activeLang === lang
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                }`}
              >
                {lang === 'javascript' ? 'Node.js' : lang}
              </button>
            ))}
          </div>
        </div>

        <div className="relative bg-surface-container-lowest p-6 font-mono text-xs sm:text-sm text-on-surface overflow-x-auto">
          <div className="absolute top-4 right-4 z-10">
            <Button
              variant="tonal"
              onClick={() => copyToClipboard(codeSnippets[activeLang], 'Snippet')}
              className="text-xs !py-1.5 !px-3 shadow-md"
            >
              <span className="material-symbols-outlined text-[15px] mr-1">content_copy</span>
              Copy
            </Button>
          </div>
          <pre className="text-on-surface-variant whitespace-pre">
            <code>{codeSnippets[activeLang]}</code>
          </pre>
        </div>
      </Card>

      {/* Live Interactive API Simulator */}
      <Card className="p-6 flex flex-col gap-6 border border-outline-variant/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">play_circle</span>
              Interactive Sandbox Tester
            </h3>
            <p className="text-sm text-on-surface-variant">Send a mock test request to test payload deserialization and schema responses.</p>
          </div>
          <Button 
            variant="filled" 
            onClick={handleSimulateApi} 
            disabled={simulating}
            className="flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">send</span>
            {simulating ? 'Executing Request...' : 'Send Test Request'}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Request Payload */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Request Headers & Body</span>
            <div className="bg-surface-container-highest rounded-xl p-4 font-mono text-xs text-on-surface overflow-x-auto">
              <p className="text-primary">POST /v1/detect/media HTTP/1.1</p>
              <p className="text-on-surface-variant">Host: api.veritas-ai.io</p>
              <p className="text-on-surface-variant">Authorization: Bearer {generatedKey || 'vrt_live_...'}</p>
              <p className="text-on-surface-variant">Content-Type: multipart/form-data; boundary=----WebKitFormBoundary</p>
              <p className="mt-2 text-tertiary">{"[Payload: synthetic_evidence.mp4 (14.2 MB)]"}</p>
            </div>
          </div>

          {/* Response Payload */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Live Response Preview</span>
            <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-xl p-4 font-mono text-xs text-emerald-400 overflow-x-auto min-h-[140px] flex items-center">
              {simulating ? (
                <div className="flex items-center gap-3 text-on-surface-variant mx-auto">
                  <span className="material-symbols-outlined animate-spin">progress_activity</span>
                  <span>Calling inference clusters...</span>
                </div>
              ) : simulationResult ? (
                <pre className="w-full text-xs text-on-surface">
                  <code>{simulationResult}</code>
                </pre>
              ) : (
                <span className="text-on-surface-variant text-xs italic mx-auto">Click "Send Test Request" above to simulate an endpoint call.</span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Endpoints Documentation Grid */}
      <div>
        <h3 className="text-xl font-bold text-on-surface mb-4">Core Endpoint Directory</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="flex flex-col gap-4 border border-outline-variant/40 hover:border-primary/50 transition-all">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-on-surface flex items-center gap-2">
                <span className="bg-primary/20 text-primary text-xs font-mono px-2 py-1 rounded-md font-bold">POST</span>
                <span className="font-mono text-sm">/v1/detect/media</span>
              </h4>
              <Chip label="Synchronous" variant="filter" className="!bg-primary-container !text-on-primary-container !text-xs" />
            </div>
            <p className="text-sm text-on-surface-variant">Instant sub-second detection for single image, audio clip, or video up to 50MB.</p>
            <div className="flex items-center gap-4 text-xs text-on-surface-variant font-mono">
              <span>Status: <strong className="text-emerald-400">200 OK</strong></span>
              <span>Content: <strong>application/json</strong></span>
            </div>
          </Card>

          <Card className="flex flex-col gap-4 border border-outline-variant/40 hover:border-primary/50 transition-all">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-on-surface flex items-center gap-2">
                <span className="bg-secondary/20 text-secondary text-xs font-mono px-2 py-1 rounded-md font-bold">POST</span>
                <span className="font-mono text-sm">/v1/detect/batch</span>
              </h4>
              <Chip label="Asynchronous" variant="filter" className="!bg-secondary-container !text-on-secondary-container !text-xs" />
            </div>
            <p className="text-sm text-on-surface-variant">Enqueue multiple media objects for scheduled pipeline analysis. Returns job UUID for status polling.</p>
            <div className="flex items-center gap-4 text-xs text-on-surface-variant font-mono">
              <span>Status: <strong className="text-emerald-400">202 Accepted</strong></span>
              <span>Webhooks: <strong>Supported</strong></span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
