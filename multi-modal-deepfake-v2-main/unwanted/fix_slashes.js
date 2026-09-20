const fs = require('fs');
 // wait I don't have glob
const path = require('path');

const files = [
  'packages/ui/src/index.tsx',
  'apps/web/src/app/batch/page.tsx',
  'apps/web/src/app/history/page.tsx',
  'apps/web/src/app/threat-intel/page.tsx',
  'apps/web/src/app/api-hub/page.tsx',
  'apps/web/src/app/analyze/page.tsx'
];

for (const f of files) {
  try {
    let code = fs.readFileSync(path.resolve(__dirname, f), 'utf-8');
    code = code.replace(/\\\`/g, '`');
    code = code.replace(/\\\$/g, '$');
    fs.writeFileSync(path.resolve(__dirname, f), code, 'utf-8');
  } catch (e) {
    console.log('Skipping', f, e.message);
  }
}
console.log('Fixed backslashes globally!');
