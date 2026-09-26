'use client';
import React, { useState } from 'react';
import { Card, Button } from '@repo/ui';
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
    toast.success(`${label} copied to clipboard`);
  };

  const handleGenerateKey = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const newKey = `vrt_live_${Math.random().toString(36).substring(2, 10)}_${Math.random().toString(36).substring(2, 8)}`;
      setGeneratedKey(newKey);
      setIsGenerating(false);
      toast.success('Generated active sandbox API token');
    }, 400);
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
      toast.success('Simulation returned HTTP 200 OK');
    }, 600);
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
	part, _ := writer.CreateFormFile("file", "suspect_video.mp4")
	io.Copy(part, file)
	writer.Close()

	req, _ := http.NewRequest("POST", "https://api.veritas-ai.io/v1/detect/media", body)
	req.Header.Set("Authorization", "Bearer ${generatedKey || "vrt_live_your_api_key_here"}")
	req.Header.Set("Content-Type", writer.FormDataContentType())

	client := &http.Client{}
	resp, _ := client.Do(req)
	fmt.Println("Status:", resp.Status)
}`
  };

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto flex flex-col gap-6 sm:gap-8 w-full pb-32">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-primary text-[28px]">api</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-on-surface">
              Developer API Hub
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-on-surface-variant">
            Integrate multimodal deepfake detection neural networks directly into production workflows.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button 
            variant="filled" 
            onClick={handleGenerateKey} 
            disabled={isGenerating}
            className="text-xs"
          >
            <span className="material-symbols-outlined text-[16px] mr-1.5">key</span>
            {isGenerating ? 'Generating...' : (generatedKey ? 'Regenerate Token' : 'Generate Sandbox Token')}
          </Button>
        </div>
      </div>

      {/* Active Key Banner */}
      <AnimatePresence>
        {generatedKey && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-surface-container-low border border-primary/40 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">vpn_key</span>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wider font-bold text-primary">Active Sandbox Token</p>
                  <p className="font-mono text-xs sm:text-sm text-on-surface font-semibold truncate select-all">{generatedKey}</p>
                </div>
              </div>
              <Button variant="tonal" onClick={() => copyToClipboard(generatedKey, 'API Token')} className="text-xs shrink-0 !py-1.5">
                <span className="material-symbols-outlined text-[16px] mr-1">content_copy</span>
                Copy Token
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Telemetry / SLA Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-surface-container-low border border-outline-variant/30 flex flex-col gap-1 p-4">
          <span className="text-[11px] font-semibold text-on-surface-variant flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-primary">speed</span>
            Average Latency
          </span>
          <span className="text-xl sm:text-2xl font-bold font-mono text-on-surface">240ms</span>
          <span className="text-[11px] text-emerald-400 font-medium">Edge optimized</span>
        </Card>

        <Card className="bg-surface-container-low border border-outline-variant/30 flex flex-col gap-1 p-4">
          <span className="text-[11px] font-semibold text-on-surface-variant flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-emerald-400">check_circle</span>
            Engine Uptime
          </span>
          <span className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">99.98%</span>
          <span className="text-[11px] text-on-surface-variant font-medium">Verified 30-day</span>
        </Card>

        <Card className="bg-surface-container-low border border-outline-variant/30 flex flex-col gap-1 p-4">
          <span className="text-[11px] font-semibold text-on-surface-variant flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-secondary">tune</span>
            Sandbox Quota
          </span>
          <span className="text-xl sm:text-2xl font-bold font-mono text-on-surface">60 req/min</span>
          <span className="text-[11px] text-on-surface-variant font-medium">Burst capacity</span>
        </Card>

        <Card className="bg-surface-container-low border border-outline-variant/30 flex flex-col gap-1 p-4">
          <span className="text-[11px] font-semibold text-on-surface-variant flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-tertiary">hub</span>
            Payload Formats
          </span>
          <span className="text-xl sm:text-2xl font-bold font-mono text-on-surface">MP4, JPG, WAV</span>
          <span className="text-[11px] text-on-surface-variant font-medium">Multi-modal</span>
        </Card>
      </div>

      {/* Code Playground */}
      <Card className="p-0 overflow-hidden bg-surface-container-low border border-outline-variant/30 shadow-sm">
        <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant/20">
          <div>
            <h2 className="text-sm font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">code</span>
              Quickstart SDK Code Snippets
            </h2>
            <p className="text-xs text-on-surface-variant">Production-ready examples for immediate integration.</p>
          </div>
          
          <div className="flex items-center bg-surface-container rounded-xl p-1 gap-1 border border-outline-variant/20 overflow-x-auto">
            {(['curl', 'python', 'javascript', 'go'] as CodeLanguage[]).map((lang) => (
              <button
                key={lang}
                onClick={() => setActiveLang(lang)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-all ${
                  activeLang === lang
                    ? 'bg-primary-container text-on-primary-container shadow-sm font-bold'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {lang === 'javascript' ? 'Node.js' : lang}
              </button>
            ))}
          </div>
        </div>

        <div className="relative bg-surface-container-lowest p-4 sm:p-5 font-mono text-xs text-on-surface overflow-x-auto">
          <div className="absolute top-3 right-3 z-10">
            <Button
              variant="tonal"
              onClick={() => copyToClipboard(codeSnippets[activeLang], 'Snippet')}
              className="text-xs !py-1 !px-2.5"
            >
              <span className="material-symbols-outlined text-[14px] mr-1">content_copy</span>
              Copy
            </Button>
          </div>
          <pre className="text-on-surface-variant whitespace-pre pr-16 leading-relaxed">
            <code>{codeSnippets[activeLang]}</code>
          </pre>
        </div>
      </Card>

      {/* Interactive API Simulator */}
      <Card className="p-5 flex flex-col gap-4 bg-surface-container-low border border-outline-variant/30 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">play_circle</span>
              Interactive Sandbox Tester
            </h3>
            <p className="text-xs text-on-surface-variant">Simulate model inference and examine telemetry deserialization.</p>
          </div>
          <Button 
            variant="filled" 
            onClick={handleSimulateApi} 
            disabled={simulating}
            className="text-xs"
          >
            <span className="material-symbols-outlined text-[16px] mr-1.5">send</span>
            {simulating ? 'Executing...' : 'Test Request'}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">Request Header & Target</span>
            <div className="bg-surface-container rounded-xl p-3.5 font-mono text-xs text-on-surface overflow-x-auto border border-outline-variant/20">
              <p className="text-primary font-semibold">POST /v1/detect/media HTTP/1.1</p>
              <p className="text-on-surface-variant">Host: api.veritas-ai.io</p>
              <p className="text-on-surface-variant">Authorization: Bearer {generatedKey || 'vrt_live_...'}</p>
              <p className="text-on-surface-variant">Content-Type: multipart/form-data</p>
              <p className="mt-1.5 text-secondary">{"[Payload: suspect_media.mp4 (14.2 MB)]"}</p>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">Response Payload</span>
            <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-3.5 font-mono text-xs text-emerald-400 overflow-x-auto min-h-[120px] flex items-center">
              {simulating ? (
                <div className="flex items-center gap-2 text-on-surface-variant mx-auto">
                  <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                  <span>Executing neural pipelines...</span>
                </div>
              ) : simulationResult ? (
                <pre className="w-full text-xs text-on-surface leading-relaxed">
                  <code>{simulationResult}</code>
                </pre>
              ) : (
                <span className="text-on-surface-variant text-xs italic mx-auto">Click &apos;Test Request&apos; to execute live simulation.</span>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
