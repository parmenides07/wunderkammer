# Physical layout corrections — 2026-09-29

This is the historical report for that pass. The later [UI/profile pass](UI-PROFILES.md) supersedes its mobile multi-rule rows, ink intensity and receipt/expansion policy.

The desktop composition, authored content, semantic architecture, mobile INDEX overlay, image pipeline and viewer remain. Nothing was deployed. The starting checkout was clean at `ef72f9a`; an additional source backup is `/tmp/portfoliosite-before-layout-pass.tar.gz`.

## Diagnosis from the running site

Before changing source, Chrome screenshots and computed styles were captured at 375, 390, 430, 768, 1440 and 1920 CSS pixels.

- Lined paper used `cover` against a content-dependent box. Mobile rows used independent 44px sizing, so printed rules and rows had unrelated spacing.
- Mobile receipt used `100% 100%`, compressing a 936×2429 source texture into a box around 144px tall regardless of width.
- Mobile grid used `auto 100%` on the full article container. Home alone produced a material region several thousand pixels tall; longer articles changed the physical grid scale.
- Mobile body leading was 26.4px at 16px type (1.65). It removed paragraph effects while keeping fixed-pixel heading effects. Heading overrides also made the title and ordinary second-level headings the same size. Desktop filtered the entire article as well as its descendants, allowing compounded rasterization/blur.
- The article's negative side margins enlarged its white backing independently of the text's 72ch cap.
- Browse routes intentionally rendered a “choose a page” placeholder even when the container had direct leaves.
- The reported “Overview” receipt heading did **not** reproduce: this checkout already used the container label. That behavior is now explicit in `buildFileLinks(group, page)` and covered by route/history tests rather than replaced with another title heuristic.

## Component geometry

Lined artwork is 1494×2070, with approximately 69 source pixels between rules. `--paper-width` selects one scale; `--paper-unit` and `--rule-step` derive all offsets and row geometry. Background width is fixed to that scale and height stays `auto`. The box crops to its contents until the smaller of the source sheet height and the viewport allowance. Its navigation region then scrolls; content cannot enlarge the texture. Existing desktop positioning, drag handles, shadows and tuck controls remain.

On touch layouts, each navigation target spans the smallest whole number of ruled intervals giving at least 44px. Measured rows: 46.63px at 375, 48.70px at 390, 54.25px at 430, and 56.16px at 768. Desktop rows remain one interval: 28.45px at 1440 and 37.94px at 1920. Indentation, markers, header and ink effects derive from the paper scale. There are no per-device row coordinates.

The receipt uses its 936×2429 source geometry through `--receipt-width` and `--receipt-unit`. Its texture keeps automatic height and is cropped, including for empty receipts. Header, separators and total remain outside `.receipt-entries`; only the entries scroll when the physical-height cap is reached. Typeface sizes, padding and spacing derive from the component scale. Touch entries retain 44px targets. The surrounding INDEX overlay can scroll independently when both papers do not fit.

## Navigation state and routes

The selected container supplies the receipt title and direct leaves. The active page supplies only the active-item highlight. Selected containers show Unicode BLACK SQUARE `■`; it replaces the unread dot visually without deleting unread state.

Entering a container with direct leaves opens its first page in receipt order and normalizes the URL to that semantic leaf. A container with no direct leaves stays at container level; there is no recursive descent. Explicit leaf URLs and Back/Forward are honored. Within mobile INDEX, the first article is ready behind the papers; tapping a receipt item or TUCK INDEX reveals it.

Automated cases A–E pass: Art auto-opens its first leaf; the second Art leaf survives direct load and refresh; Notes has an empty receipt and does not descend; Akashom opens Overview while retaining the Akashom heading; history restores consistent selection, receipt and article.

## Article, grid and text

The grid uses a constant `auto 900px` surface scale taken from the 900px-high desktop reference pane. Desktop crops/repeats this surface in its pane. Mobile uses a fixed pseudo-element behind the article, sized to the viewport rather than the document. Adding 10,000px of article content leaves the computed grid dimensions and scale unchanged. Mobile keeps one normal document reading scroll, with the banner above the sheet.

Removing `.content-bg`'s negative side margins narrows the desktop white sheet by 6.9% while keeping its center and outer composition:

| Viewport | White sheet before → after | Text measure before → after |
|---|---:|---:|
| 1440 | 702.42 → 653.77px | 621.67 → 596.17px |
| 1920 | 936.56 → 871.69px | 760.05 → 760.05px |

