import urllib.request, re, os

urls = {
    'history': 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1YmFlYjdlMmM1MzkwMWE2Mjg0MGMwMDZkOTM1EgsSBxChicSmtxAYAZIBIwoKcHJvamVjdF9pZBIVQhMxOTQ1NDkzMzAzNDYyODYxNTA1&filename=&opi=89354086',
    'batch': 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1YmFlYjVhNzU3NTYwMWE2MzFiMTYyMDE4ODM4EgsSBxChicSmtxAYAZIBIwoKcHJvamVjdF9pZBIVQhMxOTQ1NDkzMzAzNDYyODYxNTA1&filename=&opi=89354086',
    'api-hub': 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1YmFlYjY3MzRiYzQwNzNhZWRiN2YxMjRmNTlmEgsSBxChicSmtxAYAZIBIwoKcHJvamVjdF9pZBIVQhMxOTQ1NDkzMzAzNDYyODYxNTA1&filename=&opi=89354086',
    'threat-intel': 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1YmFlYjVkMzYzODIwMmE5YjM4OWQwMTcwOTlkEgsSBxChicSmtxAYAZIBIwoKcHJvamVjdF9pZBIVQhMxOTQ1NDkzMzAzNDYyODYxNTA1&filename=&opi=89354086'
}

os.makedirs('apps/web/public/screens', exist_ok=True)

for name, url in urls.items():
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        html = urllib.request.urlopen(req).read().decode('utf-8')
        match = re.search(r'<body[^>]*>(.*?)</body>', html, re.IGNORECASE | re.DOTALL)
        body_content = match.group(1) if match else html
        
        body_content = re.sub(r'<script.*?</script>', '', body_content, flags=re.IGNORECASE | re.DOTALL)
        
        with open(f'apps/web/public/screens/{name}.html', 'w', encoding='utf-8') as f:
            f.write(body_content)
        print(f"Downloaded {name}")
    except Exception as e:
        print(f"Failed {name}: {e}")
