# Everest Tournament Director — GitHub Pages Edition

Static tournament clock with two pages:

- `admin/` — tournament control, entries, Add-on, Player Out, blinds, payouts, sound, backup.
- `display/` — TV / projector display.

## GitHub Pages deployment

1. Create a GitHub repository (for example `everest-tournament-director`).
2. Upload **the contents of this folder** to the repository root.
3. In GitHub: **Settings → Pages → Deploy from a branch → main / (root)**.
4. Open:
   - `https://YOURNAME.github.io/REPOSITORY/admin/`
   - `https://YOURNAME.github.io/REPOSITORY/display/`

All links and assets use relative paths, so a GitHub Pages project subpath is supported. No `/assets/...` root-absolute paths are used.

## Storage safety fix

Version 2 uses **IndexedDB as the main persistent store** and keeps only a tiny `localStorage` fallback. Tournament actions update UI/state before persistence, and storage errors are caught so buttons such as Add-on and Player Out do not stop working when browser storage is full/unavailable.

The running timer uses an `endAt` timestamp instead of writing a full snapshot every second. This dramatically reduces storage writes.

Use **Backup → Download JSON Backup** regularly. You can also request persistent storage in the Backup page.

## MP3 sound

MP3 files are intentionally **not bundled in this ZIP**.

From `admin/` → **Sound & Alerts**:

- Upload a Countdown sound. It plays once per second for the final 10 seconds.
- Upload a Level Bell. It plays as a three-hit bell on automatic/manual level changes.
- Click **Enable Sound** once after every page load/reload because browsers block autoplay until a user gesture.

Uploaded audio is stored locally in IndexedDB on that browser/device. If no file is uploaded, a synthesized fallback beep is used.

## Sync behavior

Admin and Display opened in the **same browser profile/device** synchronize through `BroadcastChannel`, with the persistent state used as fallback. GitHub Pages alone does not provide cross-device realtime sync; that would require a backend.
