---
id: akasha-manual
title: Manual
slug: projects/akasha/manual
section: projects
type: project-note
project: akasha
audience: [public, professional]
status: active
published: true
created: 2026-10-28
order: 20
---

# Akasha user manual

**A practical guide to the independent-workspace personal alpha · updated 5 November 2026.**

Use this guide while working. Start with [First session](#first-session), then jump to a task. For the design rationale, read the [introduction](index.md). For the new workspace/source architecture and migration details, consult `docs/WORKSPACES_AND_SOURCES.md` in the repository. The [comprehensive reference](reference.md) describes the older detailed Cell and command semantics; check it against current source where the new multi-source implementation changes a contract.

## Find a task

- [First session](#first-session)
- [Workspaces and source locations](#workspaces-and-source-locations)
- [Choose what to register](#choose-what-to-register)
- [Understand the screen](#understand-the-screen)
- [Write and arrange notes](#write-and-arrange-notes)
- [Reuse one note in several places](#reuse-one-note-in-several-places)
- [Create relationships](#create-relationships)
- [Work with files and folders](#work-with-files-and-folders)
- [Connect a folder to a subject](#connect-a-folder-to-a-subject)
- [Make a note from a source](#make-a-note-from-a-source)
- [Link, embed, and extract a passage](#link-embed-and-extract-a-passage)
- [Find material through relationships](#find-material-through-relationships)
- [Change the appearance](#change-the-appearance)
- [Save, undo, and recover](#save-undo-and-recover)
- [Open or migrate an older folder project](#open-or-migrate-an-older-folder-project)
- [Resolve a problem](#resolve-a-problem)
- [Keyboard reference](#keyboard-reference)

## First session

1. From the current repository checkout, run **`npm run launch:electron`**. The newer independent-workspace implementation has **not yet been repackaged into the installed Linux AppImage**.
2. Choose **Akasha icon → New Workspace…** and select the folder in which Akasha should store its own state. It creates/uses that workspace's `.akasha/` directory; your sources do not need to be inside this folder.
3. Open **Source locations… → Add Folder…** to register a directory of material, or **Add File…** to register one file. A new workspace also works with zero sources.
4. In **+cells**, find a registered file under its source location. Click to inspect its preview; press **Enter** to open its home Shoma.
5. Click the canvas, press **n**, then **e** to make and edit a native note. Write what you're studying or making; create relationships only where you intend them.
6. Press **Esc** to return to spatial work. If completion is open, the first Esc dismisses it.
7. Press **Ctrl+S** and check the modeline for a successful save, rather than assuming the attempt succeeded.

**Example:** Store the workspace at `~/Documents/Akashas/Personal/`, register `~/Documents/Code/ml/`, `~/Documents/Art/`, and perhaps one `~/Documents/Study/notes.org`. Your code, artwork, and notes remain in place. Akasha's native writing, relationships, layouts, and source catalog are saved with its own workspace.

The repository also includes the fictional `demo-projects/courtyard/Courtyard observatory` example, recorded under the earlier folder-project workflow. Its relationships and previews still illustrate Akasha's core model; the old recording does not depict the new Sources interface. At smaller window sizes, use Ctrl+wheel to zoom out.

![The Courtyard observatory: spatial boards on the left, content and lists on the right, and Compass below.](assets/workspace.png)

## Workspaces and source locations

**Workspace:** the Akasha environment itself. Its storage folder holds `.akasha/` with native writing, Cell identities, relationships, Shomas, layouts, settings, and a persistent catalog of source registrations. A workspace may have no sources at all.

**Source registration:** one external file or directory you explicitly let this workspace know about. Registering a folder includes its supported contents recursively. Multiple locations may be registered even when they are in different repositories or unrelated parts of the filesystem. Source files remain where they already are; registration does **not** copy or move them or add `.akasha/` sidecars to their directories.

To manage these boundaries, open **Akasha icon → Source locations…** and use **Add Folder…**, **Add File…**, **Refresh**, **Detach/Remove**, or the available reconnect/relocation control. The Sources panel shows registered paths and whether they are available. `+cells` groups registered material by its source location.

**Important distinctions:**

- **Registration is access, not a semantic relationship.** A file does not automatically become the child of some topic merely because you registered its folder. Use relationships or an explicit folder connection for that.
- **Files with identical names stay distinct.** Registration-qualified source references disambiguate different `notes.md` files. Overlapping registered roots reuse the same physical source's Cell identity; they do not create duplicate Cells.
- **Detaching is not trashing.** Detaching a registration stops that source being actively indexed but preserves existing Cell identities, native writing, relationships, and placements. Where another active registration still covers the file, it remains accessible through that registration.
- **Missing is not deleted.** If a directory or file disappears or a drive is offline, Akasha keeps the relevant Cells as unavailable. Reconnect the source when its location is known; do not expect Akasha to reconstruct source bytes.

## Choose what to register

Register **a folder** when you continually create files in it, such as a code project, art-study directory, or notes collection. New supported files discovered there can become available to Akasha without being manually registered individually.

Register **one file** when you need a specific source but do not want its surrounding directory indexed. Single-file registrations have narrower filesystem-command support: rename and move operations through them are not supported in this implementation.

Start small. Keep existing code in Code, artwork in Art, and writing in the tool you prefer. Let the Shomas cross those boundaries: a book note, a Python experiment, and a drawing can share a Shoma while staying in three unrelated places. Do not move files merely to express a conceptual connection. A filesystem directory is a storage choice; a Shoma is a view; a relationship is a claim about meaning.

**Current limitations:** cross-root moves and symlink sources are unsupported. Registering a directory does not grant Akasha unlimited access to the filesystem. Existing path-safety, ignored-path, and source-operation restrictions still apply.

## Understand the screen

| Part | What to use it for |
|---|---|
| **Canvas** | Arrange and navigate Shoma windows. |
| **Shoma** | Work with a set of Cell placements around a central subject. |
| **+editor** | Edit the focused native note. |
| **+preview** | Inspect a file-backed source without editing it. |
| **+cells** | Find native Cells and files grouped by registered source; run supported file commands. |
| **+shomas** | Activate open views and reopen recently closed ones. |
| **+compass / +constellation** | Explore relationships. |
| **Bottom modeline** | Check focus, mode, zoom, save state, and command feedback. |
| **Top-left Akasha icon** | Create/open workspaces, manage Source locations, recover backups, manage folder connections, and adjust themes. |

Remember three distinctions:

- **Cell:** the thing itself. Editing it affects every view of that identity.
- **Placement:** where that Cell appears. Moving or styling a placement is local to that appearance.
- **Relationship:** why Cells belong together. Proximity alone does not create one.

Shortcuts depend on focus. **n** creates a native note on the canvas but opens a filesystem-create prompt in **+cells**. **Ctrl+A** selects text in the editor and visible Cells on the canvas. Click the intended area first.

## Write and arrange notes

Create a standalone note with **n**. To create beside a focused Cell, clear any selection with **Shift+Space**, choose a placement mode, then press **Ctrl+direction**. Use arrows or `h` left, `j` down, `k` up, `l` right. Directional creation may enter the editor immediately.

For layout without a new relationship, press **r** for **Oriented**, then use Ctrl+direction. For a new child of the Shoma's core, choose **Bound** with **y** and create downward.

Drag a Shoma by its header. Resize from its edges or corner. Drag an internal divider to change the relative size of Cells. Wheel pans; Ctrl+wheel zooms. **0** resets the canvas viewport. **q** closes the active Shoma window without deleting its Cells.

Use **m** for move mode, choose a destination with direction keys, and use Ctrl+direction to place. Use **f** for boundary folding, choose and confirm the boundaries, and **u** to unfold. Esc leaves the active layout mode. Folding is for hiding a region of layout, not deleting information.

Markdown writing supports headings, lists, emphasis, links, and code. Enter continues a real list; Enter on an empty list item exits it. Tab and Shift+Tab indent and outdent actual list structures. Akasha is not an Org-mode implementation.

## Reuse one note in several places

To place an existing Cell beside a different Cell:

1. Focus the Cell to reuse and press **Space** to select it.
2. Focus a destination Cell that is **outside** the selection.
3. Press **r** for Oriented placement if no new relationship is wanted.
4. Press **Ctrl+direction** to place the selected identity beside the destination.
5. Clear selection with **Shift+Space**.

If focus is inside the selection, Ctrl+direction has a different meaning: it can create one new shared Cell off the selected anchors. Clear selection before ordinary creation if that is not your intention.

For larger patterns, copy a focus/selection bundle with **Ctrl+C**, then **Ctrl+V** on the canvas. The paste chooser offers reuse, duplication, and custom per-Cell choices. **Same Cells / visual instance** retains identity. **New Structure** is the explicit choice for copied local relationships. **Custom per Cell** lets you choose same, new, or skip and control relationship copying.

Pasting into a focused slot is a replacement operation and can adopt its local role; it is not merely dropping a new card beside it. For simple reuse, the selection-placement recipe above is easier to reason about. The current “New Cells / content only” label also understates relationship copying in the implementation; see the reference before relying on it for relationship-free copies.

![The same question updates in two spatial contexts after one edit.](assets/shared-thought.mp4)

## Create relationships

Use relationships when the connection should survive a change of layout.

| Mode | Key | Use it when… |
|---|---|---|
| Oriented | `r` | You only want to arrange a Cell. |
| Bound | `y` | The new Cell should relate to the Shoma's core. |
| Orbital | `o` | It should relate to both the core and the current focus. |
| Drifting | `d` | It should relate through a non-core focused Cell. |
| Inscription | `i` | You want a local annotation rather than a global Cell. |

In relationship-producing actions, up means parent, down means child, and sideways means spouse. The reference point depends on the mode. To inspect the result, use Compass or the direct relationship marks in +cells: **⇧ parent**, **⇩ child**, **≖ spouse** relative to focus.

You can also select existing Cells, focus another Cell, and use its context menu: **Marriage / spouse**, **Adoption / selected children**, or **Birth / selected parents**. Selection is temporary attention, not a permanent group.

## Work with files and folders

Click a registered source row in **+cells** to select and preview it; **Enter** or **Shift+O** opens its Shoma. **Tab** expands or collapses a folder. **Open in Default App** and **Reveal** act on the real source. Rows are grouped by registered location, not necessarily by where the Akasha workspace itself is stored.

| Task in +cells | Action |
|---|---|
| Create an empty file | Press `n`, enter `note.md`, confirm with Enter. |
| Create a folder | Press `n`, enter `references/`, confirm. |
| Rename | Focus a live row, press `r`, enter the new basename. |
| Move up one folder | `Alt+h`. |
| Choose a destination folder | `Alt+l`, select with `j/k`, confirm with Enter. |
| Reveal in the file manager | `Alt+Enter`. |
| Open externally | `Shift+Alt+Enter`. |

Creation requires an unambiguous registered destination. A selected directory supplies its location; a selected file may supply its containing directory where the command supports it. With multiple roots, Akasha does **not** silently create at the workspace-storage folder or guess a destination. A name without a conventional extension may create a folder; use an extension when you mean a file.

Rename and move preserve Cell identity in supported source contexts. Collisions and unsafe destinations are refused. Cross-root moves and rename/move through single-file registrations are currently unsupported; moving/renaming folders with backed descendants may also be restricted. A successful filesystem rename/move creates a structural-history boundary rather than pretending a model-only undo could reverse the disk operation.

External additions in registered directories are discovered while the workspace is open. Use the Sources panel’s **Refresh** control if discovery lags. Discovery does not automatically place every file on your canvas.

## Connect a folder to a subject

1. Register the directory containing **Pearson assignments** and create a native note called **Math HW**.
2. In +cells, right-click **Pearson assignments** and choose **Connect contents…**.
3. Choose Math HW and **Parent of the files**.
4. Enable **Include subfolders** if wanted, then connect.
5. Add a PDF to the folder. It becomes a child of Math HW, while its placement remains your choice.

Manage connections through **Akasha icon → Folder connections…**.

| Control | Effect |
|---|---|
| Exclude | Stops this instruction linking one file. Other support survives. |
| Include again | Allows the file to participate in this instruction again. |
| Keep independently | Keeps the relationship beyond this folder instruction. |
| Remove connection | Removes that instruction's support, not independently kept facts. |

Rules include ordinary files, not folders themselves. There is no extension filter yet. If a file disappears or its source registration becomes unavailable, its identity and last known connections are retained as unavailable. Explicitly moving or rebinding it outside the folder can remove this rule's support. An external rename is not automatically recognized as the same file. A folder relationship is not the same as a folder-contents instruction.

## Make a note from a source

1. Select a source in +cells and press Enter to open its Shoma.
2. In a text preview, optionally select the passage you want to quote.
3. Press **Ctrl+Shift+Enter** from the preview or source-focused canvas.
4. Write below the source link or quotation in the new native note.

The source becomes the note's parent. The source file is unchanged. This works for a general note about a PDF or image too, but does not create a PDF text anchor or an image-region selection.

**Context matters:** the same shortcut inside the native editor is an Anchor Group command, not the source-note command. Select the preview or source Cell first.

## Link, embed, and extract a passage

| Write | Result |
|---|---|
| `[[Working question]]` | Link to a Cell. |
| `![[Working question]]` | Read-only projection of the Cell. |
| `[[Field notes#Afternoon]]` | Link to a subject inside a native note. |
| `![[Field notes#Afternoon]]` | Project that subject. |
| `![[notes.md#L3-L8]]` | Project inclusive lines from a project text file. |

To display a shorter label, use an alias: `[[Working question|question]]`.

Choose autocomplete results rather than guessing when titles or filenames are ambiguous—especially across different source registrations. Prefer app-generated stable references over manually guessing which `notes.md` you mean. **Enter in a wiki-link popup completes a reference. Enter in an active normal Automatch popup can merge identities.** Esc dismisses the popup when you only want to continue writing.

A standalone plain `[[Cell]]` line does not create a graph relationship. Inline references and ordinary embeds contribute textual spouse/reference facts. A file line-range embed gives the containing note a source-parent relationship. Layout hierarchy is not inferred from indentation beneath a link.

In native writing, **Alt+S** spatializes the active text subject, or an Anchor Group for multiple meaningful selected lines. A dedicated Shoma opens; the source text stays intact. **Alt+C** copies the current subject's stable reference. Multiline group-copy references are not implemented. Use the anchor actions to promote content when you need an independent copy rather than a live projection.

In an external text preview, select lines and use **Alt+S** or **Spatialize Lines**. This makes a native wrapper referring to those line numbers. Inserting lines into the source later can change what that range means; it is not a semantic passage tracker.

## Find material through relationships

Use **Compass** for the focused Cell's immediate context. Click related subjects to navigate. Use **Constellation** for broader scopes: focus, Shoma, whole Akasha, or selection. These are derived views, not new collections of Cells.

For a relationship-pattern query, focus a pattern Cell and use **Shift+Q**. Constraints come from relevant relationships and supported text references. With no usable pattern, the query falls back to neighbors/backlinks. Results refer to existing identities. **p** pins a focused result; **Shift+P** pins the currently visible results into the host layout. Pinning does not automatically give them the host's relationships.

A useful pattern might mean “a child of this project, associated with this topic.” This is structured matching, not natural-language search or automatic understanding of PDF contents.

## Change the appearance

Open **Akasha icon → Theme / Surfaces**. Set colors, font, tone, and visual treatment. Choose a canvas background image if wanted. Create a custom surface to adjust its background, opacity, blur, and padding; choose defaults or assign styles to individual appearances through their controls.

| Setting | Lifetime |
|---|---|
| Theme colors, fonts, treatment, saved custom surface definitions/defaults | Saved with the Akasha project. |
| Global shadow choice, header visibility, border width, Shoma gap, named session preset | Current session. |
| Selected canvas background image | Installed app's local configuration; not bundled into the project. |

Built-in surface definitions are protected; make a custom surface to edit those values. Placement-local styles can make two appearances of one Cell look different without changing identity. Styling a divider does not create a relationship.

## Save, undo, and recover

**Ctrl+S** saves; the app also autosaves. A workspace stores its own state and native writing in its storage folder’s `.akasha/`, together with its registered-source catalog. Back up **both** this workspace state and the actual external source files/directories. A checkpoint of Akasha is not a versioned backup of those files.

**Ctrl+Z** in the editor undoes text. On the canvas it undoes structural work. **Ctrl+Y** or **Ctrl+Shift+Z** redo structural work. These histories are not interchangeable.

**x** trashes a Cell identity and removes its placements across Shomas. **q** only closes a window. To remove just an appearance, use the placement-removal action in the Cell context menu. **Shift+T** restores the latest trash item.

**Bulk-trash limitation:** Shift+X removes selected note bodies from memory, and generic trash restoration does not reconstruct them. Save first; use checkpoint recovery if needed. Trash restoration also does not recreate every removed non-home placement.

For a damaged or unwanted workspace save:

1. Open **Akasha icon → Project backups…** (or the recovery control provided by the current build).
2. Select the workspace and a checkpoint.
3. Restore the workspace state into a **new folder**, then open that copy.

Checkpoint recovery restores Akasha state and registered-source metadata, **not earlier versions of external PDFs, images, code files, or drawings**. The restored workspace can reference the currently available sources; unavailable paths may need reconnection. Do not overwrite a damaged workspace or alter external source directories as a recovery shortcut. The exact current checkpoint count/interval should be checked in the updated repository guide if it differs from the older manual.

## Open or migrate an older folder project

Old Model C projects stored Akasha state in `.akasha/` inside the directory they scanned. In the updated application, an older project can be opened and migrated so its former project directory becomes the initial source registration. The migration preserves the existing identities, native writing, relationships, Shomas, placements, folder rules, and settings, and checkpoints the exact previous document before saving the upgraded version-2 format.

**Before upgrading, make a backup of the old project directory, including its hidden `.akasha/`.** Once saved in version 2, an older Akasha build **cannot read the upgraded state**. This does not mean the ordinary source files are converted or rewritten; it is the Akasha workspace state that changes. For architecture, migration, and recovery notes, read `docs/WORKSPACES_AND_SOURCES.md`.

## Resolve a problem

| Symptom | Check or action |
|---|---|
| A shortcut does something unexpected | Click the intended zone; close popups and exit modes with Esc; check selection. |
| An unwanted merge happened | Use structural undo on the canvas promptly; inspect the restored draft. |
| A file is missing | Check whether its registered source is unavailable or detached. Reconnect that source if its path moved; for an individual backed Cell, **Ctrl+Alt+S** can offer an eligible rebind. |
| Rebind says another Cell owns the path | Inspect that owner. Akasha will not silently steal its backing. |
| New files do not appear | Verify the parent directory is registered and available; use **Source locations… → Refresh**. `.akasha`, `.git`, `node_modules`, `.DS_Store`, and symlinks remain excluded. |
| Two roots contain `notes.md` | Use source-qualified results or an app-generated stable reference; do not rely on the bare filename. |
| I detached a registration and its Cells remain | Expected: detaching preserves Cells and links. Reconnect the source to restore source access, or use another covering registration. |
| Files cannot be created or moved | Choose an explicit registered destination. Cross-root moves and rename/move through single-file registrations are unsupported. |
| A PDF has no preview | Check the 20 MB limit, password protection, or corruption; open externally. |
| A passage projection changes after source edits | Check anchor resolution or line positions; line ranges are positional. |
| The wrong Cell appears in a title link | Choose the intended autocomplete target or use an app-generated stable reference. |
| Customization disappears after restart | Check whether it is a session-only setting. |
| A board seems gone | Check +shomas / Recently Closed, then reset or zoom the viewport. |
| Saving reports a damaged sidecar | Restore a new copy through Project backups; do not overwrite the damaged file blindly. |

## Keyboard reference

Linux notation. `Direction` means arrows or `h/j/k/l`. Many Mod shortcuts map to Command on macOS, but platform parity is not fully audited.

| Task | Shortcut / context |
|---|---|
| Open existing folder project / save | `Ctrl+O` / `Ctrl+S` |
| New independent workspace / manage registrations | **Akasha icon → New Workspace…** / **Source locations…** |
| Help | `?` on canvas |
| New note / edit | `n` / `e` or Enter on canvas |
| Open focused Cell's home Shoma | `Shift+O` |
| Close / cycle Shomas | `q` / `[` and `]` |
| Focus neighbor / create directionally | Direction / `Ctrl+Direction` on canvas |
| Select / clear selection | Space or Shift+click / `Shift+Space` |
| Select visible / cycle selected | `Ctrl+A` / Tab, Shift+Tab on canvas |
| Copy / paste structure | `Ctrl+C` / `Ctrl+V` on canvas |
| Move / border / fold mode | `m` / `b` / `f`; Esc exits |
| Unfold | `u` |
| Query / pin / pin all | `Shift+Q` / `p` / `Shift+P` |
| Source-context note | `Ctrl+Shift+Enter` from source preview/canvas |
| Spatialize / copy native anchor | `Alt+S` / `Alt+C` in editor |
| Trash Cell / selected Cells / restore | `x` / `Shift+X` / `Shift+T` on canvas |

For advanced aliases, precise paste behavior, model invariants, and anchor semantics, continue with the [comprehensive reference](reference.md). For registration-aware source lifecycles, version-2 migration, and current recovery boundaries, use the newer repository guide, `docs/WORKSPACES_AND_SOURCES.md`.
