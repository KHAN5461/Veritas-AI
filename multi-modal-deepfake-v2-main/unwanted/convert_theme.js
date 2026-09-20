const fs = require('fs');

let configStr = fs.readFileSync('apps/web/tailwind_config_from_stitch.js', 'utf-8');
// Mock tailwind.config object
let tailwind = {};
eval(configStr);

const config = tailwind.config;
const extend = config.theme.extend;

let themeLines = ['@theme inline {'];

// colors
if (extend.colors) {
    for (const [k, v] of Object.entries(extend.colors)) {
        themeLines.push(`  --color-${k}: ${v};`);
    }
}
// radius
if (extend.borderRadius) {
    for (const [k, v] of Object.entries(extend.borderRadius)) {
        const name = k === 'DEFAULT' ? '' : `-${k}`;
        themeLines.push(`  --radius${name}: ${v};`);
    }
}
// spacing
if (extend.spacing) {
    for (const [k, v] of Object.entries(extend.spacing)) {
        themeLines.push(`  --spacing-${k}: ${v};`);
    }
}
// fontFamily
if (extend.fontFamily) {
    for (const [k, v] of Object.entries(extend.fontFamily)) {
        themeLines.push(`  --font-${k}: ${v[0]};`);
    }
}
// fontSize (ignore lineHeight/letterSpacing for minimal setup, or convert them if necessary)
// Note: tailwind v4 sets text sizes using --text-<name>: <size>;
if (extend.fontSize) {
    for (const [k, v] of Object.entries(extend.fontSize)) {
        themeLines.push(`  --text-${k}: ${v[0]};`);
        if (v[1] && v[1].lineHeight) {
            themeLines.push(`  --text-${k}--line-height: ${v[1].lineHeight};`);
        }
        if (v[1] && v[1].fontWeight) {
            themeLines.push(`  --text-${k}--font-weight: ${v[1].fontWeight};`);
        }
        if (v[1] && v[1].letterSpacing) {
            themeLines.push(`  --text-${k}--letter-spacing: ${v[1].letterSpacing};`);
        }
    }
}

themeLines.push('}\n');

const globalsPath = 'apps/web/src/app/globals.css';
let globalsCss = fs.readFileSync(globalsPath, 'utf-8');
// replace existing @theme if needed, or just append
globalsCss += '\n\n' + themeLines.join('\n');
fs.writeFileSync(globalsPath, globalsCss, 'utf-8');
console.log('Converted tailwind config to @theme inline and appended to globals.css!');
