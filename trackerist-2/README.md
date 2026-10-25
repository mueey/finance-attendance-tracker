# Trackerist 2.1 — Automatic Attendance Calendar + Offline Login

An offline-first attendance and finance tracker built with local **Bootstrap 5.3.6**, modular JavaScript files, and browser storage. Based on the ideas in [mueey/trackerist](https://github.com/mueey/trackerist); delivered as a separate downloadable project (the GitHub repository has not been overwritten).

## Installation (Windows, Mac, Linux)

1. Unzip the project and open the `trackerist-2` directory.
2. On Windows, run `run-local.bat`, or open a terminal in the extracted directory and run `python -m http.server 8000` (`py -m http.server 8000` also works on Windows).
3. Open `http://localhost:8000` in Chrome or Edge. **Do not double-click `index.html`**: browsers commonly block modules, service workers, and local authentication on `file://` URLs.
4. Create your **local username and password** (at least 8 characters). Subsequent launches and reloads show the **sign-in form before the dashboard**.
5. Let the service worker finish installing during the first online/local-server visit, then install the PWA through your browser's "Install app" option. The installed app's cached code and Bootstrap files work offline.

**Login is local to this browser and device.** It is not a remote/web account; it requires no internet. The app stores a random-salted, PBKDF2-SHA256-derived password verifier, but **the attendance/finance data itself is not encrypted**. Login prevents casual access through the user interface; it is not robust protection from other people with file, storage, or developer-tools access. There is currently **one local account per browser**. There is no online account recovery. Settings → Change password works if you know your old password. Data backups don't include the password. Use a trusted device and back up data regularly.

## Schedule subjects automatically

1. Open **Courses & Events → Add course / event**.
2. Enter a subject name/code (e.g. `IT101 · Programming`), optionally time and venue.
3. In **Repeat every week on**, check the meeting days (e.g. Mon, Wed, Fri).
4. Set **First day / semester start** (e.g. `2026-10-01`); optionally set a **Last day** to stop after the term ends.
5. Save. The calendar **dynamically displays** the subject on its matching weekdays between the dates. You don't need to add each date manually.
6. Open **Calendar**, click a date, and press **Present**, **Absent**, or **Excused** by its subject name. You can do the same under **Today's scheduled classes** on the dashboard. Use **Edit / note** to add a reason, or mark a Holiday or event time-in/time-out.

**Important:** An unmarked scheduled class shows **Pending**, never automatic Absent. No fine is generated for a Pending class. Only an explicitly recorded Absent date adds the course's current fine. One course/date can have only one attendance record; changing Absent to Excused or Present updates it instead of duplicating fines. Excused and Holiday are excluded from the attendance denominator and add no absence fine.

For single-day events, choose **Special event** and fill **One-time event date** (this overrides weekly repeat days); for a repeating event, select weekdays without a one-time event date.

Changing the meeting days and term dates updates the future calendar immediately. Existing attendance logs are retained even when you change or archive a course, and off-schedule manually logged dates still appear. Edit/restore or delete courses in **Courses & Events**.

## Included features

- **Local account:** first-time registration, sign in, logout, session gating on reload, password change.
- **Dashboard:** today's recurring classes with one-tap statuses, attendance health, dues, fines, payments and reports.
- **Courses / Events:** editable code/name, recurring weekdays, semester range, single event date, time, venue, fine rate, archive/restore/delete.
- **Calendar:** automatic schedule occurrences, pending/present/absent/excused/holiday indicators, selected-day editable attendance controls.
- **Attendance:** session history and editable statuses; optional AM/PM time slots for event records.
- **Fines:** automatic fine calculation, editable manual fine adjustments and waivers, corrected absence re-calculation.
- **Bayronon / Bills:** editable charges, deadlines, categories, notes, overdue tracking.
- **Payments:** fines/bill allocations, partial payments, editable payment logs and remaining balances.
- **Reports:** CSV exports and JSON backup/restore (including original Trackerist backup import).
- **Offline PWA:** locally bundled CSS/JS/icons and versioned service worker cache; no CDNs.

## Accounting rules

- `Present` counts as present; `Absent` counts as absent; `Excused` and `Holiday` are not included in the attendance rate denominator. `Pending` is a calendar-only display state, **not a stored absence**.
- An `Absent` event with partial missed slots is charged **one** absence fine for that event date, not one fine per missed slot.
- Automatic fine = recorded absent dates × **current** course fine rate. Changing the rate recalculates older absences.
- Signed manual adjustments can add fines or waive them. Payments are separate records and are not deleted if an absence is corrected; any excess becomes credit.
- Overall due = fine assessment + bills − payments (clamped at zero; excess is shown as credit). Payments allocated to fines don't pay individual bills.

## Existing Trackerist data

This app preserves Trackerist v2 state saved under `trackerist_v2_state`. Upgrading to v2.1 preserves attendance, finances, and course records, while adding weekday/date fields. Original `courses_cal` data is migrated the first time the app runs **on the same browser origin** if v2 state does not exist. Original Trackerist backup JSON can be imported at **Settings → Restore / import JSON** even across different browser origins. It will not import old browser localStorage automatically if you run the application at a different URL/port.

**Before upgrading**, make a JSON backup from the old version. Importing a backup **replaces the current attendance and finance data** but not the local login account/password. The login account is stored separately as `trackerist_v2_local_account`.

## Project files

```text
index.html                     Sign-in screen, Bootstrap dashboard shell
css/app.css                    Styling and responsive layout
vendor/                        Local Bootstrap CSS & JS (MIT)
js/app.js                      Entry point, login gate, navigation
js/core/schedule.js            Weekday parser and on-demand recurring occurrences
js/core/migrate.js             Data validation, v2 compatibility, legacy import
js/core/store.js               Browser persistence and change notification
js/core/finance.js             Attendance/finance calculations
js/core/utils.js               Dates, escaping, CSV and currency helpers
js/core/ui.js                  Shared editors and notifications
js/features/auth.js            Local sign-up/login/logout/password changes
js/features/courses.js         Subject editor and calendar schedules
js/features/calendar.js        Monthly recurring calendar and quick marks
js/features/attendance.js      Detailed attendance editor/history
js/features/dashboard.js       Daily scheduled classes and summaries
js/features/fines.js           Fine ledger
js/features/bills.js           Bills
js/features/payments.js        Payment ledger
js/features/reports.js         Exports
js/features/settings.js        Preferences, backup, password change
sw.js                          Offline cache (v2.1)
manifest.webmanifest           Installable app metadata
tests/                          Automated calculation/auth/scheduling tests
```

## Tests & limitations

Use `npm test` (Node 22+) to run the included unit and module tests. They cover attendance/fine recalculation, recurring schedule rules, login/password hashing, migration, page rendering, offline asset list, and one-click day marking.

The automated browser end-to-end test could **not** run in the build environment because navigation to local addresses was blocked by the testing sandbox. Please smoke-test in Chrome/Edge on your computer: create local login → add a Mon/Wed class with semester dates → see it automatically on the calendar → mark Absent and confirm fine → change to Excused and confirm fine removed → logout/relogin → reopen installed PWA offline.

This is **not an encrypted or tamper-proof production system**, nor a hosted, synchronized multi-user student attendance system. A multi-user system needs a database, proper server authentication, backups and audit logs. Browser localStorage can be cleared by browser cleanup/private browsing; export backups regularly.
