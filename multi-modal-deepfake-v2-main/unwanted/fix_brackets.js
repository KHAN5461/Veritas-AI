const fs = require('fs');
let code = fs.readFileSync('apps/web/src/app/api-hub/page.tsx', 'utf-8');

// Replace { and } with HTML entities inside the pre blocks
code = code.replace(/\{ apiKey:/g, '&#123; apiKey:');
code = code.replace(/truthscan\.detect\(\{/g, 'truthscan.detect(&#123;');
code = code.replace(/quarantineThreshold: 0\.85\n\}\)/g, 'quarantineThreshold: 0.85\n&#125;)');

// Check for any other { } in api-hub
code = code.replace(/client\.detect\.analyze_media\(\{/g, 'client.detect.analyze_media(&#123;');

fs.writeFileSync('apps/web/src/app/api-hub/page.tsx', code, 'utf-8');
console.log('Fixed brackets!');
