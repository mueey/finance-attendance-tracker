# Trackerist UI Architecture — Bootstrap 5.3.6

## Important distinction

Bootstrap is a front-end UI framework, not a programming language and not a replacement for JavaScript. Trackerist uses Bootstrap for the visual layer and component behavior. JavaScript remains responsible for the app's data, calculations, validation, offline storage, schedule rules, OCR, and user actions.

## Bootstrap is used for

- Responsive layout: `.container`, `.row`, `.col-*`, flex and spacing utilities.
- Controls: `.btn`, `.form-control`, `.form-select`, `.form-check`.
- Content: `.card`, `.badge`, `.table`, `.list-group`, `.progress`.
- Interactive components: Bootstrap Modal, Offcanvas, Toast, and Collapse.
- Themes: Bootstrap 5.3 color modes through `data-bs-theme="light|dark"`.

The Bootstrap 5.3.6 CSS and JavaScript bundle are stored locally in `vendor/`; no CDN is needed after installation, and the service worker caches these assets for offline use.

## JavaScript remains modular

- `js/core/` contains reusable storage, migration, date, finance, schedule, theme, productivity, and UI helpers.
- `js/features/` contains separate page modules for dashboard, courses, planner, productivity, attendance, calendar, fines, bills, payments, reports, settings, and notifications.
- `js/app.js` connects the modules, manages routing, and initializes Bootstrap components.

This separation keeps feature logic traceable without pretending that Bootstrap can perform data processing or replace application logic.

## Bootstrap components added in 4.2

### Responsive sidebar — Offcanvas

The sidebar uses `.offcanvas-lg .offcanvas-start`. Bootstrap handles the mobile backdrop, body scroll lock, focus trap, and Escape-to-close behavior. At large desktop widths, Bootstrap's responsive Offcanvas styling leaves the sidebar in the normal page layout.

### Feedback — Toast

The shared `toast()` helper creates a Bootstrap `.toast` element and calls `bootstrap.Toast.getOrCreateInstance()`. The message is HTML-escaped before insertion, and the toast is removed after Bootstrap emits `hidden.bs.toast`.

### Existing components retained

Shared editors and semester summaries use Bootstrap scrollable modals. Collapsible semester details use Bootstrap Collapse. Forms, tables, cards, buttons, responsive grid classes, and theme-aware controls continue to use Bootstrap classes.
