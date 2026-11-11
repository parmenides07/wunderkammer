# Zibaldone — spatial authoring and static publishing

Zibaldone (formerly Space) is an independent vanilla HTML/CSS/JavaScript editor
inside the Wunderkammer portfolio repository. Each page is an infinite white world
with DOM text, ordinary images, links, and SVG polylines. There are no runtime npm
dependencies. The original native Zion application stays in the separate backup checkout.

## Local editing inside Wunderkammer

From `~/Documents/Code/portfoliosite/` (the Git repository root), run `npm run dev`.
Open <http://127.0.0.1:4173/personal/?edit5500#/home> to edit, or
<http://127.0.0.1:4173/personal/#/home> to view. The professional preview remains at
<http://127.0.0.1:4173/>. Its original live-reload workflow is now
`npm run dev:professional` at port 5173. Node 22.13 or later is required by the
containing repository. `PORT=4174 npm run dev` changes the authoring port.

Only `?edit5500` loads editor code on the development server. `?edit` does not.
Neither enables editing on the static site. The parameter is not authentication:
the server binds to loopback, checks Host/Origin and a random per-server token,
and refuses `NODE_ENV=production`. No browser Git credentials are introduced.

The original standalone checkout is preserved. This directory is its migrated
web source, with no nested `.git` and no competing deployment workflow.

## Editor controls

The existing **Edit** and object property panels can be collapsed. Choose a page
from the selector, or use **New page** and a unique slug. `home` is the homepage;
other canvases have stable IDs used in `/personal/#/slug` hash trails.

| Action | Control |
| --- | --- |
| Add text | Double-click blank space, or **Text** at the camera target |
| Edit text | Double-click text, Enter on a selected text object, or **Edit text** |
| End text editing | Escape, blur, or select another object |
| Select | Click an object; Shift+click adds/removes it |
| Marquee selection | Drag blank space with the left mouse button; Shift adds to the selection |
| Move selection | Drag a selected object; relative positions are preserved |
| Resize text | Right, bottom, or corner handles; W/H remain independent of font size |
| Resize image | Corner handle or W/H; **Keep aspect ratio** is on by default |
| Add image | **Image**, or drop PNG/JPEG/GIF/WebP files onto the canvas |
| Typography | Font, Size in px, alignment, unitless Line height, Spacing in em |
| Optional shadow | **Shadow**, on text or images; no padding or rounded corners |
| Lock/unlock | **Locked** in selection properties; prevents movement/resizing, including nudging |
| Z-order | **Z**, **Bring forward**, **Send backward**; buttons change Z by one |
| Focus eligibility | **Maximizable** on text/images |
| Text inversion | **Invert on hover**, disabled by default |
| Links | Set/clear **Link**; **Follow ↗** follows it while editing |
| Delete selection | Delete/Backspace, or **Delete** |
| Clear selection / cancel line | Escape |
| Nudge selection | Arrow keys: one grid unit; Shift+arrow: five |
| Temporary unsnapped movement/resize | Hold Alt; releasing it restores the **Snap** setting |
| Copy / cut / paste | Ctrl/Cmd+C / X / V |
| Duplicate | Ctrl/Cmd+D; creates copies one grid unit right/down |
| Undo / redo | Ctrl/Cmd+Z / Ctrl/Cmd+Shift+Z; Ctrl+Y also redoes; toolbar buttons available |
| Desktop pan | Two-finger trackpad scroll, Space+left drag, or middle-button drag |
| Desktop zoom | Mouse wheel, trackpad pinch reported as Ctrl+wheel, or Ctrl+trackpad scroll |
| Touch pan | One-finger drag; two fingers never change canvas zoom |
| Move on touch | Tap to select, then drag; a second finger cancels a pending move |
| Save entry view | **Set starting view**, then **Save** |
| Save composition | **Save** or Ctrl/Cmd+S |
| Publish saved content | **Publish** beside Save; saves this canvas first, then commits and pushes |

