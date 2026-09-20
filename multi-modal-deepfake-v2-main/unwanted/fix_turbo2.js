const fs = require('fs');
let c = fs.readFileSync('apps/web/package.json', 'utf-8');
c = c.replace('"dev": "next dev"', '"dev": "next dev --webpack"');
fs.writeFileSync('apps/web/package.json', c);
