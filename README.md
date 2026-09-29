# Wunderkammer

Param's static personal website: <https://paramghetia.com/>. The paper cards, receipts, dragging, sounds, galleries and scrapbook layout are shared by the public and professional views.

## Build and preview

```sh
npm ci
npm run build
npm test
python3 -m http.server 5173
```

Open `http://localhost:5173/` or `http://localhost:5173/work/`. No bundler, application server, or runtime dependency was added. The existing Marked and PapaParse CDN scripts remain in the shared shell. `gray-matter` is build-time only.

Commit the generated `manifest.json`, `generated/pages/*.md` and `work/index.html` with source changes. GitHub Pages can continue serving the repository as static files; `CNAME` is unchanged. Do not edit generated files by hand. The build removes obsolete generated Markdown outputs when pages are unpublished or removed.

## Authoring

Every published Markdown file in `content/` needs YAML frontmatter:

```yaml
---
id: a-stable-id
title: A page title
slug: notes/a-page
section: notes
type: note
audience:
  - public
status: active
published: true
created: 2026-09-28
modified: 2026-09-28
collection: systems
topics:
  - computation
order: 10
---

Your Markdown here.
```

Required: `id`, `title`, `slug`, `section`, `type`, `audience`, `status`, `published`, `created`. `modified` defaults to `created`. Dates are explicit `YYYY-MM-DD` values, never filesystem timestamps.

Sections: `home`, `projects`, `notes`, `archive`, `about`. Audiences: `public`, `professional`. Statuses: `active`, `complete`, `wip`, `paused`, `superseded`, `archived`. Other supported metadata includes `project`, `collection`, `topics`, `featured`, `order`, `summary`, `banner`, `sound`, and optional `navTitle` (a shorter receipt label that does not replace the document title).

Folders are only an authoring convenience. Projects group by `project`, and notes/archive group by `collection`. Add labels and preferred group order in `site.config.json`; new groups also work without an entry there. Page order comes from `order`, then title. Topics are independent: `SiteContent.createContentModel(manifest, audience).topic('computation')` queries the selected audience's pages.

Keep IDs stable across moves and title changes. Routes use `#/semantic/slug`; when changing an existing slug, add its former slug to `legacy-routes.json`. `visited:<id>` stores unread state and recognizes older path-based visits.

A future Now page needs only `section: about`, `type: note`, a stable ID and slug such as `about/now`, and the remaining required fields. It will join About's receipt automatically.

`published: false`, any `drafts/` directory, hidden folders and `_order.json` are excluded from the manifest. This is curation, not access control; source files on a static host are not private.

## Rendering and assets

The build parses frontmatter, writes clean Markdown to `generated/pages/<id>.md`, and records that URL as `page.source`. `page.authorSource` records the original file with frontmatter; `page.assetBase` records its authoring directory. `renderPage(page)` fetches and caches the clean source. This keeps the manifest small and avoids YAML parsing in the browser.

Keep relative asset paths relative to the authored page. Banners, ambient sound, image sound alt text, `images{folder}`, `images{folder, full}`, `embed{file.csv}`, `embed{file.html}` and `#multiply` retain their behavior. Galleries use the manifest's asset-directory index, loaded once. HTML embeds use their real document URLs so their own relative resources resolve correctly.

The UI's HTML classes and stylesheet are unchanged. `js/content.js` handles the filtered page universe; `js/navigation.js` builds virtual groups; `js/renderer.js` renders pages; `js/main.js` handles routes and cards. `script.js` retains the existing paper effects and event setup.

## Professional view

`/work/` is generated from the root HTML shell. The app filters pages by `professional` **before** creating groups, lookups, topic queries, unread indicators or next-page lists. Unavailable routes display a neutral unavailable message; they do not silently render public-only pages. This view is curation, not security.

**Review Home and About before distributing the work URL.** See `MIGRATION.md` for content review items and the migration inventory.

## Tests

`npm test` covers metadata validation, generated bodies, asset references, aliases, grouping independent of source paths, and professional filtering. The optional browser suite checks pages and physical interactions against a running HTTP server:

```sh
PLAYWRIGHT_MODULE=/path/to/playwright CHROME_PATH=/path/to/chrome node tests/browser.cjs
```

Set `SITE_URL` to override `http://127.0.0.1:5173`. Playwright is a test tool only, not a site or build dependency. Its report is written to ignored `.test-results/browser.json`.
