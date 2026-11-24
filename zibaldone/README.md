# Zibaldone — spatial authoring and static publishing

Zibaldone (formerly Space) is an independent vanilla HTML/CSS/JavaScript editor
inside the Wunderkammer portfolio repository. Each page is an infinite white world
with DOM text, images, files, links, and SVG polylines. The public viewer has no
runtime npm dependencies. Document parsers run only in Node during local authoring
and builds. The original native Zion application stays in the separate backup checkout.

## Local editing inside Wunderkammer

From `~/Documents/Code/portfoliosite/` (the Git repository root), run `npm install`
after updating dependencies, then `npm run dev`.
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
| Add image | **Image** retains the original quick-add workflow |
| Import a file | Drop onto the canvas or choose **File**, then **Render** or **Attach** |
| Move a rendered document | Drag anywhere in its box, like a text/image object |
| Move a video | Select it, then drag its top edge; playback controls remain usable |
| Replace a file | **Replace source** in the selected file's properties |
| Typography | Font, Size in px, alignment, unitless Line height, Spacing in em |
| Optional shadow | **Shadow**, on text, images or files; no padding or rounded corners |
| Lock/unlock | **Locked** in selection properties; prevents movement/resizing, including nudging |
| Z-order | **Z**, **Bring forward**, **Send backward**; buttons change Z by one |
| Focus eligibility | **Maximizable** on text/images/files |
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
| Touch pan/zoom | One finger pans; two fingers pan and pinch around their midpoint |
| Move on touch | Tap to select, then drag; a second finger cancels a pending move |
| Save entry view | **Set starting view** (saved immediately) |
| Save composition | Automatic; **Save now** or Ctrl/Cmd+S flushes/retries |
| Publish | Choose **Content only** or **All changes (code + content)**, then **Publish** |

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

## Importing real files

Drop files where you want them in the world. A small menu at the drop point offers
**Render** and **Attach**, or just **Attach** for formats without an inline renderer.
Position uses the current camera and grid; Alt temporarily bypasses snapping.
Multiple files keep their input order with a one-grid-unit offset. **File** opens
the same flow from a file picker, using the camera center. Nothing uploads until
you choose a mode. Cancel dismisses the remaining choices.

| Format | Render | Public attachment | Limit |
| --- | --- | --- | --- |
| PNG, JPEG, WebP, GIF | Native image; GIF animates | Original opens in a new tab | 25 MB |
| MP4, WebM | Native video, paused, metadata preload, controls | Original opens in a new tab | 75 MB |
| `.org`, `.md`, `.markdown` | Formatted document preview; click to read in focus | Original inside a ZIP | 2 MB UTF-8 |
| PDF | Attach only | Browser PDF viewer in a new tab | 25 MB |
| ZIP | Attach only | Original ZIP download; never unpacked | 25 MB |
| Text/source files, including unknown extensions or no extension | Plain-text preview; click to read in focus | Original inside a ZIP | 2 MB rendered; 25 MB attached |
| Other binary files | Attach only | Original inside a ZIP | 25 MB |

Text detection checks the bytes, not just a MIME type or extension. C, assembly,
scripts, Makefiles and other text render with their indentation and line breaks.
Plain text accepts UTF-8/ASCII or BOM-marked UTF-16; binary/control data and text
over 2 MB remain Attach-only. HTML/SVG source renders as escaped literal text,
never an executable page or graphic. Older C/assembly/text attachments can also
switch to Render without uploading again. New imports record an optional
`plainText` boolean so unfamiliar extensions retain their detected capability.

Media rendering also depends on the browser's codec support. If a browser cannot
decode a video, use Attach. Filenames with paths, control characters or reserved
punctuation, oversized files, invalid document encoding, and media whose signatures
do not match their extensions are rejected. SVG is deliberately not an inline image.
The older **Image** quick-add keeps its existing 20 MB limit.

Every imported file is one ordinary object. Selection, Shift-selection, marquee,
group movement, independent document/attachment width and height, media aspect
locking, Z-index, locking, shadow, undo/redo and object clipboard all work normally.
Copies share their source file. **File display** switches Render/Attach without
uploading again or changing geometry. **Label** customizes the attachment text.
**Maximizable** controls focus eligibility; attachment links and native video
controls still work when maximizing is disabled.

