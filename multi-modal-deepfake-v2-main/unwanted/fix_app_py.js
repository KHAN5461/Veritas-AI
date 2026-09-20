const fs = require('fs');
let buf = fs.readFileSync('backend/app.py');
let str = buf.toString('utf-8');
// Replace null bytes
str = str.replace(/\x00/g, '');
// Replace the weird spaced out import requests
str = str.replace(/i m p o r t.*/s, `import requests

def check_desync(file_path):
    try:
        res = requests.post('https://api-inference.huggingface.co/models/deepfake-desync', files={'file': open(file_path, 'rb')})
        return res.json().get('desync_score', 0)
    except:
        return 0
`);
fs.writeFileSync('backend/app.py', str, 'utf-8');
