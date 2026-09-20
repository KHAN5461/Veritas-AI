'use client';
import React from 'react';
import { Card, Button, Chip } from '@repo/ui';

export default function ApiHubPage() {
  return (
    <div className="p-8 max-w-5xl mx-auto flex flex-col gap-8 w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-on-surface mb-1 flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-[32px]">api</span>
            Enterprise API Hub
          </h1>
          <p className="text-on-surface-variant">Integrate TruthScan models into your security infrastructure.</p>
        </div>
        <Button onClick={() => window.location.assign('/settings')}>Generate API Key</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">data_object</span> POST /v1/detect/media
            </h3>
            <Chip label="99.9% Uptime" variant="filter" className="!bg-primary-container !text-on-primary-container" />
          </div>
          <p className="text-sm text-on-surface-variant">Synchronous detection for images, audio, and video under 50MB.</p>
          <div className="bg-surface-container-highest rounded-2xl p-4 font-mono text-sm overflow-x-auto text-on-surface">
            <span className="text-primary font-semibold">curl</span> -X POST https://api.truthscan.ai/v1/detect/media \<br/>
            &nbsp;&nbsp;-H <span className="text-tertiary">{'"Authorization: Bearer $KEY"'}</span> \<br/>
            &nbsp;&nbsp;-F <span className="text-tertiary">{'"file=@evidence_04.mp4"'}</span>
          </div>
        </Card>

        <Card className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined">queue_play_next</span> POST /v1/detect/batch
            </h3>
            <Chip label="Active" variant="filter" className="!bg-primary-container !text-on-primary-container" />
          </div>
          <p className="text-sm text-on-surface-variant">Asynchronous ingestion endpoint. Returns a job ID for polling.</p>
          <div className="bg-surface-container-highest rounded-2xl p-4 font-mono text-sm overflow-x-auto text-on-surface">
            <span className="text-primary font-semibold">curl</span> -X POST https://api.truthscan.ai/v1/detect/batch \<br/>
            &nbsp;&nbsp;-H <span className="text-tertiary">{'"Authorization: Bearer $KEY"'}</span> \<br/>
            &nbsp;&nbsp;-F <span className="text-tertiary">{'"manifest=@batch_manifest.json"'}</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