Documents behave like ordinary text/image boxes on the canvas. In the viewer,
click/tap or Enter opens focus mode, without a secondary arrow. In the editor,
click selects and dragging anywhere in the box moves it; use the existing Focus
control to read it. Trackpad scrolling, Space+drag, middle-drag and touch pan/pinch
continue to control the canvas over document boxes. Previews do not trap scrolling
or expose nested link targets. Focus shows the full document at a readable width,
with normal scrolling, text selection/copying and working document links. Closing
restores the exact camera. The box height controls the preview, not the full reader.
Videos use ordinary browser controls and never autoplay. Opening focus pauses
the inline video; closing focus or leaving a canvas stops that playback too.

### Documents, sources and safety

Markdown uses the repository's existing Marked parser with GFM tables. Org uses
Uniorg for headings, emphasis, lists, quotes, source blocks, links, tables and
`#+TITLE`; TODO labels remain readable. Both pass through the same strict
rehype-sanitize allowlist. Code is displayed, never executed. Scripts, handlers,
styles, iframes, embedded active HTML and unsafe URLs are removed. This is a
document renderer, not a complete Org implementation or rich-text editor.

Headings derive relative sizes from the object's selected font. Xanh Mono,
Baskerville and Zenbones Mono are available with the existing font-size,
line-height, letter-spacing and alignment controls. Width controls wrapping;
height controls the canvas preview. No extra card, padding or background is
added. HTML is regenerated from the canonical source, not stored as editable JSON.

No document reference is automatically imported or fetched. Embedded image
references become text. Safe external links and canonical canvas links remain
anchors in focus mode. Local heading links scroll the document without changing the canvas
route. A simple relative filename link resolves only when a file with that unique
original filename has explicitly been imported; private paths and unresolved
references have no clickable destination. There are no automatic local includes,
Org Babel execution, transclusions or filesystem synchronization.

Original bytes are stored once per upload as
`zibaldone/assets/file-<uuid>.<extension>`. JSON records that source path and the
original filename separately. **Replace source** uploads an immutable new file
and changes only the source reference/filename, retaining the object's layout
and styling. Replacing with an attach-only format selects Attach. Undo restores
the old reference, and originals remain available to other objects.

Static output includes only referenced imported files. Documents generate
`personal/documents/file-<uuid>.<extension>.html`. Passive media, PDF and ZIP use
normal asset URLs. Other source formats download as `.zip`, with their exact
original filename/bytes inside. This avoids executing HTML/SVG as same-origin
pages and prevents GitHub Pages/Jekyll from interpreting uploaded front matter.
The attachment label includes “(ZIP)” when packaged; **Download source** is also
available in properties and focus mode. The raw document/active-format source
URL is intentionally not publicly served. These ZIPs and generated HTML are
reproducible build output; the source file remains canonical.

Wait for **Saved** after imports/replacements. Autosave and Publish wait for the
upload and document validation before saving the final reference. A failed upload
leaves existing objects unchanged and blocks publishing; re-add the corrected
file or reload the safely saved page. Content-only Publish validates source files,
builds the safe downloads/HTML, and includes them with JSON and assets under its
existing Git safeguards. It still refuses unpublished application-code changes.
No source files are removed automatically, and this feature never commits or pushes
on import. Parser versions and license information are in [THIRD-PARTY.md](THIRD-PARTY.md).

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
including empty regions and overlapping content. Interactive images scale 1.02×
about their center over 50 ms (ease-out). Reduced motion disables the scale and color
transitions; touch-only devices and the editor do not activate these hover effects.

Maximizable unlinked objects open on click/tap, with a zoom-in cursor and no arrow.
Linked, maximizable objects navigate normally and retain a separate discreet ↗
focus action: revealed on hover/keyboard focus, or visible on touch devices.
Only these linked objects have arrows. Arrows scale with the canvas and hide when
the arrow or asset rectangle is smaller than 24 screen pixels in either dimension.
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
Pinching zooms the canvas within the existing limits; lifting one finger resumes
panning without a jump. Native scrolling/zooming is suppressed only on the canvas.
Other UI retains normal browser gestures, with no viewport scaling restriction.

