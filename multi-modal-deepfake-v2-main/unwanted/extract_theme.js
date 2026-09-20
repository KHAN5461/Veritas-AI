const fs = require('fs');

async function run() {
    const url = 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1YmFlYjdlMmM1MzkwMWE2Mjg0MGMwMDZkOTM1EgsSBxChicSmtxAYAZIBIwoKcHJvamVjdF9pZBIVQhMxOTQ1NDkzMzAzNDYyODYxNTA1&filename=&opi=89354086';
    const res = await fetch(url);
    const html = await res.text();
    
    const matches = html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi);
    let allStyles = '';
    for (const match of matches) {
        allStyles += '\n\n' + match[1];
    }
    
    const globalsPath = 'apps/web/src/app/globals.css';
    let globalsCss = fs.readFileSync(globalsPath, 'utf-8');
    globalsCss += allStyles;
    fs.writeFileSync(globalsPath, globalsCss, 'utf-8');
    console.log('Appended styles!');
}
run();