A click in an overlap selects the topmost object. Higher Z renders above lower Z;
equal Z preserves JSON order, with later elements on top. Selection never raises
an object. Use an exposed part, marquee selection, or Send backward to reach an
object underneath. Locked objects can still be selected and unlocked in the same
panel. They can be copied, deleted, or have text/properties edited; only movement
and box/vertex resizing are blocked. Group movement skips locked members.

History is local to the open canvas/tab, bounded to 100 completed operations.
An entire drag or multi-object edit is one operation; text changes are committed
when in-place editing ends. New edits after undo discard redo. Saving records the
exact saved snapshot, so undoing back to it clears the unsaved indicator. Reloading
starts fresh history. Camera panning is not a content edit; setting the initial
view is. Upload undo removes the image object, leaving the shared asset file.

While typing in text or property fields, native caret navigation, clipboard, and
undo/redo remain with the browser. Text paste is plain text. Object copy preserves
all properties and relative positions; paste/duplicate creates unique IDs and
reuses image files. Repeated paste adds one extra grid unit of offset each time.
The clipboard supports other local canvases; a localStorage copy (with in-memory
fallback) is used if no system clipboard text is available. Ordinary text on the
system clipboard is never interpreted as objects. Viewer copying is untouched.

## Drawing lines and arrows

Choose **Line**, then click the first point. Move to preview the next segment and
click to establish a bend. The small routing selector is shown only while drawing.

- **Orthogonal** is the default: a horizontal/vertical elbow reaches the cursor.
  Tab flips horizontal-first versus vertical-first routing.
- **Direct** draws straight segments between clicks at any angle.
- Enter finishes, including the current preview; double-click finishes at that
  point. Backspace removes the last clicked point and its automatic elbow.
- Escape discards the unfinished line. Finish/cancel before saving.
- Points snap to the world grid. Space/middle drag and wheel gestures still move
  the camera while drawing. All preview/edit coordinates use the camera transform.

Select a line to reveal its vertices. Drag a vertex to move a bend, or drag the
stroke to move the whole line/selection. Double-click a segment to insert a vertex
at its nearest snapped point. Start/end X/Y fields edit the first and last points.
The existing stroke style, width, end-arrow, Z, lock, and delete controls apply.
Editing a vertex is free positioning; it does not automatically reroute its
neighbors. Lines never connect to objects or avoid obstacles automatically.

## Viewing and camera behavior

Text links retain their muted red hover/keyboard-focus feedback. Opt-in text
inversion uses a white difference overlay covering the whole grid rectangle,
including empty regions and overlapping content. Interactive images scale 1.025×
about their center over 150 ms. Reduced motion disables the scale and color
transitions; touch-only devices and the editor do not activate these hover effects.

Maximizable unlinked objects open on click. Linked objects navigate normally and
have a separate discreet ↗ focus action. This control is visible on touch devices.
Non-maximizable, unlinked objects are plain content, with no interactive cursor,
focus button, or hover feedback. Links work regardless of the maximizable setting.
Focus shows only the object on white: images fit, text reflows and scrolls at a
readable size. **Close ×** or Escape returns to the exact previous camera.

Wheel hardware cannot be identified perfectly. Auto mode treats fine/diagonal or
continuous varying pixel deltas as trackpad panning, and coarse/line/page ticks as
mouse zoom. A pan stays a pan through its momentum tail. Use **Input → Mouse** or
**Trackpad** to override detection; this local preference also applies to viewing.
Ctrl+scroll still zooms on desktop. Zoom remains centered on the pointer.

Mobile exposes a smaller portion of the same world; nothing stacks or rearranges.
Touch never changes canvas zoom. Native browser pinch magnification remains
available for accessibility, with no viewport scaling restriction.

## Navigation trail

The same 30px white breadcrumb strip records the path in the URL:
`/personal/#/home/art/comics`. The canvases are independent; a different trail
ending in `comics` opens the same uniquely named canvas. Existing flat slugs are
already unambiguous IDs, so the JSON schema does not need a migration.

Normal links append a destination, or truncate to its earlier occurrence.
Breadcrumb anchors truncate explicitly. Refresh and browser Back/Forward restore
exactly that hash trail, with no session storage handoff. Direct links and new
tabs restore the trail written in their URL. An empty hash becomes `#/home`.
External links do not change it. Missing or unmigrated legacy routes show an
explanation and a home link; see [the URL audit](LEGACY-URLS.md).

