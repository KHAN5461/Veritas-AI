import re
with open('apps/extension/src/sidepanel.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

replacement = '''alt="Heatmap" />
                    )}
                    <button onClick={() => window.open('http://localhost:3000/analyze', '_blank')} className="mt-2 w-full py-1 text-center bg-[#38bdf8]/10 text-[#38bdf8] hover:bg-[#38bdf8]/20 transition-colors rounded">View Full Report in Web Dashboard</button>'''

c = c.replace('alt="Heatmap" />\n                    )}', replacement)

with open('apps/extension/src/sidepanel.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
