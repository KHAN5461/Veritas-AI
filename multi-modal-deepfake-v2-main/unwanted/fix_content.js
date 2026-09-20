const fs = require('fs');
let c = fs.readFileSync('apps/extension/src/content.ts', 'utf-8');
c = c.replace(/\\\`/g, '`');
fs.writeFileSync('apps/extension/src/content.ts', c);