Canvas changes reuse the renderer and camera with the destination's saved start
view. The editor clears selection and starts a fresh canvas undo history after
confirming any unsaved departure. Navigation waits for active saves/uploads or
publishing to finish. In-place editing, focus isolation, mobile trail scrolling,
and the existing hover treatment are preserved. Focus temporarily hides the trail.

## JSON format and defaults

Compositions live in `zibaldone/pages/<slug>.json`; images/fonts are normal files
in `zibaldone/assets/`. One grid unit is 24 CSS px at zoom 1. Camera X/Y designate
the world point at the viewport center. Coordinates may be negative and unbounded;
zoom is limited to 0.08–8. Example elements within a page:

```json
{
  "slug": "home",
  "camera": { "x": 0, "y": 0, "zoom": 1 },
  "elements": [
    {
      "id": "note", "type": "text",
      "x": -6, "y": 2, "width": 12, "height": 7,
      "text": "A line of text.\nAnd another.",
      "font": "mono", "fontSize": 16,
      "lineHeight": 1.4, "letterSpacing": 0,
      "shadow": false, "locked": false,
      "href": "/personal/#/field-notes"
    },
    {
      "id": "picture", "type": "image",
      "x": 8, "y": -4, "width": 12, "height": 8,
      "src": "/personal/assets/zion.png", "alt": "Zion workspace",
      "lockAspect": true, "maximizable": true
    },
    {
      "id": "arrow", "type": "line",
      "points": [[2, 4], [8, 4], [8, 12], [15, 12]],
      "strokeStyle": "dotted", "strokeWidth": 1,
      "arrowhead": true, "zIndex": -1
    }
  ]
}
```

- Text/images use independent grid X/Y/W/H. Image resizing snaps the dominant
  axis and derives the other when aspect ratio is locked. **Snap** can be disabled.
- `font` is `mono` (bundled JetBrains Mono) or `baskerville` (system Baskerville,
  then Palatino/Georgia). `fontSize` is independent of box dimensions. `align`
  defaults to `left`. `lineHeight` defaults to the existing canvas appearance,
  1.4, and accepts 0.5–4. `letterSpacing` defaults to 0 em and accepts -0.1–1 em.
  Explicit values also apply in focus; legacy text keeps the old 1.6 focus line
  height when the property is absent. Wrapping/overflow checks use actual DOM text.
- `shadow` defaults to false on text/images. Enabled it shadows the rectangular
  box with `0 4px 14px rgba(0,0,0,0.09)`, not glyphs. No padding/background is added.
- Every element has optional integer `zIndex` (default 0) and boolean `locked`
  (default false). Locking affects only authoring, never public behavior.
- Text/images have `maximizable` (default true); text has `invertOnHover` (default
  false). Inversion requires an interactive element. No text-length heuristic.
- Lines store 2–1000 ordered `[x,y]` points. Legacy `x1/y1/x2/y2` remains supported;
  moving such a line preserves its format, while editing its vertices converts
  that element to `points`. Validation/build never migrate saved compositions.
  `strokeStyle`: solid (default), dashed, dotted; `strokeWidth`: >0–100 px (default
  1); `arrowhead`: false by default, follows the last segment. SVG stroke hit
  areas stay usable at different zooms; empty bounds do not block objects below.
- Links may be `/personal/#/slug`, legacy `/zibaldone/slug/` or `/space/slug/`, HTTP(S), mailto, or tel.
  Assets can likewise retain `/space/assets/` paths. The renderer resolves both
  canonical prefixes against the configured deployment base. External links are
  unchanged. Never manually insert the GitHub repository prefix into saved JSON.
- Missing optional properties supply defaults without changing existing files.
  Text remains visible beyond an undersized box; the editor indicates overflow.

## Saving

Save is explicit. Unsaved edits, pending uploads, and a placed unfinished line
trigger the leave warning. Preview opens the last saved composition. The local
server writes indented JSON using atomic rename and serialized writes. ETags
reject stale saves and duplicate creation. Failed saves retain the current tab
and offer **Download unsaved JSON** before you resolve the disk conflict/reload.

