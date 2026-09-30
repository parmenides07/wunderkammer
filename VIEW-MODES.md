# Curated root and personal view

This pass changes only entry views and mobile receipt controls/rhythm. No deployment, prose changes, content moves, desktop receipt geometry changes, navigation-row changes or image-pipeline changes.

## Entry behavior

- `/` uses the existing `professional` audience. Its nine visible pages are filtered before navigation, grouping, indexes, unread traversal, receipts and next-page traversal.
- `/personal/` uses the existing `public` audience and exposes all 38 published public pages. Its assets and application come from the same shared shell and runtime as root.
- `/work/` and `/work/index.html` are generated redirect documents using `location.replace()`. Query strings and hashes are preserved, including project subdirectory hosting.
- A known published public-only page requested at root redirects to its canonical slug under `/personal/`. Legacy aliases resolve too. Unknown pages retain the styled 404; excluded container routes do not build a personal navigation tree at root.
- Navigation, receipt links, authored semantic Markdown links and generated index links include the current shell path. Opening a professional page from `/personal/` stays in that view.
- No prominent personal-view link was added.

`site.config.json` → `views` supplies the entry titles/descriptions. Root is normally indexable. `views.personal.noindex: true` is enabled as requested, generating `<meta name="robots" content="noindex,follow">` in the personal entry only. Set it to false and rebuild to remove that directive. This is discoverability metadata, not privacy or access control. Work's redirect document also carries noindex. Page titles update from the existing page title and the current view's brand.

## Mobile receipt

The mobile RECEIPT/TUCK RECEIPT button and its layout margin are removed. The shared state synchronizer enforces automatic eligibility on narrow/coarse-pointer devices: zero/one direct leaf stays tucked; two or more opens. Desktop's red tuck control and within-container manual state remain unchanged.

The previous mobile rule forced every entry to be at least 44px tall and changed its line-height. It is replaced by the existing receipt artwork scale: `--receipt-unit = rendered width / 936`, with row height `42.12 × --receipt-unit` (the desktop design's 39-unit type × 1.08). Header/divider line boxes use the same scale; Total follows the row rhythm. Wrapped titles consume additional line boxes. Background sizing remains width plus automatic height; no texture stretching or text scaling is introduced. The paper stays mounted and retains its slide transition. There is no mobile connector, bob or replacement control.

## Workflow and validation

`npm run dev` serves `/`, `/personal/` and `/work/` through the same server. `npm run check` builds first, then validates entry modes, generated shells/robots, work redirect execution with preserved query/hash, public-only and legacy fallback resolution, filtered page routes and direct-leaf receipt eligibility in both audiences. No separate server or deployment change is needed.

Passed:

- `npm test`; `npm run build`; `npm run check` (zero errors, 184 existing non-blocking warnings); `git diff --check`.
- Full browser suite: 38 public pages, nine curated pages, desktop controls, unread state, history, embeds, banners/WIP, next page, audio/mute and PhotoSwipe keyboard/touch interaction; no application console errors or failed local requests.
- Dedicated view suite at 390, 430, 1440 and 1920 pixels: entry modes, alias/query/hash preservation, personal-only fallback, direct reload, Back/Forward, personal links staying personal, root excluded-container/unknown-route errors, audience-filtered groups and receipts.
- Receipt counts 1, 2, 4 and 8 on real content, plus 2/3/5-page project fixtures using existing generated bodies. Mobile automatic state, desktop manual tuck, line-box scale, no horizontal overflow and unchanged lined-paper row geometry are checked.

Local screenshots and results: `.test-results/views/`. Tests: `tests/views.cjs` and `tests/views.test.js`; old browser tests were updated for the new full-site entry path and automatic mobile receipt rule.

## Changed files

- Views/shells: new `js/views.js`, `build.js`, `site.config.json`, `site.shell.html`; generated `index.html`, new `personal/index.html`, redirect `work/index.html`.
- Runtime/UI: `js/main.js`, `js/renderer.js`, `script.js`, `style.css`, generated stylesheet.
- Validation/dev: new `tools/views-check.js`, `tools/check.js`, `tools/dev.js`, new view tests and updated existing route/receipt tests.
- Documentation: README and this report. Manifest regeneration changes only its generation timestamp.

No content or image assets changed; build reused all 266 cached image records. Physical iPhone/Safari rendering remains a manual review item. Home/About editing is still the author's next step; this pass deliberately leaves their prose intact. The personal noindex setting is the only optional view setting to revisit later.
