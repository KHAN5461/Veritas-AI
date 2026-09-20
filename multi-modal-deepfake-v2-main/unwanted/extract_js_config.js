const fs = require('fs');

async function run() {
    const url = 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1YmFlYjdlMmM1MzkwMWE2Mjg0MGMwMDZkOTM1EgsSBxChicSmtxAYAZIBIwoKcHJvamVjdF9pZBIVQhMxOTQ1NDkzMzAzNDYyODYxNTA1&filename=&opi=89354086';
    const res = await fetch(url);
    const html = await res.text();
    
    const match = html.match(/<script id="tailwind-config">([\s\S]*?)<\/script>/i);
    if (match) {
        fs.writeFileSync('apps/web/tailwind_config_from_stitch.js', match[1], 'utf-8');
        console.log('Saved config to tailwind_config_from_stitch.js');
    }
}
run();
