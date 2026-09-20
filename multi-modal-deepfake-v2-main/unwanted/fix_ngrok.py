import os
f1 = 'index.html'
text1 = open(f1, 'r', encoding='utf-8').read()
text1 = text1.replace("method: 'POST',", "method: 'POST', headers: {'ngrok-skip-browser-warning': 'true'},")
open(f1, 'w', encoding='utf-8').write(text1)

f2 = r'extension\deepfake-detector-extension\sidepanel.js'
text2 = open(f2, 'r', encoding='utf-8').read()
text2 = text2.replace('method: "POST",', 'method: "POST", headers: {"ngrok-skip-browser-warning": "true"},')
open(f2, 'w', encoding='utf-8').write(text2)
