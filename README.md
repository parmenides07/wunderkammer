# Professional website and Zibaldone

This is the single `parmenides07/wunderkammer` repository for **paramghetia.com**:

- `/` keeps the existing professional website, content, receipt UI, CSS, routing and mobile behavior.
- `/personal/` is now **Zibaldone**, with its own white spatial canvases, renderer, fonts and visual editor.
- `zibaldone/` holds the copied application, editable JSON in `pages/`, and normal files in `assets/`. There is no nested Git repository.
- `personal/` is generated, read-only public output and **is tracked**, matching the existing branch-based Pages workflow.
- The old Markdown archive stays in `content/`, `generated/`, and Git history. It is not automatically imported into canvases. See [old URL status](zibaldone/LEGACY-URLS.md).

## Local commands

Run these from `~/Documents/Code/portfoliosite/` with Node 22.13 or newer:

```sh
npm run dev                 # local Zibaldone editor + preview of both experiences, port 4173
npm run dev:professional    # existing Markdown live-reload workflow, port 5173
npm run build              # professional build + isolated personal build; never pushes
npm run build:personal     # validate/build ONLY Zibaldone into personal/
npm run test:all            # both unit/server/Git suites
npm run test:browser        # professional desktop/mobile + static integration checks
npm run test:zibaldone:browser # full spatial viewer/editor/publishing browser suite
```

With `npm run dev`, open:

- Professional preview: <http://127.0.0.1:4173/>
- Personal viewer: <http://127.0.0.1:4173/personal/#/home>
- Editor: <http://127.0.0.1:4173/personal/?edit5500#/home>

The professional preview at 4173 serves the last professional build. Use the
separate live-reload command when editing Markdown. `PORT=4174 npm run dev`
selects another local port. The editor remains loopback-only and retains its
Host/Origin/token protections; the query parameter is not authentication.
`npm start` and `npm run dev:zibaldone` also launch this editor.

## Hash trails

`/personal/` normalizes to `#/home`. Each hash component is a globally unique
canvas slug, not a folder. Both `#/home/art/comics` and `#/home/comics` resolve the
same `comics.json` **if that canvas exists**. Existing authored canvases are
`home`, `art`, `field-notes`, `co-26`, `cga-dl02`, and `mlgo-00`.
For example `/personal/#/home/co-26/cga-dl02` works now. Refresh, direct opening,
Back/Forward, and breadcrumb pruning use the URL itself. A new tab opened with a
trail restores that explicit trail; no unrelated tab state is shared.

Saved `/space/` and `/zibaldone/` links/assets are interpreted centrally and
adapted automatically. Source JSON is unchanged; generated JSON uses canonical
`/personal/` paths. Internal canvas anchors include the current trail. Old
Markdown URLs without an exact canvas equivalent show an explanation and a home
link; when a corresponding professional page still exists, that is offered too.
No ambiguous last-segment matching or invented content is used.

## Publishing to the existing Pages site

The migration does **not** push or change GitHub settings, remotes, or `CNAME`.
The clean starting commit is saved locally as
`backup/before-zibaldone-integration-20261110` (commit `13fcd2b`).
The original `~/Documents/Code/zibaldone/` checkout is untouched as a backup.

**First publication of this migration:** review the complete diff, run the tests
and build, then commit and push the integration with your normal Git workflow.
Include `zibaldone/`, generated `personal/`, `_config.yml`, and the changed scripts,
tests and documentation. The editor intentionally refuses to auto-commit an
unreviewed application migration. Do not copy the standalone Zibaldone Pages
workflow into this repository.

**After the integration is committed and pushed:** compose locally and click
**Publish** beside Save. It waits for uploads, saves the current canvas, validates
content, builds only `personal/`, stages only `zibaldone/pages/`,
`zibaldone/assets/`, and the required `personal/` output, commits `content.`, then
pushes the configured upstream using existing local Git credentials. It never
builds/stages professional output, stages the whole repository, force pushes,
pulls, or rebases. Unrelated staged files, uncommitted Zibaldone code changes,
independently edited generated personal files, and unrelated unpushed commits
stop publication with an explanation. No changes means no empty commit.

A successful push is not confirmation of a finished Pages deployment. Use the
editor's **Check deployment** link to inspect the repository's Actions runs.
If a push fails, the content commit remains local and Publish can retry it.

### One-time settings to verify

This checkout has tracked generated files, `CNAME` containing `paramghetia.com`,
and no custom deployment workflow. Preserve **Settings → Pages → Deploy from a
branch → master → / (root)** if that is the current configuration. Verify it in
GitHub; the integration does not change it. Keep the existing domain/DNS settings.
No second deployment, workflow opt-in variable, token, or hosted editor is needed.

