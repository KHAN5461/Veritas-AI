import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

write_file('apps/web/src/app/layout.tsx', '''import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Deepfake Detector",
  description: "Multimodal Deepfake Detector",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
''')

write_file('apps/web/src/app/page.tsx', '''import { Card, Button } from '@repo/ui';
import { BatchUploader } from '../components/BatchUploader';

export default function Home() {
  return (
    <main className="min-h-screen p-24 bg-black text-white">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold">Multi-Modal Deepfake v2</h1>
        <Card>
          <h2 className="text-2xl">Analysis Dashboard</h2>
          <p className="mt-4">Upload media or run a batch analysis to verify authenticity.</p>
          <div className="mt-6">
            <Button>Upload File</Button>
          </div>
        </Card>
        <BatchUploader />
      </div>
    </main>
  );
}
''')

write_file('apps/web/src/components/BatchUploader.tsx', '''import { Card, Button, CircularProgress } from '@repo/ui';

export function BatchUploader() {
  return (
    <Card className="mt-8">
      <h3 className="text-xl font-bold mb-4">Batch Processing</h3>
      <div className="flex items-center gap-4 border-2 border-dashed border-white/20 p-8 rounded-xl justify-center text-gray-400">
        <p>Drag and drop multiple files here</p>
        <Button>Select Files</Button>
      </div>
      <div className="mt-4 space-y-2">
        <div className="flex justify-between items-center bg-white/5 p-2 rounded">
          <span className="truncate max-w-xs">video1.mp4</span>
          <CircularProgress />
        </div>
        <div className="flex justify-between items-center bg-white/5 p-2 rounded">
          <span className="truncate max-w-xs">audio2.mp3</span>
          <span className="text-green-400">Real (98%)</span>
        </div>
      </div>
    </Card>
  );
}
''')

write_file('apps/web/src/app/api/detect/route.ts', '''import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const res = await fetch('http://127.0.0.1:8000/detect', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: 'Backend proxy failed' }, { status: 500 });
  }
}
''')

write_file('packages/ui/src/index.tsx', '''export const Button = ({ children, className }: any) => <button className={`bg-primary text-white backdrop-blur-md bg-white/10 p-2 rounded-xl ${className}`}>{children}</button>;''')
write_file('packages/ui/src/Card.tsx', '''export const Card = ({ children, className }: any) => <div className={`bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 shadow-lg ${className}`}>{children}</div>;''')
write_file('packages/ui/src/Skeleton.tsx', '''export const Skeleton = ({ className }: any) => <div className={`animate-pulse bg-white/20 rounded-xl ${className}`} />;''')
write_file('packages/ui/src/CircularProgress.tsx', '''export const CircularProgress = () => <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />;''')
write_file('packages/ui/src/main.ts', "export * from './index';\nexport * from './Card';\nexport * from './Skeleton';\nexport * from './CircularProgress';\n")

write_file('apps/extension/src/sidepanel.tsx', '''import React from 'react';
import ReactDOM from 'react-dom/client';
import { Card, Button, CircularProgress } from '@repo/ui';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <div className="p-4 flex flex-col gap-4">
      <Card>
        <h2 className="text-lg font-bold">Sidepanel UI</h2>
        <p>Running multi-modal analysis</p>
        <CircularProgress />
      </Card>
    </div>
  </React.StrictMode>
);
''')

write_file('apps/extension/src/main.tsx', '''import React from 'react';
import ReactDOM from 'react-dom/client';
import { Card, Button } from '@repo/ui';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <div className="p-4 w-64">
      <Card>
        <h2 className="text-lg font-bold">Popup UI</h2>
        <Button>Analyze Current Page</Button>
      </Card>
    </div>
  </React.StrictMode>
);
''')

write_file('apps/extension/src/background.ts', '''chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });
  }
});
''')

write_file('apps/extension/src/content.ts', '''const injectButtons = () => {
  const videos = document.querySelectorAll('video');
  videos.forEach(video => {
    if (video.nextElementSibling?.classList.contains('df-verify-btn')) return;
    const btn = document.createElement('button');
    btn.innerText = 'Verify Deepfake';
    btn.className = 'df-verify-btn';
    btn.style.cssText = 'position: absolute; z-index: 9999; background: #005cbb; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; opacity: 0.8;';
    btn.onclick = () => alert('Sending to verification proxy...');
    video.parentElement?.insertBefore(btn, video.nextSibling);
  });
};
injectButtons();
''')

write_file('apps/extension/index.html', '''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Deepfake Detector Popup</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
''')

write_file('apps/extension/sidepanel.html', '''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Deepfake Detector Sidepanel</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/sidepanel.tsx"></script>
</body>
</html>
''')
