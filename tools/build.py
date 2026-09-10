from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]
s=root/'sections'
parts=['_head.html']+json.loads((s/'order.json').read_text())+['_scripts.html']
(root/'index.html').write_text('\n'.join((s/p).read_text() for p in parts),encoding='utf-8')
print('Built index.html from',len(parts),'section files')
