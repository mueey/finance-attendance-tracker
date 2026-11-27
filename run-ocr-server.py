#!/usr/bin/env python3
"""Serve Trackerist and run local Tesseract OCR without cloud/API keys.
Run: python run-ocr-server.py (requires the tesseract executable on PATH).
Binds to 127.0.0.1 only. Photos are processed in a temporary file and deleted.
"""
import os
import shutil
import subprocess
import tempfile
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
MAX_IMAGE_BYTES = 8 * 1024 * 1024
IMAGE_TYPES = {'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/bmp': '.bmp', 'image/tiff': '.tiff'}

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_POST(self):
        if self.path != '/api/ocr':
            self.send_error(404, 'Unknown endpoint')
            return
        origin = self.headers.get('Origin', '')
        if origin and origin not in (f'http://{self.headers.get("Host", "")}',):
            self.send_error(403, 'Cross-origin OCR not allowed')
            return
        mime = self.headers.get('Content-Type', '').split(';')[0].strip().lower()
        if mime not in IMAGE_TYPES:
            self.send_error(415, 'Upload a PNG, JPG, WEBP, BMP, or TIFF image')
            return
        try:
            length = int(self.headers.get('Content-Length', '0'))
        except ValueError:
            length = 0
        if not 0 < length <= MAX_IMAGE_BYTES:
            self.send_error(413, 'Image must be between 1 byte and 8 MB')
            return
        data = self.rfile.read(length)
        if len(data) != length:
            self.send_error(400, 'Incomplete image')
            return
        if not shutil.which('tesseract'):
            self.send_error(503, 'Tesseract OCR is not installed on this computer')
            return
        path = None
        try:
            with tempfile.NamedTemporaryFile(suffix=IMAGE_TYPES[mime], delete=False) as f:
                path = f.name
                f.write(data)
            result = subprocess.run(['tesseract', path, 'stdout', '-l', 'eng', '--psm', '6'],
                                    capture_output=True, text=True, timeout=45, check=False)
            if result.returncode:
                self.send_error(422, 'OCR failed: check photo format and quality')
                return
            import json
            output = json.dumps({'text': result.stdout}, ensure_ascii=False).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Cache-Control', 'no-store')
            self.send_header('Content-Length', str(len(output)))
            self.end_headers()
            self.wfile.write(output)
        except subprocess.TimeoutExpired:
            self.send_error(504, 'Photo recognition took too long')
        finally:
            if path:
                try: os.unlink(path)
                except OSError: pass

if __name__ == '__main__':
    print('Trackerist local OCR server at http://127.0.0.1:8000')
    print('OCR engine:', shutil.which('tesseract') or 'NOT INSTALLED (image upload still opens; OCR will not work)')
    print('No photos are uploaded to a cloud service. Press Ctrl+C to stop.')
    ThreadingHTTPServer(('127.0.0.1', 8000), Handler).serve_forever()
