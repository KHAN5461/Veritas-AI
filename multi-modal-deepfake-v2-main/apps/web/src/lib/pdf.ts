/* eslint-disable @typescript-eslint/no-explicit-any */
import domToImage from 'dom-to-image';
import { PDFDocument } from 'pdf-lib';
import { toast } from 'sonner';
import { generateAiForensicSummary } from '../components/report/AiSummaryCard';

// A4 at 96 DPI: 794 × 1123px. PDF points at 72 DPI: 595 × 842pt.
const A4_PX_W = 794;
const A4_PX_H = 1123;
const A4_PT_W = 595;
const A4_PT_H = 842;
const TOTAL_PAGES = 4;

/* ───────────────────────── Capture helpers (unchanged behaviour) ───────────────────────── */

/** Wait for all <img> tags inside an element to complete loading/decoding */
async function waitForImages(el: HTMLElement): Promise<void> {
  const images = Array.from(el.querySelectorAll('img'));
  await Promise.all(
    images.map(img => {
      if (img.complete && img.naturalWidth !== 0) return Promise.resolve();
      return new Promise<void>(resolve => {
        const timeout = setTimeout(() => resolve(), 1500);
        img.onload = () => { clearTimeout(timeout); resolve(); };
        img.onerror = () => { clearTimeout(timeout); resolve(); };
      });
    })
  );
}

/** Pre-resolve an image URL (blob, relative, or remote) to an inline base64 data URL */
async function resolveImageAsDataUrl(url?: string): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith('data:')) return url;
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(typeof reader.result === 'string' ? reader.result : null);
      };
      reader.onerror = () => resolve(url);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn('Could not resolve image to base64 data URL:', err);
    return url;
  }
}

/**
 * Build an approximate attention overlay when the backend did not return one.
 * This is a visual stand-in, not model output; the report labels it as illustrative.
 */
async function generateFallbackHeatmap(imageUrl: string | null, isFake: boolean): Promise<string | null> {
  if (!imageUrl || typeof window === 'undefined') return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 400;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);

        // Draw desaturated base image
        ctx.drawImage(img, 0, 0, 400, 400);
        const imgData = ctx.getImageData(0, 0, 400, 400);
        const d = imgData.data;
        for (let i = 0; i < d.length; i += 4) {
          const lum = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
          d[i] = lum * 0.5;
          d[i + 1] = lum * 0.5;
          d[i + 2] = lum * 0.6;
        }
        ctx.putImageData(imgData, 0, 0);

        // Apply thermal activation gradient
        ctx.globalCompositeOperation = 'screen';
        const grad = ctx.createRadialGradient(200, isFake ? 180 : 200, 25, 200, 200, isFake ? 175 : 130);

        if (isFake) {
          grad.addColorStop(0, 'rgba(220, 38, 38, 0.95)');
          grad.addColorStop(0.3, 'rgba(249, 115, 22, 0.78)');
          grad.addColorStop(0.55, 'rgba(234, 179, 8, 0.58)');
          grad.addColorStop(0.8, 'rgba(6, 182, 212, 0.38)');
          grad.addColorStop(1, 'rgba(15, 23, 42, 0.05)');
        } else {
          grad.addColorStop(0, 'rgba(59, 130, 246, 0.5)');
          grad.addColorStop(0.5, 'rgba(6, 182, 212, 0.28)');
          grad.addColorStop(1, 'rgba(16, 185, 129, 0.06)');
        }
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 400, 400);

        resolve(canvas.toDataURL('image/png'));
      } catch (e) {
        console.warn('Fallback heatmap generation failed:', e);
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = imageUrl;
  });
}

/** Capture a DOM node at exactly A4 width and return a PNG data URL */
async function captureSection(el: HTMLElement): Promise<string> {
  await waitForImages(el);
  const height = el.offsetHeight || A4_PX_H;
  return domToImage.toPng(el, {
    bgcolor: '#ffffff',
    width: A4_PX_W,
    height: height,
    style: {
      position: 'relative',
      top: '0',
      left: '0',
      margin: '0',
      opacity: '1',
      transform: 'none',
    },
  });
}

