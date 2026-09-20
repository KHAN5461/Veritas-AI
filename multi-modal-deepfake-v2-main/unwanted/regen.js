const fs = require('fs');
const path = require('path');

const route = 'api-hub';
const htmlPath = path.join('apps/web/public/screens', `${route}.html`);
let html = fs.readFileSync(htmlPath, 'utf-8');

// Basic JSX conversion
let jsx = html
    .replace(/class=/g, 'className=')
    .replace(/<!--[\s\S]*?-->/g, '') // remove HTML comments
    .replace(/stroke-width/g, 'strokeWidth')
    .replace(/stroke-linecap/g, 'strokeLinecap')
    .replace(/stroke-linejoin/g, 'strokeLinejoin')
    .replace(/fill-rule/g, 'fillRule')
    .replace(/clip-rule/g, 'clipRule')
    .replace(/style="([^"]*)"/g, (match, p1) => {
        const styles = p1.split(';').filter(Boolean).map(s => {
            const [k, v] = s.split(':');
            if (!k || !v) return '';
            const camelK = k.trim().replace(/-([a-z])/g, (g) => g[1].toUpperCase());
            return `${camelK}: '${v.trim()}'`;
        }).filter(Boolean).join(', ');
        return `style={{${styles}}}`;
    });

jsx = jsx.replace(/<(input|img|hr|br|path|circle)([^>]*?)(?<!\/)>/gi, '<$1$2 />');
jsx = jsx.replace(/<svg(.*?)<\/svg>/gs, (match) => match.replace(/<(path|circle)([^>]*?)(?<!\/)>/gi, '<$1$2 />'));
jsx = jsx.replace(/<\/(path|circle|input|img|hr|br)>/gi, '');
jsx = jsx.replace(/viewbox=/gi, 'viewBox=');
jsx = jsx.replace(/fill-opacity=/gi, 'fillOpacity=');
jsx = jsx.replace(/stroke-dasharray=/gi, 'strokeDasharray=');
jsx = jsx.replace(/stroke-opacity=/gi, 'strokeOpacity=');

// FIX THE BAD CODE SNIPPETS SAFELY
jsx = jsx.replace(/\{ apiKey:/g, '&#123; apiKey:');
jsx = jsx.replace(/truthscan\.detect\(\{/g, 'truthscan.detect(&#123;');
jsx = jsx.replace(/quarantineThreshold: 0\.85\n\}\)/g, 'quarantineThreshold: 0.85\n&#125;)');
jsx = jsx.replace(/client\.detect\.analyze_media\(\{/g, 'client.detect.analyze_media(&#123;');
jsx = jsx.replace(/\{report\.confidence_score \* 100:\.2f\}%/g, '{"{"}report.confidence_score * 100:.2f{"}"}%');
jsx = jsx.replace(/\{report\.forensic_biomarkers\.primary_anomaly\}/g, '{"{"}report.forensic_biomarkers.primary_anomaly{"}"}');

const component = `
'use client';
import React from 'react';

export default function ApiHub() {
  return (
    <div>
      ${jsx}
    </div>
  );
}
`;

fs.writeFileSync(`apps/web/src/app/${route}/page.tsx`, component, 'utf-8');
console.log('Regenerated api-hub and fixed brackets safely!');
