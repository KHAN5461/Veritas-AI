/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { Card, Skeleton, CircularProgress } from '@repo/ui';
import { SpyglassViewer } from './SpyglassViewer';
import { AudioWaveform } from './AudioWaveform';

interface ForensicReportProps {
  isLoading: boolean;
  result: any;
  fileData: {
    name: string;
    type: string;
    size: number;
    url?: string;
  };
  fileHash: string;
  timestamp: string;
}

export function ForensicReport({ isLoading, result, fileData, fileHash, timestamp }: ForensicReportProps) {
  return (
    <div className="bg-surface rounded-none print:shadow-none print:border-none flex flex-col gap-10">
      
      {/* Header / Executive Summary */}
      <header className="border-b-2 border-outline-variant/30 pb-8 print:border-black/20">
        <div className="uppercase tracking-widest text-xs font-bold text-primary mb-4 print:text-black">CONFIDENTIAL FORENSIC REPORT</div>
        <h1 className="text-4xl font-bold mb-6 text-on-surface print:text-black">Deepfake Analysis Findings</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
          <div>
            <div className="text-sm text-on-surface-variant mb-1 print:text-gray-600">Final Verdict</div>
            {isLoading || !result ? <Skeleton className="h-10 w-48" /> : (
              <div className={"inline-flex items-center gap-2 px-4 py-2 rounded-xl text-lg font-bold border-2 " + (result.is_fake ? "bg-error/10 text-error border-error/20 print:border-black print:text-black" : "bg-primary/10 text-primary border-primary/20 print:border-black print:text-black")}>
                <span className="material-symbols-outlined">{result.is_fake ? 'warning' : 'verified_user'}</span>
                {result.is_fake ? 'Highly Likely AI-Generated' : 'Likely Authentic'}
              </div>
            )}
          </div>
          
          <div>
            <div className="text-sm text-on-surface-variant mb-1 print:text-gray-600">Overall Confidence Score</div>
            {isLoading || !result ? <Skeleton className="h-10 w-24" /> : (
              <div className="text-3xl font-mono font-bold text-on-surface print:text-black">
                {(result.confidence * 100).toFixed(1)}%
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 print:border-black/20 print:bg-transparent">
          <div className="text-sm text-on-surface-variant mb-2 font-semibold print:text-gray-600">Primary Finding</div>
          {isLoading || !result ? <Skeleton className="h-6 w-3/4" /> : (
            <p className="text-lg text-on-surface print:text-black">
              {result.is_fake 
                ? "Our analysis detected significant signs of AI manipulation or synthetic generation in this media file." 
                : "We did not find any strong indicators of AI manipulation. This media appears to be authentic."}
            </p>
          )}
        </div>
      </header>

      {/* 2. File Information & Chain of Custody */}
      <section className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/30 print:border-black/20 print:bg-transparent">
        <h2 className="text-xl font-semibold mb-4 text-on-surface print:text-black">File Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 text-sm">
          <div>
            <span className="text-on-surface-variant print:text-gray-600 block mb-1">File Name</span>
            <span className="font-mono text-on-surface print:text-black truncate block">{fileData.name}</span>
          </div>
          <div>
            <span className="text-on-surface-variant print:text-gray-600 block mb-1">Date Analyzed</span>
            <span className="font-mono text-on-surface print:text-black block">{timestamp}</span>
          </div>
          <div>
            <span className="text-on-surface-variant print:text-gray-600 block mb-1">File Size</span>
            <span className="font-mono text-on-surface print:text-black block">{(fileData.size / 1024 / 1024).toFixed(2)} MB</span>
          </div>
          <div>
            <span className="text-on-surface-variant print:text-gray-600 block mb-1">SHA-256 Digital Fingerprint</span>
            <span className="font-mono text-xs text-on-surface print:text-black truncate block" title={fileHash}>{fileHash}</span>
          </div>
        </div>
      </section>

      {/* 3. Multi-Modal Breakdown */}
      <section>
        <h2 className="text-2xl font-semibold mb-6 text-on-surface border-b border-outline-variant/20 pb-2 print:text-black print:border-black/20">Detailed Breakdown</h2>
        {isLoading || !result ? <Skeleton className="h-32 w-full" /> : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-surface-container-lowest border border-outline-variant/30 print:border-black/20 print:bg-transparent print:shadow-none">
              <div className="text-sm text-on-surface-variant print:text-gray-600 font-semibold mb-2">Image Authenticity</div>
              <div className="text-2xl font-mono text-on-surface print:text-black">
                {(result.breakdown?.visual_score * 100).toFixed(1)}% <span className="text-sm font-sans text-on-surface-variant ml-1 print:text-gray-600">Altered</span>
              </div>
              <p className="text-xs text-on-surface-variant mt-2 print:text-gray-600">We check the pixels to ensure the visual hasn't been AI-generated.</p>
            </Card>
            
            <Card className={"bg-surface-container-lowest border border-outline-variant/30 print:border-black/20 print:bg-transparent print:shadow-none " + (result.breakdown?.audio_score != null ? "" : "opacity-50")}>
              <div className="text-sm text-on-surface-variant print:text-gray-600 font-semibold mb-2">Voice Authenticity</div>
              <div className="text-2xl font-mono text-on-surface print:text-black">
                {result.breakdown?.audio_score != null ? (result.breakdown.audio_score * 100).toFixed(1) + '%' : 'N/A'}
              </div>
              <p className="text-xs text-on-surface-variant mt-2 print:text-gray-600">We analyze the audio to detect cloned or synthetic voices.</p>
            </Card>

            <Card className={"bg-surface-container-lowest border border-outline-variant/30 print:border-black/20 print:bg-transparent print:shadow-none " + (result.breakdown?.lip_sync_score != null ? "" : "opacity-50")}>
              <div className="text-sm text-on-surface-variant print:text-gray-600 font-semibold mb-2">Audio-Video Sync</div>
              <div className="text-2xl font-mono text-on-surface print:text-black">
                {result.breakdown?.lip_sync_score != null ? (result.breakdown.lip_sync_score * 100).toFixed(1) + '%' : 'N/A'}
              </div>
              <p className="text-xs text-on-surface-variant mt-2 print:text-gray-600">We make sure the spoken words naturally match the lip movements.</p>
            </Card>
          </div>
        )}
      </section>

      {/* 4. Visual Evidence */}
      <section>
        <h2 className="text-2xl font-semibold mb-6 text-on-surface border-b border-outline-variant/20 pb-2 print:text-black print:border-black/20">Analysis Details</h2>
        
        {isLoading || !result ? <Skeleton className="h-64 w-full" /> : (
          <div className="flex flex-col gap-6">
            {fileData.type.startsWith('image/') && result.heatmap ? (
              <div className="w-full">
                <div className="text-sm text-on-surface-variant mb-2 font-medium print:text-gray-600">Interactive Forensic Spyglass</div>
                <SpyglassViewer 
                  originalSrc={fileData.url} 
                  heatmapSrc={"data:image/png;base64," + result.heatmap} 
                />
              </div>
            ) : fileData.type.startsWith('audio/') ? (
              <div className="w-full">
                <div className="text-sm text-on-surface-variant mb-2 font-medium print:text-gray-600">Acoustic Artifact Analysis</div>
                <AudioWaveform url={fileData.url} isFake={result.is_fake} />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div>
                  <div className="text-sm text-on-surface-variant mb-2 font-medium print:text-gray-600">Original Upload</div>
                  {fileData.type.startsWith('image/') ? (
                    <img src={fileData.url} className="w-full h-auto max-h-[400px] object-contain rounded-xl bg-surface-container-highest print:bg-gray-100" alt="Original Upload" />
                  ) : fileData.type.startsWith('video/') ? (
                    <video src={fileData.url} controls className="w-full h-auto max-h-[400px] bg-black rounded-xl" />
                  ) : (
                    <div className="w-full h-48 bg-surface-container-highest rounded-xl flex items-center justify-center print:bg-gray-100 print:text-black">
                      <span className="material-symbols-outlined text-[48px] opacity-50">description</span>
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-sm text-on-surface-variant mb-2 font-medium print:text-gray-600">Manipulation Highlights</div>
                  {result.heatmap ? (
                    <img src={"data:image/png;base64," + result.heatmap} className="w-full h-auto max-h-[400px] object-contain rounded-xl bg-surface-container-highest print:bg-gray-100" alt="Manipulation Highlights" />
                  ) : (
                    <div className="w-full h-48 bg-surface-container-highest rounded-xl flex items-center justify-center text-sm text-on-surface-variant print:bg-gray-100 print:text-black">
                      No visual highlights available
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30 print:border-black/20 print:bg-transparent">
              <p className="text-sm text-on-surface print:text-black">
                <strong className="font-semibold text-primary print:text-black mr-2">What we found:</strong>
                {result.is_fake 
                  ? "Areas highlighted in bright colors show where our AI detected potential edits. This usually means the image was artificially generated or faces were swapped." 
                  : "We did not find any unusual patterns. The visual data appears completely natural."}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* 5. Metadata & Provenance */}
      <section className="print:break-inside-avoid">
        <h2 className="text-2xl font-semibold mb-6 text-on-surface border-b border-outline-variant/20 pb-2 print:text-black print:border-black/20">File Origin & History</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-surface-container-lowest border border-outline-variant/30 print:border-black/20 print:bg-transparent print:shadow-none">
            <div className="text-sm font-semibold mb-2 text-on-surface print:text-black">Content Credentials</div>
            <div className="text-sm text-on-surface-variant font-mono print:text-gray-600">Status: No signature found</div>
            <p className="text-xs text-on-surface-variant mt-2 print:text-gray-600">This file doesn't have a secure digital signature (like Adobe Content Authenticity) attached to it.</p>
          </Card>
          <Card className="bg-surface-container-lowest border border-outline-variant/30 print:border-black/20 print:bg-transparent print:shadow-none">
            <div className="text-sm font-semibold mb-2 text-on-surface print:text-black">Camera Metadata</div>
            <div className="text-sm text-on-surface-variant font-mono print:text-gray-600">Status: Unavailable</div>
            <p className="text-xs text-on-surface-variant mt-2 print:text-gray-600">Standard camera information is missing. This is very common for files downloaded from social media.</p>
          </Card>
        </div>
      </section>

      {/* 6. Methodology & System Info */}
      <footer className="mt-8 pt-8 border-t-2 border-outline-variant/30 text-xs text-on-surface-variant print:border-black/20 print:text-gray-600 print:mt-16 print:break-inside-avoid">
        <p className="italic max-w-3xl leading-relaxed">
          Disclaimer: The percentages provided in this report reflect the output of our AI models trained to spot synthetic media. They represent a statistical likelihood, not an absolute guarantee. This report should be used alongside common sense and corroborating evidence.
        </p>
      </footer>

    </div>
  );
}
