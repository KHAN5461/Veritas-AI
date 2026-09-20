const fs = require('fs');
const path = require('path');

const urls = {
    'history': 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1YmFlYjdlMmM1MzkwMWE2Mjg0MGMwMDZkOTM1EgsSBxChicSmtxAYAZIBIwoKcHJvamVjdF9pZBIVQhMxOTQ1NDkzMzAzNDYyODYxNTA1&filename=&opi=89354086',
    'batch': 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1YmFlYjVhNzU3NTYwMWE2MzFiMTYyMDE4ODM4EgsSBxChicSmtxAYAZIBIwoKcHJvamVjdF9pZBIVQhMxOTQ1NDkzMzAzNDYyODYxNTA1&filename=&opi=89354086',
    'api-hub': 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1YmFlYjY3MzRiYzQwNzNhZWRiN2YxMjRmNTlmEgsSBxChicSmtxAYAZIBIwoKcHJvamVjdF9pZBIVQhMxOTQ1NDkzMzAzNDYyODYxNTA1&filename=&opi=89354086',
    'threat-intel': 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1YmFlYjVkMzYzODIwMmE5YjM4OWQwMTcwOTlkEgsSBxChicSmtxAYAZIBIwoKcHJvamVjdF9pZBIVQhMxOTQ1NDkzMzAzNDYyODYxNTA1&filename=&opi=89354086'
};

fs.mkdirSync('apps/web/public/screens', { recursive: true });

async function run() {
    for (const [name, url] of Object.entries(urls)) {
        try {
            const res = await fetch(url);
            const html = await res.text();
            
            const match = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
            let body = match ? match[1] : html;
            body = body.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
            
            fs.writeFileSync(`apps/web/public/screens/${name}.html`, body, 'utf-8');
            console.log(`Downloaded ${name}`);
        } catch (e) {
            console.error(`Failed ${name}:`, e);
        }
    }
}

run();
