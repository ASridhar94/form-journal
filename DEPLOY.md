# Publish Form Journal FREE and add it to your iPhone

This package is **a complete static website**. There is no backend, paid API or subscription. A free HTTPS static host is all you need.

## Option 1 — GitHub Pages (free, public repository)

1. Unzip `Form_Journal_iPhone_App.zip` on your computer.
2. Create or sign in to a free GitHub account at <https://github.com>.
3. Select **New repository**. Name it `form-journal` and make it **Public** (GitHub Pages on personal free plans normally requires a public repository). Create it.
4. In the repository choose **Add file → Upload files**. Upload the **contents** of the `strength_companion` folder—not the outer folder or ZIP. Ensure `index.html`, `app.js`, `program.json`, `styles.css`, `manifest.webmanifest`, `sw.js`, `handbook.pdf` and the entire `assets/` directory are present at the repository root.
5. Commit the changes.
6. Open **Settings → Pages**. Under **Build and deployment → Source**, choose **Deploy from a branch**. Select `main` and `/ (root)`, then **Save**.
7. Wait for GitHub Pages to show your HTTPS URL, typically:

   `https://YOUR-GITHUB-USERNAME.github.io/form-journal/`

8. Open that URL in a normal browser. Check that the four days appear, that a reference image opens, and that **Save set** works.

**No-cost note:** hosting/service terms and limits may change. GitHub Pages is intended for static sites, and a personal public repository is generally supported on the free plan. Do not upload personal workout backup files or identifying medical records to the repository.

## Option 2 — Cloudflare Pages (also offers free static hosting)

If you don't want a public GitHub repository, Cloudflare Pages supports static-site deployments on its free tier subject to current service limits. Use its **Direct Upload** flow to upload the unzipped folder containing `index.html`, keeping the directory structure intact. The resulting site URL ends in `pages.dev`. Check the current dashboard wording and free tier at the time of publishing.

## Install the site like an app on iPhone

1. On your **iPhone**, open the published HTTPS URL in **Safari**.
2. Tap **Share** (the square with an upward arrow).
3. Scroll down and choose **Add to Home Screen**. On some iOS versions this may be behind **Edit Actions**.
4. Name it `Form Journal`, then tap **Add**.
5. Open the new **Form Journal** icon from your Home Screen. It should open as an app-like full-screen view.
6. Start using **Today → Calendar → select a date → choose Day A/B/C/D → Start / log**. You can also open Workouts directly and select a workout date before starting. Open a movement, enter reps/weight and tap **Save set**; log cardio and finish the session.

**Important:** the data saved when opening the website in Safari may be separate from data in the installed iPhone Home Screen app. Choose one environment, ideally the installed app, as your primary log. You can export/import backups if moving between them.

## Make it work offline

Once opened while online, the service worker caches the app's core files and exercise reference diagrams. Return to the installed app while offline to view the program and enter log data. `handbook.pdf` may need to be opened online once or saved separately in the Files app to be available offline.

A browser may temporarily serve cached files after you publish a new app version. Reload and give the PWA time to update. Do not delete the app as an update mechanism without first exporting your log.

## Back up your workouts

Every week or after important sessions:

1. Open **Settings** in Form Journal (your backup includes all calendar plans, workout dates, sets and notes).
2. Tap **Download JSON backup**.
3. Save the file to **Files** (preferably iCloud Drive or another location you control).
4. To restore, use **Import JSON backup**. Import replaces the app's local workout data.

**If updating a previously deployed Form Journal site:** back up your logs first, replace the old app files with the new files at the **same URL**, and refresh in Safari/the installed app. Do not delete the installed app just to update it. Version 1.1 migrates older v1 stored workouts automatically and can import v1 backups. To preserve data, keep your existing site origin/path and app installation.

There is **no server account and no automatic cross-device sync**. This is the trade-off for free, private, local-first operation.

## Troubleshooting

- **I see “Unable to load the guide.”** The files were opened directly from a folder rather than a served site, or `program.json` was not uploaded in the right location. Use the published HTTPS URL and confirm the repository's folder structure.
- **Reference sketches don't appear.** Make sure the entire `assets/exercises/` directory exists at the published site, preserving case and filenames.
- **I can open it in Safari but can't install.** Use the Safari Share menu, not another browser or the Files app; confirm that you are on an HTTPS site.
- **I cleared browser data and lost my logs.** Restore your latest downloaded backup from Settings. Without a backup, local records cannot be reconstructed.
- **A button seems unresponsive.** Reload the published site, and check that `app.js`, `program.json` and `styles.css` were uploaded. An outdated cached site may take a reload to update.

## Safety

The original clinician's A/B groups and aerobic protocol remain the source. The app proposes a reorganized four-day plan with explicitly marked substitutions and extras. Confirm it with the treating exercise clinician before adoption, especially for joint/back/shoulder symptoms. Use appropriate exercise technique and stop for concerning symptoms.
