const fs = require('fs');

const pngBuffer = fs.readFileSync('apps/web/public/logo.png');
const base64Data = pngBuffer.toString('base64');
const dataUri = `data:image/png;base64,${base64Data}`;

const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3b82f6" stop-opacity="1" />
      <stop offset="100%" stop-color="#a855f7" stop-opacity="1" />
    </linearGradient>
    <mask id="mymask" maskUnits="userSpaceOnUse" x="0" y="0" width="512" height="512" style="mask-type: alpha;">
      <image href="${dataUri}" width="512" height="512" preserveAspectRatio="xMidYMid meet" />
    </mask>
  </defs>
  <rect width="512" height="512" fill="url(#grad)" mask="url(#mymask)" />
</svg>`;

fs.writeFileSync('apps/web/public/favicon.svg', svgContent);
fs.writeFileSync('apps/web/public/icon.svg', svgContent);
console.log('SVG Favicon generated successfully!');
