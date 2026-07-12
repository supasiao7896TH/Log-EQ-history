# Project Context — Smart Production Assistant

## What this is

A PWA for logging and analyzing equipment problems in a PTA (purified terephthalic
acid) petrochemical plant's production department (ฝ่ายผลิต). Operators record
issues per piece of equipment (pump seal leak, motor noise, etc.), track status
(Open / In Progress / Closed), and get AI-assisted troubleshooting, RCA, and
shift handover reports.

Branded internally as **GC-M PTA PLANT**, with three plants (Plant 1/2/3) sharing
the same equipment catalog but separate log histories.

## Architecture

- **No build step.** The entire app is one HTML file: `index.html`. Tailwind,
  Chart.js, and SheetJS (xlsx) load from CDN; Google Fonts (Sarabun) via
  `<link>`. Edit the file directly — there is nothing to compile or bundle.
- **`Smart_Production_Assistant_Mobile.html` is a mirror of `index.html`.**
  It was introduced as a separate "export" target when PWA support was added.
  The two have drifted out of sync more than once — when finishing a round of
  edits to `index.html`, copy it over this file too (`cp index.html
  Smart_Production_Assistant_Mobile.html`) unless told otherwise.
- **Storage: IndexedDB** (`SmartProduction_IDB`), migrated from localStorage in
  v17 (`dbManager` in the inline script). Logs are keyed per plant
  (`spa_v17_logs_plant_{1,2,3}`); equipment catalog is a separate key. A few
  small settings (API key, selected plant, last-working Gemini model) still
  live in plain `localStorage`.
- **AI: Google Gemini API**, bring-your-own key entered via the "ตั้งค่า Gemini
  API Key" button (Manager modal on mobile, `Ctrl+.` shortcut on desktop) and
  stored client-side only. Used for: chat assistant, troubleshooting
  suggestions, safety checklists, RCA (5-whys), image analysis, predictive
  text autocomplete (now purely local, see below), overall plant analysis,
  predictive maintenance, and shift handover report generation.
- **PWA**: `manifest.json` + `sw.js` + `icons/`. Service worker is cache-first
  for CDN assets, network-first (falling back to cache) for the app's own
  files, and always network for the Gemini API. `manifest.json`'s
  `start_url`/`scope` and `sw.js`'s `PRE_CACHE` list use the **exact-case**
  path `/Log-EQ-history/` — this must match the GitHub repo name's casing
  exactly, since URL paths are case-sensitive and GitHub Pages serves at
  `https://supasiao7896th.github.io/Log-EQ-history/`.
- **Deployment**: GitHub Pages, classic "deploy from branch" mode (the only
  workflow in Actions, `pages-build-deployment`, is GitHub's own system
  workflow — there is no custom CI in this repo).

## Domain model

- Equipment categories: PUMP, AGITATOR, BLOWER/COMP., SEPARATOR/FILTER,
  ROTARY VALVE, STATIC, EI (instrumentation), EE (electrical), PIPING, AIR
  KNOCKER. Each has a hardcoded default equipment list in `CONFIG.defaultEquipment`.
- A log entry: `{ timestamp, date, shift (A-D), problemType, details, recorder,
  status, image }`.
- Command Center: cross-equipment search/filter across all logs in a plant.
- Dashboard: top-5 problem equipment chart, problem-type breakdown, AI overall
  analysis, AI predictive maintenance.
- Handover: AI-generated shift handoff summary from recent logs (configurable
  8/12/24h window).

## Notable history (this session)

Fixed in roughly this order — see git log for details:
1. Stored XSS via unescaped quotes in `sanitizeHTML()`, API key leaking into
   data export, an event-listener leak in Command Center, unsorted log
   history, duplicated modal-open code.
2. Predictive text switched from a per-keystroke Gemini call to a local
   prefix match (cost + latency), handover report output sanitized before
   `innerHTML`, per-equipment timestamp collision guard.
3. Gemini model discovery/retry bug: hardcoded default model
   (`gemini-1.5-flash`) had been deprecated by Google, causing 404s; the retry
   loop shared its budget between model-switch attempts and rate-limit
   backoff, silently swallowing the real error. Now uses `gemini-2.5-flash` as
   default, separates the two retry budgets, and surfaces the real
   status/message on failure (including a distinct message for raw network
   failures like `ERR_CONNECTION_TIMED_OUT`, vs. HTTP error codes).
4. PWA path-casing bug (`/log-eq-history/` vs. actual `/Log-EQ-history/`) that
   silently broke install (`start_url` 404s) and offline support (service
   worker install failed because `cache.addAll()` is all-or-nothing).
5. Mobile modal overflow bug: `.modal-container > .neumorphic-card` only set
   `min-height: 100dvh` on small screens, so content taller than the viewport
   (e.g. the Manager modal's import/export section) grew past the screen with
   nothing to scroll it back into view. Fixed by also capping `max-height`.
6. New app icon (clipboard + wrench + "GC-M PTA" nameplate), replacing a flat
   solid-color square with no symbol.
7. Added a touch-reachable entry point for the API key modal (previously only
   reachable via the `Ctrl+.` desktop shortcut, unusable on mobile/PWA).

## Known external quirks worth remembering

- **Google's Gemini free-tier quota can show `limit: 0`** for keys/projects
  that haven't linked a billing account yet, even while still nominally on
  the free tier — this is an account-side issue, not something fixable in
  the app.
- **PRs opened against `main` from `claude/*` branches on this repo get
  auto-merged very quickly** (observed: within seconds to low minutes) by
  some mechanism outside this repo's own config (no `.github/workflows`
  exists) — don't assume a push needs a manual merge step before it's live.
- Tailwind loads from `cdn.tailwindcss.com` at runtime — in network-restricted
  sandboxes it silently fails to load, so `.hidden` (a Tailwind utility) does
  **not** apply `display:none`. This affects local testing more than
  production, see `agents.md`.