Mobile sheet and text widths are unchanged. Videos use border-box sizing, and image/HTML/CSV embed geometry was checked within the sheet.

Body type remains 14.4px at 1440, 17.6px at 1920, and 16px on phones/tablets. Leading is 1.3 desktop (closer to the original 1.238 stylesheet rhythm) and 1.4 mobile instead of 1.5/1.65. The phone title is 2em, ordinary h2 is 1.5em, and h3 is 1.17em. Date and header spacing now come from explicit typographic margins rather than empty `<br>` elements. Serif/mono relationships and receipt rotations remain.

Ink effects are applied to text elements, with blur/shadow dimensions relative to glyph or paper scale. The scrolling article itself is no longer filtered. Paragraph/list ancestors no longer stack repeated filters around the same text. This keeps intentional softness and opacity without rasterizing the whole long sheet or treating headings as string-specific exceptions.

## Scroll lock and viewer verification

INDEX and PhotoSwipe share a reading-position lock. On mobile, a fixed body prevents background document movement while a surface is open; closing restores the exact saved document offset. Focus restoration uses `preventScroll`, while keyboard navigation inside the papers can still reveal focused links. A page opened under INDEX updates the saved reading position to that page's position.

Tests pass for desktop arrows, zoom, mouse pan and Escape; touch swipe, two-finger pinch, pan and close; background lock; exact prior reading offset after viewer close; and INDEX opening/closing afterward. No replacement viewer or media loading policy was introduced.

## Validation and performance

- `npm run build`, `npm test`, `npm run check`, and `git diff --check` pass. Content checks retain the existing 64 nonblocking authoring warnings; no prose was edited.
- Full existing browser regression passes for all 38 public pages, nine professional pages, desktop drag/tuck/line, unread restoration, history, media, audio/mute, reduced motion, and resizing. No application console errors or failed local requests were recorded.
- New `tests/layout.cjs` passes screenshots and DOM assertions at 375, 390, 430, 768, 1440 and 1920px, including artificial long navigation/receipt lists to exercise their caps. Existing regression also tests 1366px and DPR-2 touch viewports.
- Art video bounds, Jivan HTML embeds, experimental CSV/multiply images, and Darkroom gallery/viewer remain contained and usable. Third-party YouTube rendering depends on the external provider/network; the captured local screenshot can show an unloaded frame, and its playback is not asserted.

The same local HTTP/CDP performance smoke test used previously gave:

| Initial transfer | Previous engineering pass | Layout pass |
|---|---:|---:|
| Desktop Home | 1.413 MB | 1.416 MB |
| Phone Home | 0.442 MB | 0.444 MB |
| Darkroom | 2.202 MB | 2.320 MB |

Home adds about 2.4KB of layout/state code. Darkroom remains within the earlier 2.2–2.6MB measurement range; its more compact geometry also affects which lazy thumbnails enter Chrome's loading window. Repeat Home was cached, with 104 reported transfer bytes. No initial audio requests occurred. The same optimized images dominate requests, and no original-image archive or PhotoSwipe core is fetched on initial Home.

Unthrottled local LCP in this smoke sample was 240ms desktop Home, 108ms Darkroom, and 124ms phone Home. These are noisy single samples, not a claim of further timing improvement; desktop LCP still identifies the paper background. The previous original-site transfers of 113MB/409MB remain eliminated. Sharp, responsive images, lazy media, GIF posters, local fonts/libraries and deferred audio are unchanged.

## Files and review artifacts

Changed: `style.css`, generated `generated/site.css`, `js/main.js`, `js/mobile.js`, `js/lightbox.js`, `js/renderer.js`, `tests/browser.cjs`, `README.md`, and the generated manifest timestamp. Added: `tests/layout.cjs` and this report. No dependencies, authored content, original assets, deployment settings or information architecture changed.

Local ignored artifacts are under `.test-results/layout/`: before screenshots, `before-geometry.json`, final `home-*.png`, `index-*.png`, `art-*.png`, `results.json`, and `performance.json`. The README includes the test command.

Physical iPhone/Safari review remains necessary: this environment has Chromium touch emulation but no installed WebKit engine or attached iPhone. In particular, check toolbar expansion/collapse, safe-area insets, fractional text rasterization, and scrolling from the inner navigation paper to the surrounding INDEX overlay. The implementation uses `100dvh` for the overlay, stable viewport units for artifact caps, and no user-agent/device-width hacks.
