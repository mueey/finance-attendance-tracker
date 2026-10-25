#!/usr/bin/env sh
cd "$(dirname "$0")" || exit 1
printf '%s\n' 'Trackerist: open http://localhost:8000 in your browser'
python3 -m http.server 8000
