#!/usr/bin/env python3
"""Bundle Lustra into one self-contained HTML file (dist/lustra.html).

Each ES module is wrapped in a function scope; imports become reads from the
exporting module's namespace object. No dependencies, no network.
"""
import re, pathlib, subprocess

ROOT = pathlib.Path(__file__).parent
subprocess.run(['node', str(ROOT / 'tools' / 'gen-meta.mjs')], check=True)
ORDER = ['gems', 'artworks', 'collection2', 'collection3', 'collection4', 'collection5', 'collection6', 'collection7', 'collection8', 'meta', 'store', 'audio', 'board', 'themes', 'app']

def bundle_module(name):
    src = (ROOT / 'js' / f'{name}.js').read_text()
    def imp(m):
        what, mod = m.group(1).strip(), m.group(2)
        ns = f'__m_{mod}'
        if what.startswith('* as '):
            return f'const {what[5:].strip()} = {ns};'
        return f'const {what.replace(" as ", ": ")} = {ns};'
    src = re.sub(r"^import\s+(.+?)\s+from\s+'\./(\w+)\.js';", imp, src, flags=re.M)
    names = re.findall(r'^export\s+(?:async\s+)?(?:function|class|const|let)\s+(\w+)', src, flags=re.M)
    src = re.sub(r'^export\s+', '', src, flags=re.M)
    return f'const __m_{name} = (() => {{\n{src}\nreturn {{ {", ".join(names)} }};\n}})();\n'

html = (ROOT / 'index.html').read_text()
css = (ROOT / 'css' / 'style.css').read_text()
body = re.search(r'<body>(.*?)<script type="module"', html, re.S).group(1)
title = re.search(r'<title>(.*?)</title>', html).group(1)
fonts = '\n'.join(re.findall(r'<link rel="(?:preconnect|stylesheet)" href="https://fonts[^>]*>', html))
js = '\n'.join(bundle_module(m) for m in ORDER)
out = f'''<title>{title}</title>
{fonts}
<meta name="description" content="A calm gem-by-number game: place faceted gemstones into numbered sockets to complete geometric mandalas.">
<style>
{css}
</style>
{body}
<script>
"use strict";
{js}
</script>
'''
(ROOT / 'dist').mkdir(exist_ok=True)
(ROOT / 'dist' / 'lustra.html').write_text(out)
print('dist/lustra.html', len(out), 'bytes')