`_config.yml` excludes `zibaldone/` and development tools from the branch Pages
output. **Do not add `.nojekyll`**, which would bypass those exclusions. If you
later adopt an Actions artifact, explicitly omit authoring source there too.
Source remains available in the Git repository; the hosted website contains only
the generated personal viewer. Existing drafts are not imported or newly exposed.

See [Zibaldone's authoring guide](zibaldone/README.md) for shortcuts and Publish
troubleshooting. Browser tests use Playwright only as optional test tooling; set
`PLAYWRIGHT_MODULE`/`BROWSER_EXECUTABLE` (Zibaldone) or `CHROME_PATH` (professional)
to use existing installations. No runtime dependencies were added.

---

The following retains the professional/archival Markdown authoring documentation.
References to the former personal Markdown interface describe the preserved
archive model; new personal composition uses Zibaldone above.

# Wunderkammer

Param's static personal website: <https://paramghetia.com/>. Desktop keeps the paper desk, draggable index and receipts. On phones and touch tablets, the article fills the screen and an **INDEX** tab opens the navigation papers.

## Authoring

Use Node.js 22.13 or newer.

```sh
npm install
npm run dev:professional
```

Open the printed local URL (normally `http://127.0.0.1:5173/`). Leave the command running, edit Markdown, and save. The manifest, image variants and HTML rebuild automatically; the browser refreshes. Adding, moving, renaming, deleting or unpublishing content also updates navigation. `npm run dev:professional` runs this professional live preview. A plain static file server only serves the last build, so use this preview while editing. Build errors appear in the terminal and preview. Use `PORT=5174 npm run dev:professional` if the default port is occupied.

Create a page without remembering the schema:

```sh
npm run new -- project "Anvesana"
npm run new -- archive "Old sketches"
npm run new -- archive "An idea" --collection ideas
npm run new -- note "A thought" --collection mindfill
npm run new -- project-note "Design log" --project zion
npm run new -- project-note "Design log" --project akasha/jivan
npm run new -- project "Personal experiment" --audience public
npm run new -- --help
```

Use `npm run new`, including `run`; `new` is this repository's npm script. The original flag form still works: `npm run new -- --type project --title "Anvesana"`.

Projects go in `content/projects/<project>/index.md`, with a nearby `assets/` directory. Notes go in `content/notes/`; archive entries go in `content/archive/`. Either can optionally belong to a collection. New projects start as published WIP pages in **both** the professional root and personal view. Notes and archive entries default to the personal view. Project notes inherit their project's audience and live beside its overview, even if its folder has moved. Use `--audience public` for a personal-only project; `--audience professional` and `--audience public,professional` are also available for sections included in the professional view.

Creation rebuilds the generated site and prints the file and page links. With `npm run dev:professional` running, the browser also refreshes automatically. No project registration or allowlist edit is needed. Navigation uses the project title exactly as entered, including capitalization (`"ZION"` displays as **ZION**), while folders and URLs use lowercase slugs. Existing configuration labels can override the title.

Set `published: false` to leave a page out of navigation, or keep drafts in `content/drafts/`. `status: archived` marks a retained page as archived; creating an `archive` entry places new content in the personal Archive section. Saving with the dev server running rebuilds automatically; otherwise run `npm run build` after edits. Creating a page never overwrites an existing file.

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
type: note
audience: [public]
status: wip
published: true
created: 2026-09-29
topics: [computation, philosophy]
---

Your Markdown here.
```

Required fields are shown through `created`; the section and project/collection are inferred from the folder. `topics` is optional. `modified` defaults to `created`; update it when you want a changed page marked unread. Dates are explicit, never filesystem timestamps. Keep IDs and slugs stable when moving files to preserve existing links and visit history. Newly scaffolded pages omit the redundant location fields.

- Sections: `home`, `projects`, `notes`, `archive`, `about`.
- Types: `home`, `project`, `project-note`, `note`, `essay`, `log`, `collection`, `archive`, `about`.
- Statuses: `active`, `complete`, `wip`, `paused`, `superseded`, `archived`.
- Add `professional` to `audience: [public, professional]` to include a page in the curated root `/`. Public-only pages remain in `/personal/`.
- Optional fields include `topics`, `order`, `featured`, `summary`, `banner`, `sound`, and `navTitle` (receipt label).

The folders under `content/` define the navigation hierarchy. For example, `content/projects/akasha/jivan/index.md` appears under **Projects → Akasha → Jivan**, and `content/archive/career/` appears under **Archive → Career**. The build derives `section`, `project`, `collection` and the owning folder from each file's location; old `project`, `collection` or `parent` frontmatter cannot put a moved file back in its previous container. `site.config.json` can adjust display labels and ordering, but cannot create a project without published content. New projects use their overview title without any configuration entry. Receipts list only the files directly in their folder. Topic tags remain independent. Home, About and Currents still select their professional/personal sources by audience.

## Semantic internal links

Use logical routes in Markdown; the current view chooses the right source:

```md
[[about|About]]
[[currents|Currents]]
[[projects/zion]]
[[personal:notes/philosophy/maximalist-soul-driver|older philosophy note]]
```

Without a label, the resolved page title is used. Canonical lowercase routes are preferred. Exact case-insensitive route spelling is accepted, so existing `[[About]]` and `[[Currents]]` work; arbitrary titles and fuzzy matching are not supported. Labels are plain text. Code spans and fenced examples are not interpreted as links. External links remain ordinary Markdown.

Normal links retain `/` or `/personal/` and use hash navigation, including Back/Forward. `personal:` explicitly enters the personal view. A normal link to a page excluded from the current view is an authoring error; use `personal:` when crossing views intentionally. Missing targets (including projects not yet published), malformed syntax and ambiguous routes are errors in `npm run check`, with source filename, link and reason. No left-paper printer sound plays for inline links.

The checker also rejects any visible container with no renderable descendant, identifying its ID, label and view. Unpopulated configuration entries that are pruned from navigation, such as reserved future projects, remain harmless.

## Shared pages and identity variants

Most projects stay one source with `audience: [public, professional]`; no variant metadata is needed. Root applies the section list in `site.config.json` → `views.root.navigation`. A published project with `professional` in its audience automatically appears there. `views.root.projectOrder` sets preferred ordering only; projects absent from that list appear afterward. Public navigation uses all published public pages.

Home, About and Currents have separate editorial sources under `content/home/`, `content/about/` and `content/currents/`, each named `professional.md` or `personal.md`. Edit these files directly. Personal Home/About preserve their previous prose. The other four files are published WIP skeletons with non-rendered author comments; write them before sharing the root site.

Variant frontmatter uses a unique ID and a common logical slug/group (alongside the normal required title, section, type, status, published and created fields):

```yaml
id: about-professional
slug: about
variantGroup: about
variant: professional
audience: [professional]
```

The personal file uses its own unique ID, the same `slug: about` and `variantGroup: about`, `variant: personal`, and `audience: [public]`. `/#/about` resolves the professional source; `/personal/#/about` resolves the personal source. Home and Currents work the same way.

An explicit variant wins over a shared fallback in that view. If adding a variant over an existing shared route, give the shared file the same `variantGroup` but omit `variant`. One shared fallback and one explicit variant per mode are allowed; ambiguous duplicates fail the build. Ordinary accidental duplicate slugs still fail. Each variant must have the single matching audience. IDs always remain globally unique.

Root currently shows Home, Projects, About, Currents. Its preferred project order is `zion`, `cornocupia`, `vivarium`, `mindscape`, followed by other published professional projects. Empty projects are omitted. Only the existing Mindscape overview is professional-visible; its child pages remain personal. ZION's previous `projects/akashom` routes and older file links remain aliases to its current pages.

Left-paper clicks play the original `printer2.mp3` once. Receipt/next-page clicks use the existing page-flip effect instead. Actual receipt tuck/open changes play `tuck1.mp3`, excluding initial placement and resize synchronization. Both respect mute and load on demand.

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

## Folder navigation

The left paper expands only the active ancestor path. Only containers with child containers have disclosure arrows. Every row occupies one ruled line, including on phones. Receipts show direct pages, never recursive descendants, with the container's name as the heading.

Entering a container opens its first direct page; if there are none, it descends through the first visible child containers until it finds a page. Ordering and audience filtering apply first. Selection and the receipt follow the container owning the resolved page, and ancestors expand. Explicit leaf URLs are never replaced with a first page. Receipts always stay mounted: zero or one direct page tucks the paper; two or more open it, including index pages. Receipt state is automatic in both views: desktop receipts slide upward out of view when tucked; mobile keeps its existing INDEX tuck movement. There is no manual receipt control. The lined-paper tuck control remains available on desktop. Bobbing is disabled. The desktop connector appears only after entering a different multi-page container with an open, settled receipt; it is disabled on mobile.

Create subfolders to subdivide a project; no `groups` registration or `parent` field is needed:

```text
content/projects/akasha/
  index.md
  jivan/
    index.md
    assets/
```

This creates an Akasha container with a nested Jivan container. Akasha's receipt contains its own `index.md`; Jivan's receipt contains the files in `jivan/`. Moving the Jivan folder back to `content/projects/jivan/` makes it a top-level project again on the next rebuild. A folder with only assets, drafts or pages excluded from the current audience does not create a visible container. Legacy `groups` configuration does not override the filesystem hierarchy.

Folder URLs use `#/browse/projects/akasha/jivan`; published pages retain their own stable `slug` URLs when moved. For example, Jivan's existing `#/projects/jivan` link still opens the page, with Akasha → Jivan selected. Aim for one or two group levels.

## Asset review

`npm run check` also reports exact duplicate assets (by bytes), obvious editor backups and possibly unreferenced files under `assets/` and `content/`. References include Markdown, gallery macros, frontmatter, HTML, CSS and local application scripts. Dynamic paths can produce false positives, so these are review warnings, not deletion instructions or build failures. Nothing is removed or recompressed in place. Generated WebPs remain build outputs; `npm run dev:professional` caches them as before. Git push has no mutation hook, and deployment remains unchanged.

## Mathematics

Use `$n$` for inline math and `$$...$$` for displayed equations. Multiline displays can contain standard LaTeX, including fractions, subscripts, Greek letters, sums, minima and `aligned`:

```latex
$$
\begin{aligned}
f(n) &= g(n) + h(n) \\
\mu &= \frac{1}{N}\sum_{i=1}^{N} x_i
\end{aligned}
$$
```

The shared Marked renderer uses KaTeX in both views, including projects and archives. The build bundles its stylesheet and fonts locally. Wide displays scroll within the reading column and can be focused to scroll with the keyboard. Code spans/fences remain literal; escape a literal dollar sign as `\$`.

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

MP4 and WebM clips use the same syntax: `![Simulation in motion](assets/vivariummain.mp4)` or `![Animation](assets/clip.webm)`. Like GIF previews, they start paused with the same centered play button; playback uses the same smaller corner pause button. Click/tap the video or its button to toggle playback, or focus the button and press Enter/Space. Pausing keeps the current frame and resuming continues from that position. Videos stay muted, looping and inline with no native control bar, using the image width, margins and borders without cropping. Playback pauses offscreen or in a hidden tab; it resumes when visible only if the reader had left it playing. Leaving the page releases the video. Reference-style images and `images{assets}` galleries (including `full`) also support videos. Ordinary download links remain links; clicking a video never opens the image viewer.

The build preserves originals and creates quality-90 WebP sizes up to 600, 1200, 2000 and 2800 pixels wide without enlarging small sources. Small images keep their original encoding. Content hashes cache unchanged work. The first build is slower; subsequent writing builds reuse the variants. Gallery thumbnails use column-specific sizes. Large animated GIFs show a lightweight still preview with a centered triangle play button; during playback, a smaller pause button sits in the corner. Both controls support keyboard and touch input. Opening or playing them fetches the original animation. **Open original** in the viewer always offers the author's original file.

PhotoSwipe loads only when an image opens. Its next/previous images are local to that article, with one neighboring image preloaded. Desktop supports keyboard arrows, Escape and zoom; touch supports swipe, pinch and pan. Explicit authored links around images remain links.

Existing `#multiply`, ambient `sound:` frontmatter and legacy `![sound:assets/song.mp3](assets/cover.jpg)` behavior remain supported. Ambient sound starts after interaction, effects load on demand, and mute persists. HTML/video iframes are lazy; CSV tables are parsed locally.

### Inline PDFs

Put a PDF beside the page's other assets, for example `content/projects/paragonalia/assets/paper.pdf`, and write this in `model.md` in the same project folder:

```md
![Paper title](assets/paper.pdf)

[Download paper](assets/paper.pdf)
```

The image syntax creates an inline, vertically scrolling document; the ordinary link stays a link. Alt text becomes the accessible document title. `.PDF` also works. For spaces or special characters, use standard Markdown destinations such as `![Paper](<assets/my paper.PDF>)` or `![Paper](assets/my%20paper.PDF)`. Relative paths work in both `/` and `/personal/`. Add the original PDF and Markdown to version control, then use the usual dev/build workflow; no configuration or manifest edits are needed.

The compact strip shows the title, current/total page count, **Open PDF** and **Download**. Both actions use the original bytes. Pages fit the existing article width, preserve their typesetting and aspect ratio, and use the article's normal scrolling. There is no nested reader scrollbar or page-turn control.

PDF.js, its worker, fonts, character maps and decoders are bundled locally. Its renderer loads only when an embed approaches the viewport. The build reads local PDFs' page boxes (cached by file bytes); it never passes PDFs to Sharp. At most six nearby page canvases/text layers are retained per active document, with two concurrent renders, a four-million-pixel canvas limit, and device-pixel-ratio scaling up to 3. Distant resources are released; navigation cancels rendering and terminates workers. Range requests reduce fetching when the host supports them; servers without ranges may deliver the whole original PDF.

Text selection/copying uses PDF.js's supported text layer and upstream styles, isolated from article styles. Browser Find and assistive technology can access loaded text, but virtualization limits this to retained pages and does not reproduce the PDF's complete tagged reading structure. Use **Open PDF** for full-document search, printing, zoom, interactive annotations/forms, passwords, or the original PDF's accessibility features. Scanned PDFs need their own OCR text. A failed preview keeps the original links available. External PDFs need CORS permission and acquire their page dimensions progressively; local PDFs provide the most stable layout. Modern browsers supported by the bundled PDF.js release are required for previews; original links remain available if rendering fails.

`npm run check` reports missing local PDFs with their source file. `tests/fixtures/pdf/` contains 1-, 10-, and 40-page Typst documents with mathematical notation and vector diagrams. Run `PLAYWRIGHT_MODULE=/path/to/playwright node tests/pdf.cjs` against `npm run dev:professional` for PDF browser checks in both views at mobile, desktop and wide-desktop widths. Fixtures are overlaid only in the test browser; they do not become site content.

## Files and build output

Edit `site.shell.html` for the shared HTML shell and `style.css` for styles. Do not hand-edit generated output:

- `index.html`, `personal/index.html`, `work/index.html`
- `manifest.json`
- `generated/pages/`, `generated/images/`, `generated/image-index.json`
- `generated/site.css`, `generated/vendor/`
- `generated/documents/` (PDF page dimensions; the local `cache.json` is ignored)

Commit generated output along with source edits for the existing GitHub Pages deployment. `CNAME` and hash routing are unchanged. There is no framework, bundler or application server in production. `npm run dev:professional` is a local authoring tool only.

`build.js` parses YAML, validates it, generates clean Markdown, optimizes images and copies the small local runtime libraries/fonts. `js/content.js` filters the audience before grouping; `js/navigation.js` separates direct pages from unread descendants; `js/renderer.js`, `js/images.js`, `js/lightbox.js` handle content and media; `js/main.js`, `js/mobile.js` and `script.js` handle routes, mobile navigation and paper effects.

`/` is the curated professional view; `/personal/` is the full public view. `/work/` redirects to root, preserving query and hash. Personal-only page links requested at root redirect to their `/personal/` equivalent; unknown routes keep the styled 404. Internal links retain the current shell. This is curation, not security. Review Home/About before sharing it. A static repository does not make authored files private. Add old slugs to `legacy-routes.json` when changing a route. Visit state uses stable IDs; scroll positions are remembered within the current browsing session.

## Browser and performance checks

With the site running and Playwright available:

```sh
PLAYWRIGHT_MODULE=/path/to/playwright node tests/browser.cjs
PLAYWRIGHT_MODULE=/path/to/playwright node tests/math.cjs
PLAYWRIGHT_MODULE=/path/to/playwright node tests/videos.cjs
PLAYWRIGHT_MODULE=/path/to/playwright node tests/content-folders.cjs
PLAYWRIGHT_MODULE=/path/to/playwright node tests/nav-links.cjs
node tests/page-controls.cjs
PLAYWRIGHT_MODULE=/path/to/playwright node tests/identity-audio.cjs
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

Both views and the alias run from the same `npm run dev:professional` server. `npm run check` validates their mode selection, routes, aliases, personal-only fallback, generated shells and audience-filtered direct receipts. `site.config.json` → `views` controls entry titles/descriptions. `views.personal.noindex` is initially `true`, generating `noindex,follow` only for the personal entry shell; set it to `false` and rebuild to remove that directive. Personal content remains public. No prominent personal-view link is added.

See [VIEW-MODES.md](VIEW-MODES.md) for the current curated-root/personal routing model and automatic mobile receipt behavior.

The top-left back arrow retraces internally visited pages in the current shell, falling back to Home. Browser Back/Forward restores the corresponding internal trail. The bottom red arrow advances only to the next visible direct sibling: Home → About → Currents at the root, or the next leaf within the current project/group. It disappears at the end of that set.
