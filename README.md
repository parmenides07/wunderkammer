# Wunderkammer

Param's static personal website: <https://paramghetia.com/>. Desktop keeps the paper desk, draggable index and receipts. On phones and touch tablets, the article fills the screen and an **INDEX** tab opens the navigation papers.

## Authoring

Use Node.js 22.13 or newer.

```sh
npm install
npm run dev
```

Open the printed local URL (normally `http://127.0.0.1:5173/`). Leave the command running, edit Markdown, and save. The manifest, image variants and HTML rebuild automatically; the browser refreshes. Build errors appear in the terminal and preview. Use `PORT=5174 npm run dev` if the default port is occupied.

Create a page without remembering the schema:

```sh
npm run new -- --type project --title "Anvesana"
npm run new -- --type note --title "Abstraction and Computation"
npm run new -- --type note --title "A thought" --collection mindfill
npm run new -- --type project-note --title "Design log" --project akashom
```

Projects go in `content/projects/<project>/index.md`, with a nearby `assets/` directory. Notes go in `content/notes/`, optionally inside a collection. New pages start as public, published WIP pages—never automatically professional. Set `published: false` to leave a page out of navigation, or keep drafts in `content/drafts/`.

```sh
npm run check  # validate metadata, links, assets, image sizes and alt text
npm test       # regression tests
npm run build # generate static output; never deploys
```

`check` exits nonzero for blocking errors. Existing prose/alt-text issues and large original animations are warnings for author review; they do not get rewritten automatically.

## Frontmatter

```yaml
---
id: a-stable-id
title: Abstraction and Computation
slug: notes/abstraction-and-computation
section: notes
type: note
audience: [public]
status: wip
published: true
created: 2026-09-29
collection: systems
topics: [computation, philosophy]
---

Your Markdown here.
```

Required fields are shown through `created`; `collection` and `topics` are optional. `modified` defaults to `created`; update it when you want a changed page marked unread. Dates are explicit, never filesystem timestamps. Keep IDs stable when moving files.

- Sections: `home`, `projects`, `notes`, `archive`, `about`.
- Types: `home`, `project`, `project-note`, `note`, `essay`, `log`, `collection`, `archive`, `about`.
- Statuses: `active`, `complete`, `wip`, `paused`, `superseded`, `archived`.
- Add `professional` to `audience: [public, professional]` to include a page in the curated root `/`. Public-only pages remain in `/personal/`.
- Optional fields include `project`, `collection`, `topics`, `order`, `featured`, `summary`, `banner`, `sound`, and `navTitle` (receipt label).

Folders are authoring conveniences. `project` and `collection` define containers; `site.config.json` sets their labels/order. The left paper contains containers; each receipt lists only its direct leaf pages. Topic tags remain independent. A future Now page can use `section: about` and `slug: about/now` without navigation code changes.

## Layout profiles

Add optional frontmatter `layout:`. Omitting it preserves the existing default layout. All profiles share the same renderer, paper shell, grid, images and viewer.

| Layout | Use |
|---|---|
| `essay` | Long-form prose, about 70 characters per line; media may use more of the paper. |
| `project` | Familiar project prose with room for diagrams and embeds. |
| `gallery` | Narrow intro, larger images: two columns on desktop/tablet, one on phones, three only above 2400px. |
| `index` | A chronological list of the other direct pages in this container, followed by your unchanged Markdown. |
| `catalog` | Compact headings, lists and definition lists for grouped reference material. |
| `custom` | Shared shell with page-specific styling hooks. |

An index uses `created` dates, newest first, and the current audience filter. Non-active/non-complete statuses such as `superseded`, `paused`, `wip` and `archived` appear beside entries; set `indexStatus: false` to omit them. You do not need to duplicate entry links in Markdown. Existing authored links are preserved.

For a custom page, add `layout: custom` and optionally `layoutClass: orbital-demo`. The shell gets `layout-custom`, `page-<stable-id>`, and `orbital-demo`; target those classes in `style.css`. No separate renderer or stylesheet loader is required.

## Semantic groups and navigation

The left paper expands only the active ancestor path. Only containers with child containers have disclosure arrows. Every row occupies one ruled line, including on phones. Receipts show direct pages, never recursive descendants, with the container's name as the heading.

Entering a container opens its first direct page unless the URL explicitly selects another page. Receipts always stay mounted: zero or one direct page tucks the paper; two or more open it, including index pages. Manual tucking/unfolding persists only within the same container. Entering another container resets that choice. Use the red desktop tuck control for multi-page receipts. Mobile has no manual receipt control: its state always follows the direct-page count. Bobbing is disabled. The desktop connector appears only after entering a different multi-page container with an open, settled receipt; it is disabled on mobile.

Optional `groups` in `site.config.json` can subdivide a project without using its filesystem folders. For example, after creating a project with `project: anvesana`:

```json
"groups": [
  {"id": "anvesana-experiments", "label": "Experiments", "parent": "projects/anvesana", "order": 10},
  {"id": "anvesana-hardware", "label": "Hardware", "parent": "projects/anvesana", "order": 20}
]
```

A page inside Hardware keeps its normal project metadata and adds:

```yaml
project: anvesana
parent: anvesana-hardware
layout: project
```

For another nested group, its config `parent` can be another group ID, such as `anvesana-experiments`. Parent names containing `/` refer to existing section/project/collection containers; group IDs themselves are lowercase hyphenated identifiers. Pages without `parent` remain directly inside their project or collection. Aim for one or two group levels. Empty groups disappear after audience filtering. Unknown parents, duplicate groups, cycles, and pages assigned outside their declared project/collection fail validation.

