# Agent Instructions

Instructions for AI coding agents (Claude Code or otherwise) working in this
repository. See `context.md` first for what the app is and how it's built.

## No build step

This is plain HTML/CSS/JS. There is no `package.json`, no bundler, no
`npm install`. Edit `index.html` directly and open it in a browser (or serve
it) to see changes — nothing needs compiling.

## Keep the two HTML files in sync

`index.html` (GitHub Pages entry point) and `Smart_Production_Assistant_Mobile.html`
(export target) are meant to be identical. After finishing a set of edits to
`index.html`, copy it over the mobile file unless the task is explicitly
scoped to one file only:

```bash
cp index.html Smart_Production_Assistant_Mobile.html
```

Check with `diff index.html Smart_Production_Assistant_Mobile.html` — it
should produce no output when in sync.

## Verifying changes

There is no automated test suite. For any non-trivial change:

1. **Syntax-check the inline script** (it's large and embedded in HTML, so
   `node` can't check the file directly):
   ```bash
   python3 -c "
   import re
   html = open('index.html', encoding='utf-8').read()
   scripts = re.findall(r'<script>(.*?)</script>', html, re.S)
   open('/tmp/app.js','w').write(max(scripts, key=len))
   "
   node --check /tmp/app.js
   ```
2. **Smoke-test in a real headless browser.** Playwright + a local Chromium
   are available in this environment:
   - Chromium binary: `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`
   - Playwright module: `/opt/node22/lib/node_modules/playwright` (require
     from that path — it isn't installed as a local project dependency)
   - Launch with `chromium.launch({ executablePath: <path above> })`, load
     `file:///.../index.html`.
3. **Tailwind won't load in offline/sandboxed environments** — the CDN
   `<script src="https://cdn.tailwindcss.com">` fails to fetch, so Tailwind's
   utility classes (including `.hidden`, which is how every modal is toggled)
   don't take effect. This means in local testing:
   - Modals won't visually or functionally hide when "closed" — a previous
     modal can silently sit on top of a new one and intercept clicks.
   - Use `{ force: true }` on Playwright clicks to route around stale overlays,
     or close/verify the previous modal is `.hidden` before opening the next
     one, and don't trust a "click had no effect" result until you've ruled
     out this cause (it happened at least twice this session and both times
     the underlying feature was actually fine).
   - This is purely a test-environment artifact — it does not affect real
     users, since Tailwind loads fine over a normal internet connection.
4. For anything PWA-related (manifest, service worker, icons), remember
   `manifest.json`'s `start_url`/`scope` and `sw.js`'s cache paths are
   **case-sensitive** and must match the live GitHub Pages URL casing exactly
   (`/Log-EQ-history/`, not `/log-eq-history/`).

## Security-sensitive spots

- User-supplied text (log `details`, `recorder`, etc.) is rendered via
  `sanitizeHTML()` before being interpolated into HTML — including inside
  `title="..."` attributes. If you add a new place that interpolates
  user/AI-generated text into `innerHTML`, run it through `sanitizeHTML()`
  first, and don't assume "it's just for display" is safe (attribute-context
  injection is real — this was a live XSS in this codebase before).
- Never include the Gemini API key in exported backups (`handleExportData`) —
  it was previously (accidentally) included; keep it excluded.

## Git / branching

- No `.github/workflows` exists in this repo — GitHub Pages deploys via its
  own built-in system workflow (`pages-build-deployment`), not a custom
  Action. Don't go looking for a CI config to modify; there isn't one.
- Work happens on `claude/*` branches. Pushes to those branches, once a PR
  exists, appear to get merged into `main` automatically and quickly (seconds
  to low minutes) by something outside this repo's own configuration — verify
  via `git log`/the GitHub API rather than assuming a push is still pending
  review.
- Follow the existing commit style (see `git log --oneline`): short imperative
  subject line (`fix:`, `feat:`, `chore:` prefixes), body explaining *why*,
  not a restated diff.