Viewer panning currently experiments with **adaptive directional wrapping**.
After an ordinary pan leaves the view completely blank, the next movement chooses
an approach on the opposite side of the viewport-expanded composition bounds.
The angle is continuous, not a choice between neighboring tiles. Turning while
blank changes this approach without restarting its remaining travel distance.
Sub-pixel direction noise is accumulated in half-pixel samples; movement distance
is still consumed. As soon as the viewport could intersect the measured content,
placement locks and normal panning resumes. These conservative bounds can lock a
little before actual ink appears, keeping overflow and visual effects safe.
There is exactly one DOM composition; nothing rotates or mirrors. Initial
clearance is **2 screen pixels** beyond the visual bounds, independent of zoom.
Bounds include overflowing text, line strokes/arrowheads, shadows and hover
extents; layout/font/image changes refresh the cache, not each camera frame.
Zoom, pinch, resizing, navigation and saved entry views never trigger wrapping.
The editor and empty canvases retain unrestricted panning. No JSON fields change.
For an easy internal revert, set `WRAP_MODE` in `client/camera.js` to
`'reflection'` or `'translation'`; both previous algorithms remain intact and
tested. `WRAP_CLEARANCE_PX` controls clearance (the original translation version
used `32`). These are internal experiment constants, with no new public controls.

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
flushing pending autosaves and uploads before departure. Failed saves keep the
current canvas open; navigation is blocked during publishing. In-place editing, focus isolation, mobile trail scrolling,
and the existing hover treatment are preserved. Focus temporarily hides the trail.

## Fonts

New text objects use **Xanh Mono Regular** (`"xanh"`) at **18px**, with the
existing 1.4 line-height default. Their default 12×5 grid box is unchanged.
Xanh Mono is bundled locally as Google Fonts' regular WOFF2 subsets, including
Latin, extended Latin and Vietnamese coverage. Source URLs and license notices
are in `assets/Xanh-Mono-NOTICE.md` and `assets/Xanh-Mono-OFL.txt`.

The selector offers **Xanh Mono**, **Baskerville** (system font with the
existing serif fallbacks), and **Zenbones Mono** (`"zenbones"`, bundled regular
WOFF2 with its existing license). Legacy `"mono"` selections still render in Xanh
Mono, replacing Zenbones without rewriting saved page JSON. The interface,
breadcrumbs and editor controls use Xanh Mono too. Baskerville selections remain
unchanged. Zenbones loads only when explicitly selected for an object.
Saved font sizes, box
dimensions, line heights, letter spacing and coordinates are unchanged. Different
glyph metrics can naturally change wrapping; editor overflow indicators and
viewer bounds are measured again after the webfont loads. No remote font service
or browser-side request to Google Fonts or GitHub is used.

## JSON format and defaults

Compositions live in `zibaldone/pages/<slug>.json`; imports/images/fonts are normal files
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

- Text/images/files use independent grid X/Y/W/H. Media resizing snaps the dominant
  axis and derives the other when aspect ratio is locked. **Snap** can be disabled.
- `font` is `xanh` (bundled Xanh Mono), `mono` (legacy alias for Xanh Mono), `zenbones` (bundled Zenbones Mono), or `baskerville` (system Baskerville,
  then Palatino/Georgia). `fontSize` is independent of box dimensions. `align`
  defaults to `left`. `lineHeight` defaults to the existing canvas appearance,
  1.4, and accepts 0.5–4. `letterSpacing` defaults to 0 em and accepts -0.1–1 em.
  Explicit values also apply in focus; legacy text keeps the old 1.6 focus line
  height when the property is absent. Wrapping/overflow checks use actual DOM text.
- `shadow` defaults to false on text/images/files. Enabled it shadows the rectangular
  box with `0 4px 14px rgba(0,0,0,0.09)`, not glyphs. No padding/background is added.
- Every element has optional integer `zIndex` (default 0) and boolean `locked`
  (default false). Locking affects only authoring, never public behavior.