Group URLs use `#/browse/group/<group-id>`; published pages retain their own stable slugs. These are illustrative definitions, not new projects added to the site.

## Asset review

`npm run check` also reports exact duplicate assets (by bytes), obvious editor backups and possibly unreferenced files under `assets/` and `content/`. References include Markdown, gallery macros, frontmatter, HTML, CSS and local application scripts. Dynamic paths can produce false positives, so these are review warnings, not deletion instructions or build failures. Nothing is removed or recompressed in place. Generated WebPs remain build outputs; `npm run dev` caches them as before. Git push has no mutation hook, and deployment remains unchanged.

## Images and embeds

Keep assets near their Markdown page. All relative paths resolve from that authored page's directory.

```md
![A sketch of the spatial workspace](assets/workspace.jpg)

images{assets/photos}

images{assets/photos, full}

embed{example.html}

embed{measurements.csv}
```

Normal Markdown images automatically get responsive sizing, lazy loading, dimensions and keyboard/touch lightbox controls. A Markdown image title or a following italic caption is used as the viewer caption. Gallery order is filename order; prefix names with numbers to control it. Gallery filenames cannot supply meaningful descriptions automatically, so use individual Markdown images when specific alt text matters.

The build preserves originals and creates quality-90 WebP sizes up to 600, 1200, 2000 and 2800 pixels wide without enlarging small sources. Small images keep their original encoding. Content hashes cache unchanged work. The first build is slower; subsequent writing builds reuse the variants. Gallery thumbnails use column-specific sizes. Large animated GIFs show a lightweight still preview and a **Play animation** control; opening or playing them fetches the original animation. **Open original** in the viewer always offers the author's original file.

PhotoSwipe loads only when an image opens. Its next/previous images are local to that article, with one neighboring image preloaded. Desktop supports keyboard arrows, Escape and zoom; touch supports swipe, pinch and pan. Explicit authored links around images remain links.

Existing `#multiply`, ambient `sound:` frontmatter and legacy `![sound:assets/song.mp3](assets/cover.jpg)` behavior remain supported. Ambient sound starts after interaction, effects load on demand, and mute persists. HTML/video iframes are lazy; CSV tables are parsed locally.

## Files and build output

Edit `site.shell.html` for the shared HTML shell and `style.css` for styles. Do not hand-edit generated output:

- `index.html`, `personal/index.html`, `work/index.html`
- `manifest.json`
- `generated/pages/`, `generated/images/`, `generated/image-index.json`
- `generated/site.css`, `generated/vendor/`

Commit generated output along with source edits for the existing GitHub Pages deployment. `CNAME` and hash routing are unchanged. There is no framework, bundler or application server in production. `npm run dev` is a local authoring tool only.

`build.js` parses YAML, validates it, generates clean Markdown, optimizes images and copies the small local runtime libraries/fonts. `js/content.js` filters the audience before grouping; `js/navigation.js` separates direct pages from unread descendants; `js/renderer.js`, `js/images.js`, `js/lightbox.js` handle content and media; `js/main.js`, `js/mobile.js` and `script.js` handle routes, mobile navigation and paper effects.

`/` is the curated professional view; `/personal/` is the full public view. `/work/` redirects to root, preserving query and hash. Personal-only page links requested at root redirect to their `/personal/` equivalent; unknown routes keep the styled 404. Internal links retain the current shell. This is curation, not security. Review Home/About before sharing it. A static repository does not make authored files private. Add old slugs to `legacy-routes.json` when changing a route. Visit state uses stable IDs; scroll positions are remembered within the current browsing session.

## Browser and performance checks

With the site running and Playwright available:

```sh
PLAYWRIGHT_MODULE=/path/to/playwright node tests/browser.cjs
PLAYWRIGHT_MODULE=/path/to/playwright node tests/views.cjs
PLAYWRIGHT_MODULE=/path/to/playwright node tests/stabilization.cjs
PLAYWRIGHT_MODULE=/path/to/playwright node tests/layout.cjs
PLAYWRIGHT_MODULE=/path/to/playwright node tests/profiles.cjs
PLAYWRIGHT_MODULE=/path/to/playwright node tests/performance.cjs current
```

`SITE_URL` and `CHROME_PATH` override the default local URL and Chrome executable. Tests include phone/touch emulation, pinch/swipe gestures, multiple viewport sizes, the work view, history, receipts, audio and paper controls. Reports are written to `.test-results/`. See `PERFORMANCE.md` for measured before/after results and remaining review items.

The paper components use source-image geometry: `.card` defines `--paper-width` and derives ruled rows from its artwork; `.receipt` defines `--receipt-width` and bounds only its entry list. Change these component scales rather than stretching their backgrounds. Every navigation row spans exactly one printed rule. The grid surface has a constant texture scale and a viewport-sized layer on mobile. See [LAYOUT.md](LAYOUT.md) for measurements, screenshots, routing behavior, and Safari review notes.

See [UI-PROFILES.md](UI-PROFILES.md) for the latest UI/profile pass, screenshot/test results, asset-warning summary and performance smoke measurements.

See [STABILIZATION.md](STABILIZATION.md) for the current mobile text, deterministic receipt rules and validation results.

Both views and the alias run from the same `npm run dev` server. `npm run check` validates their mode selection, routes, aliases, personal-only fallback, generated shells and audience-filtered direct receipts. `site.config.json` → `views` controls entry titles/descriptions. `views.personal.noindex` is initially `true`, generating `noindex,follow` only for the personal entry shell; set it to `false` and rebuild to remove that directive. Personal content remains public. No prominent personal-view link is added.

See [VIEW-MODES.md](VIEW-MODES.md) for the current curated-root/personal routing model and automatic mobile receipt behavior.
