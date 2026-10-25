@echo off
cd /d "%~dp0"
echo Trackerist: open http://localhost:8000 in your browser
where py >nul 2>nul
if %errorlevel%==0 (
  py -m http.server 8000
) else (
  python -m http.server 8000
)
pause
