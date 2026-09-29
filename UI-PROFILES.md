# UI and layout-profile pass

Historical report: mobile ink and receipt behavior were subsequently stabilized; see [STABILIZATION.md](STABILIZATION.md).

Completed locally on 2026-09-29. No deployment, dependency additions, asset deletions, or prose edits. The 24 content changes add frontmatter only; their Markdown bodies match the previous commit exactly. The outer paper width and physical grid model are unchanged.

## Corrections and root causes

- Mobile inherited the desktop ink radii despite its different type scale. Mobile now has a separate, nonzero ink scale: body blur `.0015em` and shadow `.035em`; heading blur `.001em` and shadow `.025em`. Navigation and receipt effects are also lighter. Desktop body filters are unchanged, verified from computed CSS at 1440 and 1920 pixels.
- Mobile row measurement rounded the 44px touch heuristic up to multiple printed rules. That JavaScript override is removed. `--nav-row` equals `--rule-step` at every viewport; labels, markers and disclosure triangles share the printed rhythm. Horizontal link hit areas remain available. The deliberately compact rows no longer promise 44px vertical targets.
- Expanded groups accumulated across routes. Navigation now replaces expansion state with the active ancestor path, collapsing sibling branches on selection. Deep links and Back/Forward restore that path. Only containers with actual child containers receive disclosure arrows and `aria-expanded`; page-only containers do not.
- Receipt state was driven primarily by manual tucking and animation was triggered on receipt rebuilds. A shared receipt state now separates selected container, active page, visibility and manual preference. Zero direct leaves hide it; one auto-opens its page and tucks it; two or more unfold it. An index page defaults to tucked. Manual choice persists within the same container and resets on entering another. Mobile has a paper-style receipt toggle; desktop retains its tuck tab.
- Receipt heading remains the container label and entries remain direct leaves. Entering a container opens its first direct leaf; explicit leaf URLs remain authoritative. Selected `■` takes precedence over unread `•` without deleting unread state.
- Connector and bob effects run only when an unfolded multi-page receipt becomes relevant, or is manually reopened. Leaf switches do not replay them. Tucking cancels effects and clears the connector. The existing mobile no-connector and reduced-motion behavior remain.

## Shared layout profiles

One renderer applies `layout-*` classes. Unspecified layout preserves existing behavior. Build validation accepts `essay`, `project`, `gallery`, `index`, `catalog` and `custom`.

- **Essay:** approximately 70ch prose inside the existing paper; media can remain wider.
- **Project:** familiar prose with separate, wider media constraints.
- **Gallery:** narrower introductory prose, two image columns on common desktop/tablet sizes, one on phones, three only at very wide desktop widths. Responsive `sizes` follows the columns. Existing full-width galleries, captions, lazy images and PhotoSwipe remain supported.
- **Index:** a compact metadata-generated list of other direct pages in the same current-view container, newest creation date first. Historical statuses can appear beside entries; `indexStatus: false` hides status labels. Authored prose is retained below the list.
- **Catalog:** compact grouped/reference typography and definition-list styling.
- **Custom:** shared shell with `page-<id>` and optional validated `layoutClass` hooks.

Initial assignments: Darkroom uses gallery; Mindfill and Philosophy landings use index; seven Mindfill entries and Maximalist Soul Driver use essay; thirteen remaining project pages use project, including Akashom, Jivan, Cornocupia and Project Mindscape. No historical status or archive prose was changed.

## Semantic nested groups

`site.config.json` now accepts an optional `groups` array. Example only:

```json
{"id":"anvesana-experiments","label":"Experiments","parent":"projects/anvesana","order":10}
```

A page uses `project: anvesana` and `parent: anvesana-experiments`. A nested group uses the parent group ID as its `parent`. No filesystem hierarchy is consulted. Base project/collection containers come from page metadata or presentation configuration. Validation rejects duplicate groups, unknown parents, cycles and pages placed outside their declared project/collection. Audience filtering precedes navigation construction; empty groups disappear from the work view. Active ancestors expand and receipts retain direct-child semantics. No example project was added to published content. README documents the schema and recommends shallow groups.

## Asset review

