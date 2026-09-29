# UX and performance pass — 2026-09-29

## Measured results

Chrome through Playwright, local HTTP on port 5173, without CPU/network throttling. Cold cases use fresh browser contexts; repeat is an immediate reload of the same context. Desktop: 1440×1000, DPR 1; phone: 375×812, touch/mobile emulation, DPR 2. Measurements collect CDP `Network.loadingFinished.encodedDataLength` through four seconds after the current article is rendered. They include completed network transfers; unfinished media can be undercounted. Units below are bytes, including reported response overhead.

| Page / visit | Before bytes | After bytes | Reduction | LCP before → after |
|---|---:|---:|---:|---:|
| home-cold | 113,085,213 | 1,413,333 | 98.75% | 580 → 144 ms |
| home-repeat | 104 | 104 | 0.00% | 240 → 120 ms |
| darkroom-cold | 408,723,076 | 2,202,365 | 99.46% | 448 → 104 ms |
| mobile-home-cold | 113,084,571 | 441,619 | 99.61% | 444 → 108 ms |

These are local measurements, not mobile-network or production timing promises. Desktop LCP identifies the paper background, not article readiness; the mobile layout changes its LCP candidate to text. The transfer reduction is the stronger result. Repeat transfers are essentially cached in both versions; small revalidation-header totals vary between runs. Darkroom measured 2.2–2.6 MB in final-stage runs because Chrome's lazy-image loading window varies.

## What was expensive

The initial Home request set included `siteoperation.png` and hidden `indexcard.png` at 39.15 MB **each**, `receipt.png` at 9.11 MB, `backbuttonsite.png` at 7.83 MB, and hidden `wip.png` at 4.54 MB. Paper textures and artwork added several more MB. Darkroom eagerly fetched all 41 original photographs, many around 8–11 MB each.

Three Google Fonts stylesheets blocked rendering for about 260 ms each in the baseline; several requested font families were unused. There was also a missing Baskerville font and missing favicon. Five audio effects fetched about 120 KB before interaction. Darkroom attempted ambient audio loading immediately. Home did not fetch unrelated page Markdown or ambient tracks: its manifest and current Markdown were already appropriately scoped.

The largest final desktop Home transfers are now the illustrated background (387 KB), receipt texture (284 KB), lined paper (125 KB), grid paper (114 KB), and mute artwork (81 KB). The manifest is 52 KB, fetched once per application load; current Home Markdown is 2.3 KB and its image metadata is under 1 KB. Mobile omits desktop illustration/cards and defers navigation textures until INDEX opens.

Only the local generated stylesheet blocks rendering (about 3 ms in the final run). Scripts defer; two local fonts use `font-display: swap`. No audio, PhotoSwipe core, or unrelated page media is fetched before it is needed. No blanket image preload was introduced.

## Image behavior

`sharp` generates quality-90 WebP variants at up to 600/1200/2000/2800 px with intrinsic dimensions, responsive sizes, and no upscaling. Small assets retain their encoding. Images load lazily except the current banner; all decode asynchronously. Content hashes reuse unchanged variants: the final cached build processed zero images and reused 266 sources in roughly one second.

The build's complete image index stays out of the runtime request path. Each page gets a small image-metadata file. PhotoSwipe loads on first use and preloads only one neighboring image in the current article. Originals remain available through **Open original**. Large GIFs use still previews and explicit Play/Pause controls; a separate browser test verified zero original GIF requests until Play.

Original media remains inherently large: the five published Noita animations are approximately 15.6–42.1 MB each. Two existing display images still exceed the checker's 1.2 MB warning threshold at a generated size. The generated image directory is about 128 MiB on disk, but is never downloaded as a unit. Original authored images, prose, and assets are unchanged.

## Behavior and validation

- `npm run build`, `npm test`, and `git diff --check`: pass.
- `npm run check`: zero errors, 64 warnings (56 alt-text reviews, seven large images/animations, one unresolved legacy link).
- Browser regression: all 38 public pages and all nine professional pages; correct direct-child receipts, selected square/unread restoration, project children, legacy normalization, deep-link reload, history/scroll, next-page control, unavailable-page paper, banners/WIP, full-width galleries, CSV/HTML embeds, multiply images, ambient audio and persistent mute.
- Desktop paper dragging, tucking, folder line, viewer arrows/zoom/Escape pass. Viewer focus restoration, original link and background scroll lock also pass.
- Touch emulation at 375, 430 and 768 px: INDEX opens the navigation papers, leaf selection closes it, article is readable at 16 px, no horizontal overflow, real dispatched swipe and two-finger pinch gestures work. Desktop also checked at 1366 and 1920 px. Resize does not reload; reduced-motion styles are verified.
- No application console errors or failed local requests in the full browser suite.
- Live development test: created a temporary Markdown page, observed build plus automatic browser refresh and working route, removed it, and observed refresh to the unavailable-page state. The test page was removed.
- Scaffolding tests validate project/note frontmatter, public-only defaults, and protection against overwriting existing files. Metadata tests exercise duplicate IDs/slugs, required fields and invalid values. Markdown asset discovery tests cover image captions and reference-style images.
- `npm audit --offline`: zero reported vulnerabilities in available audit data.

Touch tests use Chromium emulation, not physical iPhone/Safari hardware. Third-party embedded content and real-device audio policies still deserve a manual spot check. There are no known blocking application failures in the tested environment.

## Author review

Home still says the site does not support mobile and describes the old controls. That prose was deliberately preserved; update the Site Operation paragraph when reviewing Home. Review Home/About before distributing `/work/`.

The About link to `whenItRainsItProse/philosophy/04-08-26_Why_I_Do_What_I_Do.md` has no known migrated target and remains a warning. Supply meaningful alt text where `npm run check` reports it. Gallery filenames cannot convey rich descriptions; individual Markdown images support authored alt text and captions. No personal beliefs or project prose were rewritten.

## File and dependency inventory

Added source: `site.shell.html`; `js/images.js`, `js/lightbox.js`, `js/mobile.js`; `tools/images.js`, `tools/markdown.js`, `tools/dev.js`, `tools/new.js`, `tools/check.js`; `tests/authoring.test.js`, `tests/performance.cjs`; this report.

Updated source: `build.js`, `script.js`, `style.css`, `js/main.js`, `js/navigation.js`, `js/renderer.js`, `package.json`, `package-lock.json`, `.gitignore`, `README.md`, and existing build/content/navigation/browser tests.

Generated or regenerated: `index.html`, `work/index.html`, `manifest.json`, `generated/site.css`, `generated/image-index.json`, `generated/images/`, and `generated/vendor/`. Existing generated Markdown remains unchanged. No authored content files were moved or removed. The HTML shell is now the single editable source for both entry points.

Added packages: `sharp` 0.35.5, `photoswipe` 5.4.4, `chokidar` 4.0.3, `marked` 18.0.14, `papaparse` 5.7.0, `@fontsource/jetbrains-mono` 5.3.0 and `@fontsource/azeret-mono` 5.3.0. `gray-matter` remains. Marked/PapaParse are now local instead of CDN runtime fetches; vendor licenses are copied with the build. No framework or bundler was added.

Raw local measurement records: `.test-results/performance-before.json` and `.test-results/performance-final.json`. Browser report: `.test-results/ux-browser.json`. Reproduce with the commands in README. These local reports are ignored by Git.

Work remains uncommitted and was not deployed. A pre-edit backup exists at `/tmp/portfoliosite-before-ux-pass.tar.gz`; the repository baseline is commit `9dcbf64`.