Uploads are limited to 20 MB, JSON to 2 MB, and pages to 2000 objects. Existing
validation, image magic-byte checks, Host/Origin/token checks, safe filenames, and
write-symlink restrictions remain in place. SVG uploads are not supported. Deleting
an object leaves its asset intact so other canvases and undo can still reference it.

## One-click publishing

With the one-time Git setup below complete, click **Publish** beside **Save** in
`?edit5500`. It finishes text editing, waits for pending image uploads, and saves
the current canvas through the normal save endpoint. A failed save or upload
stops publishing. Finish or cancel any unfinished line first.

Publish validates content and builds only the personal subtree, then stages
additions, modifications, and deletions **only** within `zibaldone/pages/`,
`zibaldone/assets/`, and generated `personal/`, commits with the message `content.`, and
pushes to the current branch's configured upstream. This includes other canvases
already saved to disk; save unsaved work in other tabs separately. It never stages
the entire repository or includes professional files, application source changes, or README edits.

The button is disabled during the operation and the status shows **Saving…**,
**Building…**, **Committing…**, and **Pushing…**, followed by the result and abbreviated commit.
Editing pauses until it finishes. **Pushed successfully** means Git accepted the
push, **not** that GitHub Pages finished deploying. For a GitHub remote, **Check
deployment ↗** opens the repository's Actions runs. The existing branch Pages deployment then rebuilds
the site from the pushed output; check its result there.

- No content changes: **Nothing new to publish**; no empty commit is created.
- Unrelated staged files: publishing stops without changing the index. Commit or
  unstage those files yourself, then retry. Previously unpushed commits containing
  non-content files must also be reviewed and pushed manually first.
- Remote changes/divergence: publishing stops. Fetch and reconcile in a terminal;
  Publish never pulls, merges, rebases, or force pushes.
- Failed push: saved files and any new local content commit are retained. Fix the
  reported problem and click Publish again; it retries that commit without making
  an empty second commit.
- Authentication/signing/hook errors: verify the same Git operation in a terminal.
  Git's existing SSH agent or credential manager is used, without terminal prompts
  or browser credentials. No GitHub token is added to JavaScript or static output.

Only one publish can run at a time. Other saves/uploads are rejected while Git is
running; existing queued writes finish first. Avoid simultaneous manual Git
operations. If a server crash leaves `zibaldone-publish.lock` in the Git directory,
stop all authoring servers before removing that stale lock and restarting.

### One-time local Git setup

Run Git commands from the project root containing `package.json` and `zibaldone/`,
not from the inner web-source folder. Check the checkout before publishing:

```sh
git status
git remote -v
git branch -vv
```

If `git status` says this is not a Git repository, restore/use a real checkout of
your GitHub repository first. Do not initialize a replacement repository over
missing history without reviewing what happened. Publish will not initialize or
change your Git configuration automatically.

Set your commit identity if it is not configured (replace the example values):

```sh
git config user.name "Your Name"
git config user.email "you@example.com"
```

Configure the intended GitHub remote, local SSH agent or HTTPS credential manager,
and make a reviewed integration commit containing the application, `_config.yml`,
and generated `personal/` output. Push that setup once from a terminal with `git push -u <remote> <branch>`
(replace both placeholders). This establishes the upstream and lets you complete
any first-time authentication. Use the configured Pages publishing branch (`master` in this checkout). Publish requires one push destination and an existing upstream
branch; it does not publish an initial application/code commit for you.

After that setup, normal content changes need only **Publish**. Application and
workflow changes still use your usual reviewed Git workflow. All Git execution is
inside the loopback development server, protected by the same Host, Origin, and
per-server editor token checks as saving. The public website has no publishing API.

## Static builds and the existing GitHub Pages deployment