`npm run check` adds non-blocking warnings for exact duplicate assets, obvious editor backup files and possibly unreferenced local assets under `assets/` and `content/`. It found 23 duplicate groups, 3 editor backups and 94 possibly unreferenced files, alongside 64 existing authoring warnings: 184 warnings, zero errors. Reference detection is a static heuristic; dynamically used files need manual review. Nothing was removed or recompressed in place.

## Validation and screenshots

Passed:

- `npm test`, `npm run check` (which rebuilds), and `git diff --check`.
- Full existing browser suite: 38 public pages, 9 professional pages, direct/legacy routes, history, embeds, banners, WIP, next page, image galleries, persisted mute, deferred audio, desktop dragging/tucking and reduced motion; no application console errors or failed local requests.
- Geometry suite at 375, 390, 430, 768, 1440 and 1920 pixels: intrinsic paper/receipt proportions, one-rule rows, overflow stress, stable grid, media fit and coherent routes.
- New profile suite at the same six widths: Darkroom, Akashom, Notes, Mindfill and Philosophy; accordion paths, semantic arrows, selected markers, receipt defaults/manual persistence, conditional animations, generated indexes, layout classes and nested-group browser fixtures.
- PhotoSwipe desktop opening, arrows, Escape, zoom/pan; emulated mobile swipe, pinch, pan and closing, including restoration of article scroll and subsequent INDEX opening/closing.

Screenshots and measurements are in `.test-results/profiles/`; the geometry suite also writes `.test-results/layout/`. Example captures: `home-390.png`, `akashom-index-390.png`, `gallery-1440.png`, `mindfill-1440.png`. Reports include `results.json`, `performance.json` and `asset-warnings.txt`. These local artifacts are ignored by Git.

## Performance smoke measurement

Same local HTTP/Chrome measurement method as the preceding geometry pass: cold contexts, initial viewport, four seconds after article readiness; repeat Home uses the warm context. Decimal MB below; encoded network bytes include response overhead. No throttling, so timings are smoke checks rather than real-world speed claims.

| Page | Before this pass | After | Change |
|---|---:|---:|---:|
| Desktop Home | 1,415,730 B | 1,425,109 B | +9,379 B |
| Mobile Home | 444,016 B | 453,395 B | +9,379 B |
| Darkroom | 2,319,545 B | 2,006,022 B | −313,523 B |
| Repeat Home | 104 B | 104 B | unchanged |

Largest desktop requests remain optimized WebP artwork at 387,428 B and 284,182 B, followed by 125,104 B and 114,350 B variants. Mobile's largest is the 114,350 B grid variant, followed by an 80,759 B decorative variant; manifest is 53,043 B. The new code/metadata adds roughly 9 KB. Darkroom's two-column composition places fewer photos inside the initial lazy-load region; originals remain deferred to the viewer. No archive-wide preload was introduced, and image caching, deferred audio/media and locally hosted libraries/fonts are retained.

Recorded LCP: desktop Home 240→168 ms, mobile Home 124→100 ms, Darkroom 108→160 ms, repeat Home 132→92 ms. Desktop LCP identifies the large decorative paper element, so these fast local values should not be interpreted as meaningful content-loading improvements or regressions.

## Files changed

- Runtime: `js/navigation.js`, `js/main.js`, `js/mobile.js`, `js/renderer.js`, `js/images.js`, `script.js`, `style.css`, `site.shell.html`.
- Build/config/checking: `build.js`, `site.config.json`, `tools/check.js`; new `tools/assets.js`.
- Content: 24 frontmatter-only edits under `content/projects/`, `content/notes/mindfill/`, `content/notes/philosophy/`.
- Generated output: `manifest.json`, `generated/site.css`, `index.html`, `work/index.html`. Generated Markdown bodies and source artwork are unchanged.
- Tests: build, navigation and authoring unit tests; browser and geometry suites; new `tests/profiles.cjs`.
- Documentation: `README.md`, historical note in `LAYOUT.md`, this report.

## Manual review remaining

Real iPhone/Safari was not available. Review dynamic Safari chrome/safe areas, compact one-rule touch targets, native pinch/pan and scroll restoration on a physical device. Chrome touch emulation passed, but does not certify Safari behavior. Review asset warnings before any cleanup. Existing Home/About and historical content still await the author's separate content review. No known blocking regression remains from the tested scenarios.
