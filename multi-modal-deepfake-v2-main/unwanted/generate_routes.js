const fs = require('fs');
const path = require('path');

const routes = ['history', 'batch', 'api-hub', 'threat-intel'];

routes.forEach(route => {
    const dir = `apps/web/src/app/${route}`;
    fs.mkdirSync(dir, { recursive: true });
    
    const content = `import fs from 'fs';
import path from 'path';

export default function Page() {
    const htmlPath = path.join(process.cwd(), 'public', 'screens', '${route}.html');
    const html = fs.readFileSync(htmlPath, 'utf-8');
    
    return (
        <div dangerouslySetInnerHTML={{ __html: html }} suppressHydrationWarning />
    );
}
`;
    fs.writeFileSync(path.join(dir, 'page.tsx'), content, 'utf-8');
});

console.log('Created routes!');