Run `npm run build:personal` to validate and generate `personal/` only, or
`npm run build` for the existing professional build followed by this personal
build. `npm run build:zibaldone` is an alias for the personal build. The default
public base is `/personal/`; `ZIBALDONE_BASE_PATH=/repository/personal/` supports a
project-site mount if needed. Hash trails require no rewrite rules or server.
Output may not overlap source; validation completes before replacing generated
output. Source JSON, images, and the Markdown archive are never rewritten.

Only viewer HTML/CSS/JS, adapted page JSON, a label/legacy-route catalog, and normal
assets are generated. `editor.js`, `editor.css`, history/clipboard modules,
`server.mjs`, `publish.mjs`, tokens and authoring APIs are absent. The containing
repository's `_config.yml` excludes this entire source directory from branch
Pages; keep Jekyll enabled and do not add `.nojekyll`.

Keep Wunderkammer's existing branch-based Pages publishing and `CNAME`. There is
no Zibaldone-specific Actions workflow or opt-in variable in this integration.
Verify GitHub **Settings → Pages → Deploy from a branch → master → / (root)**
without changing the existing domain. The professional and personal outputs are
published together by that one deployment.

Review, commit, and push the complete integration once manually. Future saved
canvas changes use **Publish**. It refuses uncommitted application/configuration
changes or unrelated unpushed commits, so an unfinished migration cannot be
published accidentally. Independently edited generated files also require review.

To preview static output without editor capability, use a static server from the
repository root and open `/personal/#/home`. A generic static server exposes source
files by URL, so keep it local; GitHub Pages applies `_config.yml` exclusions.
Use `npm run dev` for the secure local editor and normal preview of both sites.

## Implementation and verification

- `client/model.js`: schema, defaults, grid/camera math, polyline geometry.
- `client/main.js`: shared DOM/SVG renderer and focus view.
- `client/camera.js`: existing desktop/touch input and transforms.
- `client/routes.js`, `trail.js`: central hash builder/parser, breadcrumb anchors and guarded history traversal.
- `client/editor.js`, `editor.css`: local authoring controls and selection.
- `client/history.js`, `clipboard.js`: bounded snapshots and portable object copies;
  both development-only. No full-page snapshot occurs during pointer movement.
- `server.mjs`: loopback routes, safe saves, image uploads, authenticated publish progress.
- `publish.mjs`: development-only validation/build, content/output staging, commit/push, upstream checks and publish lock.
- `template.mjs`, `build.mjs`: minimal HTML and static output allowlist.

```sh
npm run test:zibaldone
npm run build:zibaldone
# Optional browser test tooling; not a runtime dependency:
npm install --no-save --package-lock=false playwright@1.62.1
npx playwright install chromium
npm run test:zibaldone:browser
```

Existing installations can be used with `PLAYWRIGHT_MODULE=/absolute/path/to/playwright`
and `BROWSER_EXECUTABLE=/usr/bin/google-chrome`. The containing professional suite is `npm test`. The original native textboard remains in the backup checkout.

Tests operate on temporary copies, never your compositions. Unit/server tests
cover geometry, old/new schemas, history limits/branching/saved state, clipboard
IDs and properties, conflicts/security, URL bases, and the production allowlist.
Publish tests use disposable Git checkouts and local bare remotes to cover
content-only commits, additions/deletions, no changes, staged-file safety, missing
setup, divergence, authentication/commit/push failures, retries, and concurrency.
Chromium covers wheel drift/pan, transformed hit tests, hover pixels/overlaps,
focus/maximizable/Z behavior, touch without canvas zoom, marquee/group movement,
locks/Alt/nudging, native text undo/clipboard, one-step drag undo, polyline drawing,
vertex insertion/editing, typography/overflow/shadows, save/reload, static routes,
repository subpaths, fonts/images/links, breadcrumb pruning/history, fresh-tab
isolation, canceled unsaved departures, mobile trail scrolling, and editor/API isolation.
They also check Publish progress, pending uploads, failed saves, Git errors,
concurrent requests, and the deployment link without pushing to GitHub. Screenshots
are written to `/tmp/space-*.png` (the historical test artifact prefix).
Touch tests use Chromium emulation; physical mobile keyboard/gesture testing is
still useful. GitHub's hosted deployment itself requires the one-time settings.
