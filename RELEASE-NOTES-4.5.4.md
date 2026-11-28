# Trackerist 4.5.4 — Calendar Reliability Fix

## Audit findings fixed
- Reset Card Theme now removes only the uploaded calendar card image/name; date colors and uploaded stickers are preserved.
- Opening Calendar customization preloads the selected date’s saved color and sticker.
- Clearing a date style also resets the controls, preventing a stale color/sticker from being reapplied accidentally.
- Date color picker updates the sample glass tile in the preview; changing the selected date loads that date’s tint into the preview.
- Sticker uploads enforce the same 900 KB combined data limit used by backup normalization, preventing silent sticker loss on backup/restore.
- Save button wording changed to Done because changes are persisted immediately by the app store.

## Verification
- JavaScript syntax checks passed.
- Automated Node test suite: 175 passed, 0 failed.
- Browser/device interaction and live deployment still require manual verification.
