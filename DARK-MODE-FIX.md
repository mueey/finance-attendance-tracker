# Trackerist 3.7 — Dark Mode Fix

This release fixes inconsistent dark styling in the Trackerist 3.6 interface.

## What changed

- The saved Light/Dark preference is applied before the main stylesheet loads.
- Bootstrap color variables and Trackerist-specific colors now use a consistent palette.
- Fixed dark backgrounds and contrast for the header, dashboard cards, financial snapshot,
  calendar, search results, form fields, semester pop-ups, attendance indicators,
  status badges, and floating mobile bottom navigation.
- The theme toggle updates the UI immediately and saves the choice locally.
- Privacy Policy and Credits pages use the saved theme from the start.
- Offline cache version was advanced to `trackerist-v3.7.0`.
- No saved attendance, account, fines, payment, or schedule data was intentionally changed.

## Updating a GitHub Pages deployment

1. **Back up data** from Trackerist Settings → Download JSON Backup.
2. Extract the ZIP and upload the contents of `trackerist-2/` to your active GitHub branch.
3. Include `index.html`, `css/theme.css`, `js/core/theme.js`, `sw.js`, `privacy.html`,
   `credits.html`, and all unchanged project files. The ZIP is a complete app.
4. Commit, wait for GitHub Pages to finish deploying, and open the live site while online.
5. Reload after the new service worker installs. If the previous appearance persists,
   close all open Trackerist tabs and reopen the site. Do not clear site data without
   first exporting a backup: browser storage holds your attendance and payment records.

## Verification

- `npm test`: 119 automated tests passed.
- Chromium static CSS rendering at 320px, 390px, 768px, and 1280px in Light and Dark
  modes showed the correct palette with no document-level horizontal overflow.
- Full local-server app navigation was blocked by the testing environment, so an
  actual login-to-save mobile session was not verified here.