- Text/images/files have `maximizable` (default true); text has `invertOnHover` (default
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

A file extends the same rectangular model without changing existing elements:

```json
{
  "id": "notebook", "type": "file",
  "src": "/personal/assets/file-12345678-1234-1234-1234-123456789abc.org",
  "filename": "investigation.org", "display": "render", "label": "Investigation",
  "x": -8, "y": 4, "width": 24, "height": 18,
  "font": "xanh", "fontSize": 18, "lineHeight": 1.4,
  "maximizable": true, "zIndex": 0, "locked": false
}
```

`display` is `render` or `attach`; `label` is optional. `plainText` is optional
detected capability metadata for new file imports. Documents and attachments
use the same text properties; rendered media supports `lockAspect` (default true).
Files link to their original source, so they do not have an arbitrary `href`.

## Saving

Edits autosave to the existing JSON after a 600 ms pause. Completed drags/resizes,
text-edit completion, and **Set starting view** flush immediately. Ordinary pan
and zoom never change the saved starting camera. Autosave does not commit or push.
The restrained status reads **Saving...**, **Saved**, or **Save failed**; **Saved**
means the latest canvas and all pending image/file paths have been acknowledged on disk.
**Save now** / Ctrl/Cmd+S is an optional flush/retry, not a normal editing step.

Writes are serialized and use the existing atomic rename and revision checks.
Edits made during a request queue a newer snapshot using the acknowledged revision.
Text saves preserve the caret/native undo; canvas undo/redo history is not reset.
Navigation, including breadcrumbs and Back/Forward, waits for uploads and autosave.
Publish also waits and stops on any save/upload failure. Finish unfinished lines
before publishing; leaving an unfinished line asks before discarding that draft.

Failed saves retain the in-memory canvas and show the error plus **Download unsaved
JSON**. Transient failures retry at 2, 5, and 10 seconds; new edits, coming online,
and **Save now** can retry. Revision conflicts never automatically overwrite disk:
download the draft and resolve the conflicting version before reloading. Failed
uploads must be re-added; no temporary image/file references are saved.

Unsaved snapshots are also kept in this tab's sessionStorage when available.
Refreshing offers recovery; the draft's original revision is retained so recovery
cannot overwrite a newer disk version. Canceling recovery explicitly keeps disk.
Tab close/refresh warns only for unsaved work, pending uploads, publishing, or an
unfinished line. Backgrounding flushes where possible, but browsers cannot
promise a final network write during shutdown; wait for **Saved** before closing.
Session drafts are a recovery aid, not a replacement for repository JSON; closing
the tab may remove them. Preview opens the last safely saved composition.

JSON is limited to 2 MB and pages to 2000 objects; file limits are listed above.
Existing validation, magic-byte checks, Host/Origin/token checks, safe filenames,
and write-symlink restrictions remain in place. Deleting
an object leaves its asset intact so other canvases and undo can still reference it.

## One-click publishing

With the one-time Git setup below complete, click **Publish** in
`?edit5500`. It finishes text editing, waits for pending uploads/document validation, and saves
the current canvas through the normal save endpoint. A failed save or upload
stops publishing. Finish or cancel any unfinished line first.

The small selector next to **Publish** chooses what to publish. Your choice is
remembered in this browser; the initial choice is **Content only**.

- **Content only** validates content and builds the personal subtree, then commits
  additions, modifications and deletions within `zibaldone/pages/`,
  `zibaldone/assets/` and generated `personal/` with the message `content.`.
  Uncommitted application code and unrelated staged files still block this mode.
- **All changes (code + content)** saves the canvas and uploads, runs the root
  `build.js` in a fresh Node process (the same build as `npm run build`), then
  commits **all non-ignored repository changes**, including application code,
  professional-site changes, README edits, new files, deletions and previously
  staged work, with the message `Publish site changes`. Generated output is
  rebuilt from its sources. Existing unpushed commits are included in the push.
  The working-tree version of a partially staged file is used. You do not need
  a terminal commit before using this mode, including for changes to Publish itself.

Both modes push to the configured upstream branch and include other canvases
already saved to disk; wait for **Saved** in other editing tabs first. Ignored
files stay local. Downloaded `zibaldone/*-WOFF2.zip` archives are ignored; installed
fonts and licenses in `zibaldone/assets/` are included. Restart `npm run dev` after
changing local server code, then reload the editor to use the updated controls.

The button is disabled during the operation and the status shows **Saving…**,
**Building…**, **Committing…**, and **Pushing…**, followed by the result and abbreviated commit.
Editing pauses until it finishes. **Pushed successfully** means Git accepted the
push, **not** that GitHub Pages finished deploying. For a GitHub remote, **Check
deployment ↗** opens the repository's Actions runs. The existing branch Pages deployment then rebuilds
the site from the pushed output; check its result there.

- No changes in the selected scope and no unpushed commits: **Nothing new to
  publish**; no empty commit is created.
- Unrelated staged files or uncommitted code block **Content only**. Choose
  **All changes** to include them, or handle them separately in a terminal.
- A failed save, upload or build stops before committing or pushing. Build
  details appear in the local server terminal; fix the error and retry.
- Remote changes/divergence: publishing stops. Fetch and reconcile in a terminal;
  Publish never pulls, merges, rebases, or force pushes.
- Failed push: saved files and any new local commit are retained. Fix the
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

After that setup, content and application changes can both use **Publish**, with
the appropriate scope selected. All Git execution is
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

Only viewer HTML/CSS/JS, adapted page JSON, a label/legacy-route catalog, assets,
safe downloads and sanitized document HTML are generated. `editor.js`,
`file-editor.js`, `editor.css`, history/clipboard modules, document parsers,
`server.mjs`, `publish.mjs`, tokens and authoring APIs are absent. The containing
repository's `_config.yml` excludes this entire source directory from branch
Pages; keep Jekyll enabled and do not add `.nojekyll`.

Keep Wunderkammer's existing branch-based Pages publishing and `CNAME`. There is
no Zibaldone-specific Actions workflow or opt-in variable in this integration.
Verify GitHub **Settings → Pages → Deploy from a branch → master → / (root)**
without changing the existing domain. The professional and personal outputs are
published together by that one deployment.

Review, commit, and push the initial integration once manually. Thereafter,
**Publish → All changes** builds and publishes application code together with
saved content. **Content only** retains its restrictions on unpublished code and
independently edited generated files. Both modes stop on conflicts or remote
divergence and never pull, merge, rebase or force-push automatically.

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
- `client/files.js`: small shared file policy; `file-editor.js`: local import menu/uploads;
  `file-view.js`: native images/video, safe links, document scrolling/focus.
- `files.mjs`, `documents.mjs`: Node-only file validation, ZIP packaging and sanitized
  Org/Markdown rendering. No parser code is included in `personal/client/`.
- `client/history.js`, `clipboard.js`: bounded snapshots and portable object copies;
  both development-only. No full-page snapshot occurs during pointer movement.
- `client/autosave.js`: development-only debouncing, serialized writes and bounded retries.
- `server.mjs`: loopback routes, safe saves, image uploads, authenticated publish progress.
- `publish.mjs`: development-only content/all-repository builds and staging, commit/push, upstream checks and publish lock.
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
content-only and all-repository commits, current-code builds, ignored files,
additions/deletions, no changes, staged-file safety, missing setup, divergence,
build/authentication/commit/push failures, retries, and concurrency.
Chromium covers wheel drift/pan, transformed hit tests, hover pixels/overlaps,
focus/maximizable/Z behavior, touch pan/pinch and finger transitions, marquee/group movement,
locks/Alt/nudging, native text undo/clipboard, one-step drag undo, polyline drawing,
vertex insertion/editing, typography/overflow/shadows, save/reload, static routes,
repository subpaths, fonts/images/links, breadcrumb pruning/history, fresh-tab
isolation, canceled unsaved departures, mobile trail scrolling, and editor/API isolation.
Autosave tests cover rapid typing/caret preservation, completed gestures, undo/redo,
queued writes/uploads, navigation/refresh, draft recovery and revision conflicts.
They also check Publish progress, pending uploads, failed saves, Git errors,
concurrent requests, and the deployment link without pushing to GitHub. Screenshots
are written to `/tmp/space-*.png` (the historical test artifact prefix).
Touch tests use Chromium emulation; physical mobile keyboard/gesture testing is
still useful. GitHub's hosted deployment itself requires the one-time settings.
File tests cover transformed drop placement, mode/source changes, real fonts,
documents/lists/tables/code, sanitization, unsafe paths/types, exact-byte downloads,
history/clipboard, GIF/video, document scrolling/focus/touch, pending conversions,
content publishing and static output under both deployment bases.
