import re
with open('apps/extension/src/sidepanel.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('\\`', '`').replace('\\$', '$')

with open('apps/extension/src/sidepanel.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
