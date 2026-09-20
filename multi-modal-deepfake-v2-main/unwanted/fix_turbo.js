const fs = require('fs');
let c = fs.readFileSync('apps/web/package.json', 'utf-8');
c = c.replace('"dev": "next dev"', '"dev": "next dev --turbopack=false"'); // Or maybe just don't touch package.json and restart it from the root differently
fs.writeFileSync('apps/web/package.json', c);
