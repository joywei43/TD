# Everest Tournament Director

Static admin + TV display for Vercel or GitHub Pages.

- `admin/` — tournament setup and live controls.
- `display/` — fullscreen TV display.
- All internal asset links are relative, so GitHub Pages project subpaths are supported.

## Tournament logic

- Buy-in: +1 buy-in, +1 total entry, +1 player remaining, configured chips/prize contribution/fee.
- Re-entry: +1 re-entry, +1 total entry, +1 player remaining, with either Buy-in settings or independent settings.
- Add-on: +1 add-on and configured chips/prize contribution/fee only. It never changes total entries or players remaining.
- Player Out: reduces players remaining only.
- Prize Pool and collected Fees are calculated separately.
- ITM supports 8%, 10%, 12%, 15%, 20%, custom %, and round up/down/nearest/custom paid places.
- Late registration can close after any Level or Break. The TV shows CLOSE only after that stage ends.
- TV Payouts show 10 places at a time and rotate every 3 seconds after place 10.

## Audio behavior

Upload MP3 files in Admin → Sound & Alerts.

- Countdown: one complete ~10 second MP3 is played once when the current Level/Break first reaches the final 10 seconds. It is not restarted every second.
- Pausing stops countdown playback. Resuming under 10 seconds does not replay it if already triggered for that stage.
- Level Bell: the MP3 is played once when a Level/Break actually expires. If the file itself contains a triple bell, the app does not repeat it in JavaScript.

## Storage safety

Tournament state is stored in IndexedDB with a small localStorage fallback. Images and MP3 files are stored separately in IndexedDB. UI actions update immediately before persistence, so a storage failure does not disable Add-on or Player Out controls.