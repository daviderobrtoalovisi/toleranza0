"""Server locale che imita GitHub Pages, per provare il sito prima del push.

- Il sito è servito in /toleranza0/, come su GitHub Pages: i percorsi assoluti (/js/...) non funzionano,
  quindi si scoprono subito.
- Maiuscole e minuscole nei nomi dei file contano, come su GitHub Pages (Windows non le distingue).
- Nessuna cache: dopo una modifica basta ricaricare la pagina.

Uso, dalla cartella del progetto:
    python tools/serve.py          (porta 8000)
    python tools/serve.py 8080     (altra porta)
Poi aprire http://localhost:8000/toleranza0/
"""

import http.server
import os
import sys
from urllib.parse import unquote, urlsplit

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PREFIX = '/toleranza0/'

# Tipi espliciti: su Windows il registro può dare text/plain per .js e i moduli ES non partono
TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.nc': 'text/plain; charset=utf-8',
    '.md': 'text/plain; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.ico': 'image/x-icon',
}


def find_exact(relative):
    """Restituisce il percorso del file solo se esiste con le maiuscole/minuscole esatte."""
    current = ROOT
    for part in [p for p in relative.split('/') if p]:
        if part in ('.', '..') or not os.path.isdir(current) or part not in os.listdir(current):
            return None
        current = os.path.join(current, part)
    if os.path.isdir(current):
        index = os.path.join(current, 'index.html')
        return index if 'index.html' in os.listdir(current) else None
    return current


class PagesHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        path = unquote(urlsplit(self.path).path)
        if path in ('/', '/toleranza0'):
            self.send_response(301)
            self.send_header('Location', PREFIX)
            self.end_headers()
            return
        if not path.startswith(PREFIX):
            self.send_error(404, 'Il sito è in /toleranza0/ (come su GitHub Pages)')
            return
        relative = path[len(PREFIX):]
        # Come GitHub Pages: /cartella senza barra finale -> /cartella/
        target = find_exact(relative)
        if target and relative and not relative.endswith('/') and os.path.isdir(os.path.join(ROOT, relative)):
            self.send_response(301)
            self.send_header('Location', path + '/')
            self.end_headers()
            return
        if not target:
            self.send_error(404, f'File non trovato (controlla maiuscole e minuscole): {relative}')
            return
        with open(target, 'rb') as file:
            body = file.read()
        self.send_response(200)
        self.send_header('Content-Type', TYPES.get(os.path.splitext(target)[1].lower(), 'application/octet-stream'))
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(body)


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    server = http.server.ThreadingHTTPServer(('localhost', port), PagesHandler)
    print(f'Simulatore su http://localhost:{port}{PREFIX}')
    print(f'Test su      http://localhost:{port}{PREFIX}tests/')
    print('Ctrl+C per fermare.')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == '__main__':
    main()
