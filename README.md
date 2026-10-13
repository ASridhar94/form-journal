# Form Journal — Four-day workout handbook & iPhone app

**A private, offline-friendly, illustrated workout calendar and journal.** This package includes a 22-page PDF handbook and a static PWA you can publish for free. It uses **no accounts, API keys, databases, subscriptions or tracking**.

## What is inside?

- `index.html` — app entry point
- `styles.css` — mobile + desktop design
- `app.js` — workout calendar, plan assignments, interactive set/cardio logging, editable history, graphs, backup and settings
- `program.json` — four-day program and detailed exercise instructions
- `assets/exercises/*.svg` — 26 original START/MOVE movement sketches
- `assets/icons/*` — iPhone and Android app icons
- `manifest.webmanifest` — installation metadata
- `sw.js` — offline app shell and exercise-image cache
- `handbook.pdf` — printable illustrated handbook
- `DEPLOY.md` — step-by-step free publishing and iPhone installation

## Key features

1. Choose **Day A / B / C / D** and open exact form instructions with illustrations.
2. Start a session. Enter **reps, resistance (lb/kg), optional effort/RPE** for each set.
3. Get an optional **rest countdown** after a saved set.
4. Log actual cardio minutes and a private session note.
5. Open **Calendar** to select any date, plan **Day A/B/C/D** or **Rest**, and see completed sets on the actual day.
6. Start a workout for **today or a previous date**; completed sessions are saved under the date you choose.
7. Tap **View / edit sets** on a completed calendar entry to update individual reps, weights, effort, notes, cardio, date, and A/B/C/D grouping; you can also add missed sets.
8. Review **All workout history** or see trends in **Progress** charts.
9. Continue unfinished workouts after closing the browser.
10. Export and import full local **JSON backups**, including calendar plans.
11. Install on iPhone through Safari's **Add to Home Screen** after free HTTPS publishing.

## Start locally (no development tools)

The browser blocks `fetch` from a `file://` URL, so **do not open `index.html` directly from a file manager**. Serve it as a website:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000> in your browser.

No `npm install`, Node server or build step is needed.

## About the program

The source clinical program has **Group A / Group B**, typically **2 sets × 10–15 repetitions at light to moderate intensity with 1–2-minute rest**, plus four aerobic session examples. The four-day A/B/C/D split and equipment substitutions in Form Journal are **proposed adaptations, not the prescribing clinician's revised instructions**. Review these changes with the exercise clinician before making them your routine.

The photos appear to show a treadmill, elliptical, stationary bike, dumbbells, weight bench, barbell rack and functional trainer. A leg press, leg extension, leg curl, low step, cable ankle strap and some seated pulldown accessories **were not confirmed**. The package doesn't pretend these are present; it marks substitutions as such.

Original reference images in the user-provided clinical exercise sheets are **not republished** in this site. The included vector diagrams are newly drawn, simplified movement sketches and should not replace a technique demonstration.

## Calendar and workout logging

1. Tap **Calendar** in the bottom navigation (or the sidebar on desktop).
2. Use **‹ / ›** to change month; tap a date to select it. Completed days show a checkmark and the number of sets.
3. Pick **Day A / B / C / D** to schedule it, **Rest day**, or **Clear plan**. Planning never alters completed workouts.
4. If the date is today or in the past, select an exercise group in **Log workout for this date** and tap **Start / log**. An unfinished workout is automatically saved locally.
5. Follow the illustrated exercise cards and log sets and cardio. Tap **Finish workout** when done. The app opens the calendar on the selected workout date.
6. For a past workout, select its date, tap **View / edit sets** and adjust reps/weight/effort, add a missed set, add/remove cardio, edit notes, or change the workout date/group.
7. To see every saved workout in one list, use **All workout history** beneath the calendar.

**Upgrading from a previous release:** This release understands v1 stored workouts and v1 JSON backups. It migrates them to the new calendar format when used, without requiring you to delete your old data. Export a fresh backup before and after updating the hosted files, and keep the same site address and app installation when upgrading. Past sessions are assigned a date based on their original start timestamp using the device's local timezone.

## Data and privacy

- By default, workout logs, editable sets and calendar assignments are saved in `localStorage` on **the exact browser or installed-app context**.
- Nothing is uploaded or synced; publishing the code publicly does not publish local workout logs.
- **Deleting browsing data, changing devices, reinstalling the PWA or losing the device may erase logs.** Export JSON backups regularly.
- Safari and the installed home-screen app may have separate storage. Complete the first workout **inside the installed app**.
- The backup file can contain private workout notes: store it securely.
- GitHub Pages public repositories make the app **code and generic routine** public, not your locally stored logs.

## Scope and non-features

This version focuses on training, planning and an editable workout calendar. It does **not** offer medical diagnosis, exercise prescriptions, an AI trainer, photos/videos of techniques, automatic movement tracking, cloud sync, or multi-person accounts.

For a quick manual review, check `program.json`, try each of the four days, log a test session, export and import a backup, and review mobile display.
