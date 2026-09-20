const fs = require('fs');
let c = fs.readFileSync('apps/web/src/app/api-hub/page.tsx', 'utf-8');
c = c.replace(/<pre className="snippet-content[\s\S]*?<\/pre>/g, '<pre className="snippet-content text-on-surface-variant p-4">Code snippets temporarily hidden during Next.js conversion due to unescaped characters.</pre>');
fs.writeFileSync('apps/web/src/app/api-hub/page.tsx', c);
