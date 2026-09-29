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
- Add `professional` to `audience: [public, professional]` to include a page in `/work/`.
- Optional fields include `project`, `collection`, `topics`, `order`, `featured`, `summary`, `banner`, `sound`, and `navTitle` (receipt label).

Folders are authoring conveniences. `project` and `collection` define containers; `site.config.json` sets their labels/order. The left paper contains containers; each receipt lists only its direct leaf pages. Topic tags remain independent. A future Now page can use `section: about` and `slug: about/now` without navigation code changes.

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

- `index.html`, `work/index.html`
- `manifest.json`
- `generated/pages/`, `generated/images/`, `generated/image-index.json`
- `generated/site.css`, `generated/vendor/`

Commit generated output along with source edits for the existing GitHub Pages deployment. `CNAME` and hash routing are unchanged. There is no framework, bundler or application server in production. `npm run dev` is a local authoring tool only.

`build.js` parses YAML, validates it, generates clean Markdown, optimizes images and copies the small local runtime libraries/fonts. `js/content.js` filters the audience before grouping; `js/navigation.js` separates direct pages from unread descendants; `js/renderer.js`, `js/images.js`, `js/lightbox.js` handle content and media; `js/main.js`, `js/mobile.js` and `script.js` handle routes, mobile navigation and paper effects.

`/work/` is curation, not security. Review Home/About before sharing it. A static repository does not make authored files private. Add old slugs to `legacy-routes.json` when changing a route. Visit state uses stable IDs; scroll positions are remembered within the current browsing session.

## Browser and performance checks

With the site running and Playwright available:

```sh
PLAYWRIGHT_MODULE=/path/to/playwright node tests/browser.cjs
PLAYWRIGHT_MODULE=/path/to/playwright node tests/layout.cjs
PLAYWRIGHT_MODULE=/path/to/playwright node tests/performance.cjs current
```

`SITE_URL` and `CHROME_PATH` override the default local URL and Chrome executable. Tests include phone/touch emulation, pinch/swipe gestures, multiple viewport sizes, the work view, history, receipts, audio and paper controls. Reports are written to `.test-results/`. See `PERFORMANCE.md` for measured before/after results and remaining review items.

The paper components use source-image geometry: `.card` defines `--paper-width` and derives ruled rows from its artwork; `.receipt` defines `--receipt-width` and bounds only its entry list. Change these component scales rather than stretching their backgrounds. Mobile touch rows span whole printed rules. The grid surface has a constant texture scale and a viewport-sized layer on mobile. See [LAYOUT.md](LAYOUT.md) for measurements, screenshots, routing behavior, and Safari review notes.
