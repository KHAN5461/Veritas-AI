const fs = require('fs');

// Fix analyze
let c = fs.readFileSync('apps/web/src/app/analyze/page.tsx', 'utf-8');
c = c.replace(/\\\`/g, '`');
c = c.replace(/\\\$/g, '$');
fs.writeFileSync('apps/web/src/app/analyze/page.tsx', c);

// Fix api-hub one more time (removing curly brackets completely from code snippet)
let api = fs.readFileSync('apps/web/src/app/api-hub/page.tsx', 'utf-8');
api = api.replace(/TruthScan\(\{ apiKey: process\.env\.TRUTHSCAN_KEY \}\)/g, 'TruthScan(apiKey: process.env.TRUTHSCAN_KEY)');
api = api.replace(/truthscan\.detect\(\{/g, 'truthscan.detect(');
api = api.replace(/quarantineThreshold: 0\.85\n\}\)/g, 'quarantineThreshold: 0.85\n)');
api = api.replace(/client\.detect\.analyze_media\(\{/g, 'client.detect.analyze_media(');
fs.writeFileSync('apps/web/src/app/api-hub/page.tsx', api);
