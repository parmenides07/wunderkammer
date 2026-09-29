# Final stabilization pass

No deployment, prose edits, content moves, dependencies, layout-profile expansion, or image-pipeline changes.

## Fixes

Mobile text previously combined text filters, reduced opacity and a multiply-blended wrapper. Navigation and receipts also inherited filtered paper layers; receipt text had small rotations. The browser audit found no article ancestor scale. Mobile readable text now uses no filter, text shadow, rotation or multiply blend, and full opacity. Dates retain a quieter color. Paper shadows are drawn on independent pseudo-elements. The open INDEX overlay uses `transform: none`. Desktop ink rules and text dimensions are unchanged.

Disclosure icons are CSS border triangles with an empty pseudo-element. Expanded state rotates the same triangle. No Unicode triangle remains in the application CSS/JS/shell. One printed rule remains one navigation row; selected `■` continues to override unread `•` without clearing unread state.

Receipt state explicitly holds `selectedContainerId`, `activePageId`, `directLeafPages`, `receiptEligible`, and `receiptTucked`. Direct leaves come from the already audience-filtered semantic container. Zero/one leaf tucks the receipt; two or more open it when entering a different container. A one-page container auto-opens its page; other containers open their first direct page unless a leaf URL is explicit. Manual tuck persists only within that container. The previous index-layout exception is removed. Overview and self-titled pages count normally; tests cover both, zero direct descendants, and work-mode filtering. No separate filename-based counting defect was reproduced.

The receipt paper stays mounted. Same-container page changes only update active-item styling. CSS owns the desktop left-position transition and mobile horizontal tuck transition; no display/opacity/visibility switch hides the receipt. The mobile slot reserves its height during movement, leaving a tucked paper edge. Header remains the selected container's label.

Bobbing and the old connector animation-frame/timeout chain are removed. A desktop connector can fade only after entering another eligible container and its open receipt has settled. Navigation, manual tuck, dragging and resize clear it. Manual reopening and leaf switches do not trigger it. Mobile never draws it. No timer changes receipt visibility.

## Validation

- `npm test`: passing, including five requested direct-leaf cases and container/manual-state reset tests.
- `npm run build`: passing; 266 cached image records reused, no image regeneration.
- `npm run check`: zero errors; 184 pre-existing/non-blocking authoring and asset warnings.
- `git diff --check`: clean.
- Full browser suite: all 38 public pages and 9 professional pages, routes, unread markers, history, desktop drag/tuck, embeds, banners/WIP, next page, audio/mute, mobile INDEX, PhotoSwipe keyboard and emulated touch swipe/pinch. No application console errors or failed local requests.
- Focused stabilization suite: 390px touch and 1440px desktop Home, Darkroom, Akashom, Jivan, Mindfill, Archive/Consumption, Notes and `/work/`; explicit leaf refresh, Back/Forward, manual tuck, selected-container labels, first-leaf routing and rapid Projects → Akashom → Jivan → Darkroom → Akashom repeated four times. Receipt DOM identity remains stable.
- Transition sampling checks intermediate movement, unchanged height, mounted display, and no connector while tucked or after manual reopening. Mobile article, heading, date, navigation and receipt ancestor styles are checked for filters/transforms/shadows/blending. Desktop body filter is compared with its original computed value.
- Existing viewport/profile regression covers 375, 390, 430, 768, 1440 and 1920px without changing those layouts. On desktop, overlapping paper controls are accessed through the existing receipt tuck control.

Screenshots: `.test-results/stabilization/home-390.png`, `index-390.png`, `tucked-390.png` and corresponding desktop captures. These local artifacts are ignored by Git.

## Performance smoke check

Local HTTP/Chrome initial encoded transfers:

| Page | Previous UI pass | Stabilized |
|---|---:|---:|
| Desktop Home | 1,425,109 B | 1,422,505 B |
| Mobile Home | 453,395 B | 450,791 B |
| Darkroom | 2,006,022 B | 2,003,418 B |

Warm Home transferred 832 B of document/revalidation overhead. Source images, generated variants, lazy loading, deferred audio and PhotoSwipe remain unchanged. Local unthrottled LCP was 200ms Home, 120ms mobile Home and 164ms Darkroom; desktop LCP identifies decorative paper, so these are smoke measurements, not real-world speed claims.

## Work completed after resuming

Inspected and preserved the full existing diff and new tests; collected successful interrupted test results; removed an empty superseded CSS block and obsolete toggle argument; reconciled receipt documentation and older test expectations; strengthened explicit-route, first-leaf, text-ancestor and physical-transition assertions; reran validation and performance checks. No earlier implementation was replaced or restarted.

## Remaining manual review

Physical iPhone/Safari and an installed WebKit test engine were unavailable. Chrome touch emulation passes, but real Safari font rasterization, dynamic browser chrome, safe areas, native pinch/pan and scroll restoration still need device review. The compact one-rule navigation rows intentionally have smaller vertical touch targets. Existing desktop papers still overlap; use their tuck/drag controls. Existing Home/About prose was deliberately untouched, including its outdated mobile-support statement.