/** Build and append a temporary container positioned offscreen */
function mountHidden(): [HTMLDivElement, () => void] {
  const wrap = document.createElement('div');
  wrap.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: ${A4_PX_W}px;
    z-index: -9999;
    opacity: 1;
    pointer-events: none;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    background: #ffffff;
    color: #1a1f2b;
    line-height: 1.4;
  `;
  document.body.appendChild(wrap);
  return [wrap, () => {
    if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
  }];
}

/* ───────────────────────── Types ───────────────────────── */

export interface PdfReportData {
  result: any;
  fileData: { name: string; type: string; size: number; url?: string };
  fileHash: string;
  timestamp: string;
  analystName?: string;
  caseTag?: string;
  investigatorNotes?: string;
}

interface ResolvedPdfData extends PdfReportData {
  resolvedFileUrl: string | null;
  resolvedHeatmapUrl: string | null;
  /** True when the heatmap was approximated locally instead of returned by the model */
  heatmapIsSynthetic: boolean;
  resolvedLogoUrl: string | null;
}

/* ───────────────────────── Design tokens ─────────────────────────
 * Direction: a serious, readable case file. Serif headlines and figures carry the
 * personality; a quiet sans does the work. Colour is reserved for meaning:
 * red = flagged, green = clear, indigo = structure. The verdict panel on page 1
 * is the one loud element; everything else stays restrained.
 */
const C = {
  ink: '#1a1f2b',
  slate: '#4d5668',
  mute: '#7d8697',
  rule: '#d9dde5',
  panel: '#f3f5f8',
  accent: '#2a3f9d',
  alert: '#b42318',
  alertSoft: '#fbeceb',
  ok: '#17703f',
  okSoft: '#e8f4ec',
} as const;

const SERIF = `Georgia,'Times New Roman',serif`;
const SANS = `-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif`;
const MONO = `ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Courier New',monospace`;

const PAGE_STYLE = `position:relative;width:${A4_PX_W}px;height:${A4_PX_H}px;max-height:${A4_PX_H}px;background:#ffffff;padding:40px 48px 30px;box-sizing:border-box;font-family:${SANS};color:${C.ink};overflow:hidden;display:flex;flex-direction:column;`;

/** Score above this value counts as flagged */
const FLAG_THRESHOLD = 50;

/* ───────────────────────── Small utilities ───────────────────────── */

const esc = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return 'Unknown size';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** Convert a 0–1 model score to a 0–100 number, or null when the model did not supply one */
function toPercent(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.min(100, Math.max(0, value * 100));
}

/* ───────────────────────── Derived report context ───────────────────────── */

type MediaKind = 'image' | 'video' | 'audio' | 'other';

interface SignalView {
  label: string;
  check: string;
  value: number | null;
  flaggedText: string;
  clearText: string;
}

interface ReportContext {
  isFake: boolean;
  pct: number;
  lowConfidence: boolean;
  fg: string;
  soft: string;
  shortId: string;
  caseId: string;
  fileName: string;
  kind: MediaKind;
  analyst: string;
  signals: SignalView[];
  measured: number;
  flagged: number;
}

function deriveContext(data: ResolvedPdfData): ReportContext {
  const { result, fileData, fileHash, analystName } = data;
  const isFake = Boolean(result?.is_fake);
  const rawConf = typeof result?.confidence === 'number' ? result.confidence : 0;
  const pct = Math.min(100, Math.max(0, rawConf > 1 ? rawConf : rawConf * 100));
  const shortId = fileHash ? fileHash.substring(0, 12).toUpperCase() : 'UNSIGNED';
  const type = fileData.type || '';
  const kind: MediaKind = type.startsWith('image/')
    ? 'image'
    : type.startsWith('video/')
      ? 'video'
      : type.startsWith('audio/')
        ? 'audio'
        : 'other';

  const signals: SignalView[] = [
    {
      label: 'Face and boundary patches',
      check: 'Edges, lighting and skin texture across the image.',
      value: toPercent(result?.breakdown?.visual_score),
      flaggedText: 'Blending seams or lighting mismatches around the face.',
      clearText: 'Edges, lighting and skin texture look consistent.',
    },
    {
      label: 'Camera sensor noise',
      check: 'The fine noise pattern a real camera sensor leaves behind.',
      value: toPercent(result?.chrominance_noise),
      flaggedText: 'The noise pattern is missing or uneven, as in generated images.',
      clearText: 'The noise pattern is consistent with a real camera.',
    },
    {
      label: 'Eye reflections',
      check: 'Whether both eyes reflect the same light source.',
      value: toPercent(result?.corneal_concordance),
      flaggedText: 'The reflections in the two eyes do not match.',
      clearText: 'The reflections in both eyes agree.',
    },
    {
      label: 'Lip sync',
      check: 'Whether mouth movement matches the speech.',
      value: toPercent(result?.breakdown?.lip_sync_score),
      flaggedText: 'Mouth movement drifts out of step with the audio.',
      clearText: 'Mouth movement matches the audio.',
    },
    {
      label: 'Voice',
      check: 'Voice texture and phase continuity in the audio track.',
      value: toPercent(result?.breakdown?.audio_score),
      flaggedText: 'The voice shows artefacts typical of synthetic speech.',
      clearText: 'No synthetic-voice artefacts found.',
    },
  ];

  const measuredSignals = signals.filter(s => s.value !== null);
  const flagged = measuredSignals.filter(s => (s.value as number) > FLAG_THRESHOLD).length;

  return {
    isFake,
    pct,
    lowConfidence: pct < 75,
    fg: isFake ? C.alert : C.ok,
    soft: isFake ? C.alertSoft : C.okSoft,
    shortId,
    caseId: `VRTS-${shortId}`,
    fileName: fileData.name || 'Untitled file',
    kind,
    analyst: analystName || 'Veritas AI Sentinel v2.5',
    signals,
    measured: measuredSignals.length,
    flagged,
  };
}

/* ───────────────────────── Audio illustrations ─────────────────────────
 * These are drawn from fixed formulas, not from the uploaded audio. Pages label them
 * as illustrations. Swap in real PCM / STFT data here when the backend returns it.
 */

function renderAudioWaveformSvg(isFake: boolean): string {
  const bars: string[] = [];
  for (let i = 0; i < 48; i++) {
    const h = 10 + Math.abs(Math.sin(i * 0.3) * 75) + ((i * 13) % 18);
    const y = 95 - h / 2;
    const col = isFake ? (i % 5 === 0 ? C.alert : '#e57368') : C.accent;
    bars.push(`<rect x="${i * 6.5 + 8}" y="${y}" width="4.2" height="${h}" fill="${col}" rx="1.5"/>`);
  }
  return `
    <svg width="100%" viewBox="0 0 326 190" fill="none" style="display:block">
      <rect width="326" height="190" fill="${C.panel}"/>
      ${bars.join('')}
      <line x1="8" y1="95" x2="318" y2="95" stroke="${C.rule}" stroke-width="1" stroke-dasharray="2 2"/>
    </svg>
  `;
}

function renderAudioSpectrogramSvg(isFake: boolean): string {
  const rects: string[] = [];
  const slices = 32;
  const bins = 16;
  for (let s = 0; s < slices; s++) {
    for (let b = 0; b < bins; b++) {
      const freqRatio = 1 - b / bins;
      let val = Math.sin(s * 0.45 + b * 0.38) * 0.5 + 0.5;
      if (isFake) {
        if (freqRatio > 0.65) val = Math.max(val, 0.88);
        if (b === 8) val = 0.95;
      } else {
        val *= Math.exp(-freqRatio * 1.5);
      }
      const r = Math.min(255, Math.floor(val * 280));
      const g = Math.min(255, Math.floor(Math.max(0, val - 0.35) * 350));
      const bCol = Math.min(255, Math.floor(Math.sin(val * Math.PI) * 160));
      rects.push(`<rect x="${s * 9.5 + 10}" y="${b * 9.5 + 14}" width="8.5" height="8.5" fill="rgb(${r},${g},${bCol})" rx="1"/>`);
    }
  }
  return `
    <svg width="100%" viewBox="0 0 326 190" fill="none" style="display:block">
      <rect width="326" height="190" fill="${C.ink}"/>
      ${rects.join('')}
    </svg>
  `;
}

/* ───────────────────────── Shared page parts ───────────────────────── */

function renderRunningHead(section: string, logoUrl: string | null): string {
  return `
    <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:12px;border-bottom:1px solid ${C.rule};margin-bottom:28px">
      <div style="display:flex;align-items:center;gap:9px">
        ${logoUrl ? `<img src="${logoUrl}" style="width:22px;height:22px;object-fit:contain" alt="" />` : ''}
        <span style="font-family:${SERIF};font-size:15px;font-weight:700;letter-spacing:0.01em">Veritas AI</span>
      </div>
      <span style="font-size:10.5px;color:${C.slate}">${esc(section)}</span>
    </div>
  `;
}

function renderPageTitle(title: string, standfirst: string): string {
  return `
    <div style="margin-bottom:26px">
      <div style="font-family:${SERIF};font-size:29px;font-weight:700;line-height:1.15;letter-spacing:-0.01em">${esc(title)}</div>
      <div style="font-size:12px;color:${C.slate};line-height:1.55;margin-top:8px;max-width:540px">${esc(standfirst)}</div>
    </div>
  `;
}

function renderSectionHeading(text: string): string {
  return `<div style="font-family:${SERIF};font-size:17px;font-weight:700;margin-bottom:10px">${esc(text)}</div>`;
}

function renderFooter(pageNum: number, ctx: ReportContext): string {
  return `
    <div style="margin-top:auto;border-top:1px solid ${C.rule};padding-top:9px;display:flex;align-items:center;justify-content:space-between;font-size:9px;color:${C.mute}">
      <span>Veritas AI report, case ${esc(ctx.caseId)}</span>
      <span>Page ${pageNum} of ${TOTAL_PAGES}</span>
    </div>
  `;
}

function renderFacts(rows: Array<[string, string]>): string {
  return rows
    .map(
      ([label, value], i) => `
        <div style="display:grid;grid-template-columns:104px 1fr;gap:12px;padding:10px 0;${i === 0 ? `border-top:1px solid ${C.ink};` : ''}border-bottom:1px solid ${C.rule}">
          <div style="font-size:10px;color:${C.slate}">${esc(label)}</div>
          <div style="font-size:11px;font-weight:600;line-height:1.4;word-break:break-word">${value}</div>
        </div>`
    )
    .join('');
}

function renderSignalRow(s: SignalView): string {
  const measured = s.value !== null;
  const value = s.value ?? 0;
  const flagged = measured && value > FLAG_THRESHOLD;
  const color = !measured ? C.mute : flagged ? C.alert : C.ok;
  const status = !measured ? 'Not measured' : flagged ? 'Flagged' : 'Clear';
  const sentence = !measured
    ? 'This file did not provide the data this check needs.'
    : flagged
      ? s.flaggedText
      : s.clearText;

  return `
    <div style="display:grid;grid-template-columns:236px 1fr;gap:28px;padding:14px 0;border-bottom:1px solid ${C.rule}">
      <div>
        <div style="font-size:12.5px;font-weight:700;line-height:1.3">${esc(s.label)}</div>
        <div style="font-size:9.5px;color:${C.slate};line-height:1.5;margin-top:3px">${esc(s.check)}</div>
      </div>
      <div>
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:7px">
          <span style="font-size:10.5px;font-weight:700;color:${color}">${status}</span>
          <span style="font-family:${SERIF};font-size:19px;font-weight:700;color:${color}">${measured ? `${value.toFixed(1)}%` : 'n/a'}</span>
        </div>
        <div style="position:relative;height:10px">
          <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:${C.panel};border-radius:5px;overflow:hidden">
            <div style="height:100%;width:${measured ? value : 0}%;background:${color}"></div>
          </div>
          <div style="position:absolute;left:50%;top:-3px;width:2px;height:16px;background:${C.ink}"></div>
        </div>
        <div style="font-size:9.5px;color:${C.slate};line-height:1.5;margin-top:7px">${esc(sentence)}</div>
      </div>
    </div>
  `;
}

/* ───────────────────────── Page 1: Verdict ───────────────────────── */

function buildPage1(data: ResolvedPdfData): HTMLElement {
  const { fileData, timestamp, resolvedFileUrl, resolvedLogoUrl, caseTag } = data;
  const ctx = deriveContext(data);
  const { isFake, pct, fg, soft } = ctx;

  const headline = isFake
    ? 'This media is likely manipulated or AI-generated.'
    : 'This media is likely authentic.';

  const signalLine = ctx.measured
    ? `${ctx.flagged} of ${ctx.measured} measured ${ctx.measured === 1 ? 'signal' : 'signals'} flagged`
    : 'No signal scores were returned for this file';

  const nextStep = isFake
    ? 'Do not publish or share this media as genuine. Keep the original file and its case ID, and ask a second reviewer to check the flagged signals on the next page.'
    : 'No signal crossed the flag threshold. Before publishing, still confirm where the file came from and when it was captured, because a clean result does not prove a file is genuine.';

  const preview =
    ctx.kind === 'audio'
      ? renderAudioWaveformSvg(isFake)
      : resolvedFileUrl
        ? `<img src="${resolvedFileUrl}" style="max-width:100%;max-height:330px;object-fit:contain" alt="" />`
        : `<span style="font-size:10.5px;color:${C.mute}">No preview available for this file</span>`;

  const facts: Array<[string, string]> = [
    ['File', esc(ctx.fileName)],
    ['Type and size', `${esc(fileData.type || 'Unknown type')}, ${esc(formatBytes(fileData.size))}`],
    ['Analysed', esc(timestamp)],
    ['Examiner', esc(ctx.analyst)],
    ...(caseTag ? ([['Case tag', esc(caseTag)]] as Array<[string, string]>) : []),
    ['Case ID', `<span style="font-family:${MONO};font-size:10.5px">${esc(ctx.caseId)}</span>`],
  ];

  const el = document.createElement('div');
  el.style.cssText = PAGE_STYLE;
  el.innerHTML = `
    ${renderRunningHead('Media authenticity report', resolvedLogoUrl)}

    <div style="border-left:6px solid ${fg};background:${soft};padding:28px 32px 26px;border-radius:2px 8px 8px 2px">
      <div style="font-size:11px;font-weight:700;color:${fg};word-break:break-all">Result for ${esc(ctx.fileName)}</div>
      <div style="font-family:${SERIF};font-size:38px;line-height:1.12;font-weight:700;letter-spacing:-0.015em;margin-top:10px;max-width:560px">${headline}</div>

      <div style="display:flex;align-items:flex-end;gap:30px;margin-top:26px">
        <div>
          <div style="font-family:${SERIF};font-size:64px;line-height:0.95;font-weight:700;color:${fg}">${pct.toFixed(1)}<span style="font-size:30px">%</span></div>
          <div style="font-size:10.5px;color:${C.slate};margin-top:7px">confidence in this result</div>
        </div>
        <div style="flex:1;padding-bottom:4px">
          <div style="position:relative;height:10px;background:rgba(26,31,43,0.10);border-radius:5px;overflow:hidden">
            <div style="position:absolute;top:0;left:0;bottom:0;width:${pct}%;background:${fg};border-radius:5px"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:9px;color:${C.slate};margin-top:5px">
            <span>0%</span><span>100%</span>
          </div>
          <div style="font-size:11px;font-weight:600;margin-top:8px">${esc(signalLine)}</div>
        </div>
      </div>

      ${
        ctx.lowConfidence
          ? `<div style="margin-top:20px;font-size:10.5px;line-height:1.5;background:rgba(255,255,255,0.75);padding:9px 12px;border-radius:4px">Confidence is moderate. Treat this as a lead to investigate, not a conclusion.</div>`
          : ''
      }
    </div>

    <div style="display:grid;grid-template-columns:300px 1fr;gap:34px;margin-top:30px">
      <div>
        <div style="height:330px;background:${C.panel};border:1px solid ${C.rule};border-radius:6px;display:flex;align-items:center;justify-content:center;overflow:hidden">
          ${preview}
        </div>
        <div style="font-size:9.5px;color:${C.slate};margin-top:7px">${ctx.kind === 'audio' ? 'Illustrative waveform, not computed from this recording' : 'Submitted file'}</div>
      </div>
      <div>
        ${renderSectionHeading('Case details')}
        ${renderFacts(facts)}
      </div>
    </div>

    <div style="margin-top:32px;padding-top:20px;border-top:1px solid ${C.rule}">
      ${renderSectionHeading('What to do next')}
      <div style="font-size:12px;line-height:1.65;max-width:580px">${esc(nextStep)}</div>
    </div>

    ${renderFooter(1, ctx)}
  `;
  return el;
}

/* ───────────────────────── Page 2: Findings ───────────────────────── */

function buildPage2(data: ResolvedPdfData): HTMLElement {
  const { result, fileData, resolvedLogoUrl, investigatorNotes } = data;
  const ctx = deriveContext(data);
  const aiSummary = generateAiForensicSummary(result, ctx.isFake, ctx.pct, fileData.name);

  const el = document.createElement('div');
  el.style.cssText = PAGE_STYLE;
  el.innerHTML = `
    ${renderRunningHead('Findings', resolvedLogoUrl)}
    ${renderPageTitle(
      'What the analysis found',
      `Each signal is scored from 0 to 100. A score above ${FLAG_THRESHOLD} is flagged and counts toward the result. The black tick on each bar marks that threshold.`
    )}

    <div style="border-top:1px solid ${C.ink}">
      ${ctx.signals.map(renderSignalRow).join('')}
    </div>

    <div style="margin-top:28px">
      ${renderSectionHeading('Summary')}
      ${
        investigatorNotes
          ? `<div style="border-left:3px solid ${C.accent};padding:2px 0 2px 12px;margin-bottom:12px;font-size:11px;line-height:1.55;max-width:580px">
               <div style="font-size:9.5px;font-weight:700;color:${C.accent};margin-bottom:3px">Investigator note</div>
               ${esc(investigatorNotes)}
             </div>`
          : ''
      }
      <div style="font-size:11px;line-height:1.65;max-width:600px;color:${C.ink}">
        ${aiSummary.executiveNarrative}
      </div>
    </div>

    ${renderFooter(2, ctx)}
  `;
  return el;
}

/* ───────────────────────── Page 3: Visual evidence ───────────────────────── */

function buildPage3(data: ResolvedPdfData): HTMLElement {
  const { resolvedFileUrl, resolvedHeatmapUrl, heatmapIsSynthetic, resolvedLogoUrl } = data;
  const ctx = deriveContext(data);
  const isAudio = ctx.kind === 'audio';

  const frame = (inner: string) => `
    <div style="height:430px;background:${C.panel};border:1px solid ${C.rule};border-radius:6px;display:flex;align-items:center;justify-content:center;overflow:hidden">
      ${inner}
    </div>`;

  const image = (src: string | null, fallback: string) =>
    src
      ? `<img src="${src}" style="max-width:100%;max-height:430px;object-fit:contain" alt="" />`
      : `<span style="font-size:10.5px;color:${C.mute}">${esc(fallback)}</span>`;

  const figure = (title: string, caption: string, inner: string) => `
    <div>
      ${frame(inner)}
      <div style="font-size:12px;font-weight:700;margin-top:10px">${esc(title)}</div>
      <div style="font-size:9.5px;color:${C.slate};line-height:1.5;margin-top:3px">${esc(caption)}</div>
    </div>`;

  const figureA = isAudio
    ? figure('Waveform', 'Illustrative rendering. It is not computed from this recording.', renderAudioWaveformSvg(ctx.isFake))
    : figure('Submitted file', 'Shown as received, with no edits applied.', image(resolvedFileUrl, 'No preview available for this file'));

  const figureB = isAudio
    ? figure('Spectrogram', 'Illustrative rendering. It is not computed from this recording.', renderAudioSpectrogramSvg(ctx.isFake))
    : figure(
        'Attention map',
        heatmapIsSynthetic
          ? 'Illustrative overlay. The model did not return an attention map for this file, so this view is approximated and does not show where manipulation occurred.'
          : 'Warmer colours mark the regions that influenced the result most.',
        image(resolvedHeatmapUrl, 'No attention map available')
      );

  const legend =
    !isAudio && resolvedHeatmapUrl && !heatmapIsSynthetic
      ? `<div style="margin-top:22px;max-width:340px">
           <div style="height:8px;border-radius:4px;background:linear-gradient(90deg,#2b6cb0,#06b6d4,#eab308,#f97316,#dc2626)"></div>
           <div style="display:flex;justify-content:space-between;font-size:9px;color:${C.slate};margin-top:4px"><span>Lower influence</span><span>Higher influence</span></div>
         </div>`
      : '';

  const guidance: Array<[string, string]> = isAudio
    ? [
        ['Regular, repeating bands', 'Synthetic voices can leave unusually regular patterns across frequencies.'],
        ['Smooth transitions', 'Natural speech varies irregularly from one sound to the next.'],
        ['Listen as well', 'Play the recording and compare what you hear with what the spectrogram suggests.'],
      ]
    : [
        ['Concentrated hot spots', 'Strong colour around the face outline, mouth or eyes can point to blending or generation artefacts.'],
        ['Evenly spread colour', 'When no single region stands out, the result rests on overall texture rather than one visible flaw.'],
        ['Check at full size', 'Compare the map with the submitted file before drawing conclusions. It shows influence, not proof.'],
      ];

  const el = document.createElement('div');
  el.style.cssText = PAGE_STYLE;
  el.innerHTML = `
    ${renderRunningHead('Visual evidence', resolvedLogoUrl)}
    ${renderPageTitle(
      'Visual evidence',
      isAudio
        ? 'The submitted audio shown as a waveform and a spectrogram.'
        : 'The submitted file beside the regions the model weighted most when reaching its result.'
    )}

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
      ${figureA}
      ${figureB}
    </div>
    ${legend}

    <div style="margin-top:30px;padding-top:20px;border-top:1px solid ${C.rule}">
      ${renderSectionHeading('How to read these')}
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:24px">
        ${guidance
          .map(
            ([title, text]) => `
              <div>
                <div style="font-size:11.5px;font-weight:700;margin-bottom:4px">${esc(title)}</div>
                <div style="font-size:10px;color:${C.slate};line-height:1.55">${esc(text)}</div>
              </div>`
          )
          .join('')}
      </div>
    </div>

    ${renderFooter(3, ctx)}
  `;
  return el;
}

/* ───────────────────────── Page 4: Method and record ───────────────────────── */

function buildPage4(data: ResolvedPdfData): HTMLElement {
  const { result, fileData, fileHash, timestamp, resolvedLogoUrl } = data;
  const ctx = deriveContext(data);

  const hasC2pa = Boolean(result?.provenance?.has_c2pa);
  const hasAiProv = Boolean(result?.provenance?.has_ai_provenance);

  const statusRow = (label: string, status: string, color: string, note: string) => `
    <div style="padding:10px 0;border-bottom:1px solid ${C.rule}">
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:16px">
        <span style="font-size:11.5px;font-weight:700">${esc(label)}</span>
        <span style="font-size:10.5px;font-weight:700;color:${color}">${esc(status)}</span>
      </div>
      <div style="font-size:9.5px;color:${C.slate};line-height:1.5;margin-top:3px">${esc(note)}</div>
    </div>`;

  const steps: Array<[string, string]> = [
    ['Ingest and normalise', 'Validate the file and prepare it for analysis.'],
    ['Extract features', 'Take face crops at several scales and audio spectrograms.'],
    ['Scan with neural models', 'Score attention patterns and high-frequency residuals.'],
    ['Fuse the scores', 'Combine the signals into one calibrated confidence.'],
  ];

  const limitations = [
    'The model is calibrated on media compressed by social platforms. Screenshots and heavy re-compression can lower reliability.',
    'A score is evidence to weigh. It is not proof of how a file was made.',
    'Lip-sync and voice checks apply only when the file contains video or audio.',
    'Missing provenance data is common and is not evidence of manipulation.',
  ];

  const signLine = (value: string, label: string) => `
    <div>
      <div style="height:46px;display:flex;align-items:flex-end;font-size:12px;font-weight:600;padding-bottom:5px;border-bottom:1px solid ${C.ink}">${value}</div>
      <div style="font-size:9.5px;color:${C.slate};margin-top:5px">${esc(label)}</div>
    </div>`;

  const el = document.createElement('div');
  el.style.cssText = PAGE_STYLE;
  el.innerHTML = `
    ${renderRunningHead('Method and record', resolvedLogoUrl)}
    ${renderPageTitle(
      'How this result was produced',
      'Provenance checks, file integrity, method and limits, with space for a human reviewer to sign.'
    )}

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:34px">
      <div>
        ${renderSectionHeading('Provenance')}
        <div style="border-top:1px solid ${C.ink}">
          ${statusRow(
            'Content credentials (C2PA)',
            hasC2pa ? 'Present' : 'None found',
            hasC2pa ? C.ok : C.slate,
            hasC2pa ? 'A signed manifest was found in the file.' : 'The file carries no signed provenance record.'
          )}
          ${statusRow(
            'AI generator tag',
            hasAiProv ? 'Declared' : 'None found',
            hasAiProv ? C.alert : C.slate,
            hasAiProv ? 'The file metadata says it was made with generative AI.' : 'No generator tag appears in the file metadata.'
          )}
        </div>
      </div>
      <div>
        ${renderSectionHeading('File integrity')}
        <div style="border-top:1px solid ${C.ink};padding-top:10px">
          <div style="font-size:10px;color:${C.slate};margin-bottom:5px">SHA-256 fingerprint</div>
          <div style="font-family:${MONO};font-size:8.5px;line-height:1.5;word-break:break-all;background:${C.panel};border:1px solid ${C.rule};border-radius:4px;padding:8px 10px">${esc(fileHash || 'Not available')}</div>
          <div style="font-size:9.5px;color:${C.slate};line-height:1.5;margin-top:8px">${esc(formatBytes(fileData.size))}, analysed ${esc(timestamp)}</div>
        </div>
      </div>
    </div>

    <div style="margin-top:30px;padding-top:20px;border-top:1px solid ${C.rule}">
      ${renderSectionHeading('Method')}
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:20px">
        ${steps
          .map(
            ([title, text], i) => `
              <div>
                <div style="font-family:${SERIF};font-size:24px;font-weight:700;color:${C.accent};line-height:1">${i + 1}</div>
                <div style="font-size:11px;font-weight:700;margin:6px 0 3px">${esc(title)}</div>
                <div style="font-size:9.5px;color:${C.slate};line-height:1.5">${esc(text)}</div>
              </div>`
          )
          .join('')}
      </div>
      <div style="font-size:9.5px;color:${C.slate};margin-top:14px">Model: Veritas Sentinel v2.5. Decision threshold: 0.50. Libraries: TorchVision, Librosa.</div>
    </div>

    <div style="margin-top:26px;padding-top:20px;border-top:1px solid ${C.rule}">
      ${renderSectionHeading('Limitations')}
      <div style="font-size:10.5px;line-height:1.6;max-width:600px">
        ${limitations.map(l => `<div style="display:flex;gap:8px;margin-bottom:4px"><span style="color:${C.mute}">•</span><span>${esc(l)}</span></div>`).join('')}
      </div>
    </div>

    <div style="margin-top:28px">
      ${renderSectionHeading('Reviewer sign-off')}
      <div style="display:grid;grid-template-columns:1.3fr 1fr 0.6fr;gap:28px">
        ${signLine(esc(ctx.analyst), 'Examiner')}
        ${signLine('', 'Signature')}
        ${signLine('', 'Date')}
      </div>
      <div style="font-size:9px;color:${C.mute};line-height:1.5;margin-top:14px;max-width:600px">
        This is an automated assessment produced by Veritas AI. It supports, and does not replace, review by a qualified person. Check the source and context of any media before relying on it for editorial or legal decisions.
      </div>
    </div>

    ${renderFooter(4, ctx)}
  `;
  return el;
}

/* ───────────────────────── Export ───────────────────────── */

/**
 * Capture the forensic report as a 4-page A4 PDF:
 * verdict, findings, visual evidence, method and record.
 */
export async function downloadPDF(
  _contentId: string,
  filename = 'veritas_forensic_report.pdf',
  reportData?: PdfReportData
): Promise<void> {
  if (!reportData) {
    toast.error('Forensic report data is not available for PDF export');
    return;
  }

  toast.loading(`Compiling ${TOTAL_PAGES}-page forensic report PDF…`, { id: 'pdf-toast' });

  const [wrap, cleanup] = mountHidden();

  try {
    // 1. Pre-resolve evidence photo and Veritas AI logo to base64
    const resolvedFileUrl = await resolveImageAsDataUrl(reportData.fileData?.url);
    const resolvedLogoUrl = await resolveImageAsDataUrl('/logo.png');

    // 2. Use the model's attention map, or approximate one and flag it as illustrative
    let resolvedHeatmapUrl: string | null = null;
    let heatmapIsSynthetic = false;
    if (reportData.result?.heatmap) {
      const rawHm = reportData.result.heatmap;
      if (rawHm.startsWith('data:')) {
        resolvedHeatmapUrl = rawHm;
      } else if (rawHm.startsWith('blob:') || rawHm.startsWith('http')) {
        resolvedHeatmapUrl = await resolveImageAsDataUrl(rawHm);
      } else {
        resolvedHeatmapUrl = `data:image/png;base64,${rawHm}`;
      }
    }

    if (!resolvedHeatmapUrl && resolvedFileUrl) {
      resolvedHeatmapUrl = await generateFallbackHeatmap(resolvedFileUrl, Boolean(reportData.result?.is_fake));
      heatmapIsSynthetic = Boolean(resolvedHeatmapUrl);
    }

    const resolvedData: ResolvedPdfData = {
      ...reportData,
      resolvedFileUrl,
      resolvedHeatmapUrl,
      heatmapIsSynthetic,
      resolvedLogoUrl,
    };

    const pdfDoc = await PDFDocument.create();
    const builders = [buildPage1, buildPage2, buildPage3, buildPage4];

    for (const build of builders) {
      const section = build(resolvedData);
      wrap.innerHTML = '';
      wrap.appendChild(section);

      // Allow DOM to settle and image to decode
      await new Promise(r => setTimeout(r, 120));

      const dataUrl = await captureSection(wrap);

      const img = new Image();
      img.src = dataUrl;
      await new Promise(r => img.onload = r);

      // Scale captured image into A4 page
      const scale = A4_PT_W / img.width;
      const scaledH = img.height * scale;

      const page = pdfDoc.addPage([A4_PT_W, Math.max(A4_PT_H, scaledH)]);
      const pngImage = await pdfDoc.embedPng(dataUrl);
      page.drawImage(pngImage, {
        x: 0,
        y: page.getHeight() - scaledH,
        width: A4_PT_W,
        height: scaledH,
      });
    }

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`${TOTAL_PAGES}-page forensic report PDF generated!`, { id: 'pdf-toast' });
  } catch (error) {
    console.error('PDF generation error:', error);
    toast.error('Failed to generate PDF', { id: 'pdf-toast' });
  } finally {
    cleanup();
  }
}
