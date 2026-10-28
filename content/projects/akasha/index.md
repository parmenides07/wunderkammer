---
id: projects-akasha
title: Akasha
slug: projects/akasha
section: projects
type: project
topics: []
audience:
  - public
  - professional
status: active
published: true
created: '2026-09-30'
project: akasha
banner: assets/cloud.jpg
order: 1
---

*A spatial environment for ideas that belong in more than one place.*  
TypeScript · Svelte · Electron · CodeMirror · Local files · Relationship graphs

Every attempt of mine to try to encapsulate this project ended with a more confusing than clearing document. Thus, I have had AI prepare the following explanation of Akasha:

Akasha is a local desktop workspace for connecting notes, documents, images, and the ideas that give them meaning. It combines a spatial canvas, a Markdown editor, a relationship graph, file previews, and a keyboard-driven interaction system. A piece of writing can appear in several workspaces without becoming several copies. A PDF can belong to a course, a question, and a research project while remaining an ordinary file on disk. A paragraph can become something you arrange and reference without first breaking its source document apart.

The organizing principle is simple: **what something is, how it relates to other things, and where you want to see it are separate decisions.** Akasha gives each decision a representation of its own. The interesting capabilities arise when those representations cooperate.

This is a working personal-alpha project, with a usable Linux AppImage. The examples below are recordings of the application using a fictional Courtyard observatory: a small design study with field notes, site diagrams, a project brief, and calculus assignments. The content is synthetic; the editing, relationships, previews, and filesystem behavior are real.

![A fictional research workspace: three arranged boards, a shared question, site diagrams, homework PDFs, and the focused document preview.](assets/workspace.png)

## Why build a different place to think?

The same idea often participates in several activities. A question belongs in a notebook, beside a source, on a planning board, and in the outline of something being written. An image can be evidence in one context and a visual reference in another. A small observation can eventually become the center of an entire project.

Ordinary organizational tools tend to ask for an early commitment: choose a folder, a document, a database row, a category, or a particular view. Those commitments are useful, but they are often stronger than the thought that prompted them. During exploration, I may know that two things belong together long before I know what kind of relationship I am looking at. I may need to compare them visually before deciding whether that arrangement expresses anything permanent.

I want an environment that leaves room for that uncertainty. A place where arranging material is itself a way of understanding it; where a useful structure can be discovered through work and then reused; where the tools do not require a finished theory of the project before the project can begin.

What excites me is that a connection can become useful long after the moment I made it. An observation recorded for one project can help answer a question in another. A concept can gather explanations, references, and disagreements across years of work. Each deliberate connection gives me another route into that material. Akasha's small abstractions—identities, relationships, views, subjects, and projections—let a body of work accumulate this continuity while remaining open to a different arrangement, interpretation, or purpose.

## The model: identity, relationship, and placement

The central vocabulary is compact:

| Concept | Meaning | Example |
|---|---|---|
| **Cell** | A durable identity for a meaningful thing. | A question, an image, a PDF, a folder, or a note. |
| **Relationship** | A connection between Cells. | An assignment is a child of Math HW. |
| **Shoma** | A spatial view organized around a core Cell. | A research desk or a study-session board. |
| **Placement** | One appearance of a Cell inside a Shoma. | The same question visible beside two different sources. |
| **Anchor** | An addressable subject within text. | A heading, paragraph, or list item. |
| **Transclusion** | A read-only projection of another subject. | A source paragraph displayed inside a working note. |

A Cell's identity is not its title, its current text, or its screen position. Several placements can refer to the same Cell. Moving a placement changes the arrangement; editing the Cell changes the shared content. Creating a new Cell from a copy is a different operation, because it creates a new identity.

Similarly, a relationship is not just a line between two rectangles. It is a fact the application can use in navigation and queries, even when neither endpoint is currently visible. A layout can express a temporary juxtaposition without asserting such a fact.

This separation is the basis for the rest of the system. It prevents a convenient visual arrangement from silently becoming an organizational commitment, and prevents reorganizing the canvas from destroying the meaning already recorded in the graph.

## One thought, several contexts

Suppose a research note asks whether an east-facing bench attracts longer visits because of its afternoon shade. That question belongs on the overall project board and beside the field observations. Akasha can place the same Cell in both Shomas.

Editing either view edits the same underlying note. There is no synchronization task between two independent copies, and no need to remember which version is authoritative. Each Shoma can arrange the note differently, alongside different material, while retaining its identity.

For a novelist or campaign writer, a character Cell can appear on the cast board, beside a scene, and next to the history of a city. The character's notes stay shared; each scene retains its own prose and arrangement. A location can gather maps, events, and unanswered questions in its own Shoma, then appear beside whichever chapter needs it. The same world can be approached through its people, places, or events.

The distinction also makes deliberate duplication more useful. If the next site visit needs a new observation sheet, the user can copy a structure while choosing which Cells remain shared. A reusable protocol might stay the same Cell; a new day's observations should become new Cells. A reference image might be reused, while a working interpretation is copied and allowed to diverge.

This is how template-like behavior emerges in Akasha: **copy the structure, choose the identities**. A pattern does not have to become a special template object before it can be useful.

![One thought, several contexts: editing the Working question updates both Shoma placements.](assets/shared-thought.mp4)

*9.6 seconds. Both visible notes are placements of one Cell.*

## An organizational layer over ordinary files

Akasha can open a normal project directory. It discovers ordinary files and folders, gives them Cell identities, and stores its own state in a `.akasha` sidecar directory. The original materials remain in the filesystem, available to the applications that already understand them.

A file-backed Cell can be placed, related, selected, queried, and opened just like other Cells. Its backing is a project-relative path. Its meaning is not limited to that path: a document can be related to several questions or projects even though it occupies one filesystem location.

The right-hand content instrument adapts to the subject. Native notes open in the editor. Supported text files receive read-only previews. Images display inline. Project PDFs show a static first page and a page count. Folders and unsupported formats still have useful identities, paths, relationships, and external-open actions.

This allows Akasha to work around specialized tools. For a furniture commission, drawings stay in the drafting application, reference photos remain image files, and native notes record why a joint or finish was chosen. Relate those decision notes to the commission and to a shared **White oak** Cell, and a relationship pattern can retrieve the decisions connected to that material. When a matching bench is commissioned, bring the relevant sources and reasoning into a new board; copy the notes that need to diverge. The earlier project's reasoning becomes something you can work with again.

The current implementation is intentionally explicit about its boundaries. Project PDFs have a 20 MB preview limit, and full reading happens in the default external application. There is no universal parser for arbitrary document formats. Native connective writing supplies meaning where format-specific inspection ends.

## Files can inherit context as they arrive

A folder connection is an instruction linking the contents of a folder to a Cell. For example, make **Math HW** the parent of files in **Pearson assignments**. Existing files acquire that relationship. A new assignment added later acquires it too.

The instruction can make the target Cell a parent, child, or spouse of the files, and can optionally include subfolders. The resulting facts are ordinary relationships with recorded support: the application knows which folder instruction is responsible for them.

That provenance makes exceptions possible. An individual file can be excluded from one instruction. A relationship can be kept independently so it survives removal of the folder connection. Several instructions can support the same fact without requiring several indistinguishable copies of it.

Crucially, discovery does not decide the layout. A new PDF can become a child of Math HW without appearing in every open Shoma or rearranging the user's desk. The user chooses where it should be visible.

Missing files are handled conservatively. Temporary absence preserves the Cell and its last known connections, marked unavailable. An explicit move or source rebind can change membership while preserving identity. External renames are not silently guessed from matching names or similar contents.

![New files inherit their context: a third assignment appears in the existing Math HW folder connection.](assets/folder-context.mp4)

*10.6 seconds. A real PDF is copied into the connected folder during the recording; the filesystem copy occurs outside the captured app area.*

## Writing connects sources to questions

Native writing remains central, but it need not compete with external documents. It can be the explanation between them: a question about a PDF, an interpretation of an image, a reason two projects are related, or a short plan assembled from several sources.

From a source preview, a command creates a native source-context note. Selected text, when available in a text preview, can seed a quotation. The new note links back to the source and becomes its child. The original file is unchanged.

This is useful even for formats Akasha cannot interpret deeply. A user can identify a detail in a drawing or a moment in a recording, describe its importance, and relate that observation to the rest of the project. Precise PDF quotations, image regions, and media timestamps are possible future enhancements; they are not prerequisites for recording meaning.

In the Courtyard example, the project brief asks the researcher to compare clear and overcast days. The next thought can live beside that brief: “Would this still work on an overcast day?” The question has its own identity and relationships, while retaining its source context.

![From source to thought: a PDF becomes the starting point for an editable note linked to its source.](assets/source-to-thought.mp4)

*10.2 seconds. The note is native Akasha writing; the PDF stays unchanged.*

## Structure through a directional grammar

Akasha uses a small relationship vocabulary: **parent**, **child**, and **spouse**. Parent and child are opposite readings of a directed connection; spouse is a symmetric association. Siblings can be derived from shared parents. These are organizational roles, not a claim that all knowledge forms a tree.

A Cell may participate in several contexts and have several parents. A status such as “needs review” can itself be a Cell. A motif can relate to an image, a paragraph, and a source document. The relationship mechanism works across Cell kinds rather than maintaining separate graphs for notes, files, and concepts.

Directional creation connects this model to the keyboard. In relationship-producing modes, placing above means parent, below means child, and sideways means spouse. The selected mode determines which reference point gives the direction its meaning.

**Oriented** placement is visual arrangement without a new relationship. **Bound** relates to the Shoma's core. **Orbital** also relates to the focused Cell. **Drifting** works through a non-core focus without necessarily binding the new Cell to the core. **Inscription** creates local annotation rather than another global identity.

These modes let a user distinguish “put this here,” “this belongs to the central subject,” and “this is related to the particular thing I am looking at.” There is a learning curve, but the grammar makes many operations variations of a few ideas instead of unrelated commands.

## Space as a working representation

The workspace is a canvas of movable, resizable Shomas. Inside each Shoma, Cells occupy tiled regions. Internal dividers can be resized; arrangements can be folded, unfolded, moved, and copied. The layout has structure, rather than being only a collection of freely overlapping sticky notes.

A Shoma gives an idea a place to gather context. A course can have one view for current assignments and another for revision. A creative project can have a view organized around a character, another around chronology, and another around a recurring visual motif. These arrangements can share identities without needing to share geometry.

Closing a Shoma window does not delete its Cells. Folding a region does not delete its contents or relationships. A focused Shoma can come visually forward without rewriting the user's saved stacking order. Selection gathers identities temporarily for a subsequent action; it does not require inventing a permanent collection object.

The distinction between a view and its contents also makes the interface easier to extend coherently. A new way of arranging or inspecting information should not need to redefine what the information is. Visual experiments can remain visual, and durable changes can remain explicit.

## Paragraphs can become subjects

Useful ideas are not always whole documents. A heading, a paragraph, a list item, a quotation, or a code block can be the part that matters.

Akasha recognizes text subjects inside native writing. Links can address a Cell or an anchor within it. Autocomplete helps find a target by title or text. An alias changes the displayed label without changing what the link refers to.

An anchor does not automatically become a hidden Cell. It remains part of its source until the user asks for a materialization. **Spatializing** creates a projection Cell that refers to the source subject and opens its own home Shoma. Repeating the action can reuse the same projection identity. **Promoting** makes an independent Cell from the subject's content while preserving source metadata. Promotion is copy-based; it does not cut text out of the original.

External text previews have a related, simpler mechanism: a selected line range can become a native wrapper containing a reference such as `![[notes.md#L3-L8]]`. The wrapper shows those inclusive lines and relates back to the real file Cell. It does not create a hidden Cell for each line.

This gives writing a useful range of granularity. A sentence buried in a field notebook can become a question with its own workspace, gathering sources and counterarguments. Keep a live projection when the original passage should remain authoritative; promote a copy when the thought needs to develop independently. An idea can acquire more room as it becomes important, while its earlier context remains available.

## Links and read-only projections

Akasha's Markdown writing supports wiki links such as `[[Working question]]` and transclusions such as `![[Working question]]`. A link points somewhere; a transclusion displays a projection of what it points to.

The projection remains read-only. Editing belongs to the source editor, rather than to a nested editor embedded inside another editor. When the relevant transclusion line is active, the underlying reference is available for editing. This preserves the difference between changing a reference and changing the thing being referenced.

The relationship semantics are similarly deliberate. Inline wiki references and ordinary transclusions can contribute textual spouse/reference facts. A standalone plain wiki link remains navigable without asserting a relationship. A file line-range transclusion has a specific provenance rule: the file is the parent of the containing note. Merely placing prose beneath a link does not create a child relationship.

That precision matters because text participates in the larger system. If every visual embed implied ownership, or every neighboring line created hierarchy, writing would quietly alter the graph in ways the user did not choose. Akasha instead gives the syntax a defined contract, which its queries and navigation can share.

## Query the relationships you have already made

Queries can use relationships as a pattern. A focused Cell acts as a variable, while its surrounding facts supply constraints. A writer could make scene Cells children of **Scenes**, then connect each scene to its characters through spouse relationships. A pattern requiring a child of Scenes associated with both **Elena** and **Marcus** finds the scenes connected to both characters. Those scenes can be brought together to review how their relationship develops, even though they were written in different chapter workspaces.

The query engine collects relationship facts from the current model and from supported text references. It distinguishes directions and sources of relationships. When there is no usable pattern, it can fall back to neighbors and backlinks. The result is a way to explore existing organization through the same vocabulary used to create it.

Results first appear as a derived surface. A result referring to an existing Cell is not a new copy of that Cell. Pinning explicitly turns it into a normal placement, and does not automatically confer the query host's relationships. Text-anchor results likewise remain virtual until an explicit materialization.

This supports a productive cycle: arrange and relate material, query the resulting structure, then keep useful discoveries as new arrangements. The query does not have to become a permanent schema or a separate database before it becomes useful.

For a musician, the same mechanism can turn a listening journal into a library of creative instincts. Make listening notes children of **Listening journal** and explicitly associate them with shared Cells such as **Hollow nostalgia** and **Bowed cello**. A pattern combining those connections can bring together your notes on an old recording, a film cue, and your own unfinished sketch. Place useful results beside a new composition's working notes. The associations come from what you heard and recorded. Over time, your own vocabulary gives you a route from a feeling to the references that helped define it.

The present engine performs relationship-pattern matching in loaded state. It is not a natural-language AI query system, a general SQL interface, or a full-text index of every PDF. Its value comes from making the user's own structure inspectable.

## Several scales of navigation

The **Compass** provides a local view around the focused Cell: parents above, children below, siblings to one side, and spouses to the other. It is a navigation instrument, not another Shoma. Its contents are capped and ranked so the immediate context remains legible.

**Constellation** provides a broader graph view, with scopes for the focused neighborhood, the current Shoma, the whole Akasha, and the selected pool. Parent/child and spouse connections can be filtered. Node selection and focus are connected to the main workspace, while the graph drawing remains a derived representation.

There is also a focused relationship lens over visible canvas placements. It shows direct relationships between the focused Cell and visible related Cells. The geometry follows the actual placements; the overlay does not intercept editing or dragging and does not create a new set of saved decorative edges.

These views answer different questions. The canvas asks, “How do I want to work with this material?” The Compass asks, “What is immediately connected?” Constellation asks, “What larger structure have I made?” They share the same identities without forcing one visualization to do every job.

## A workspace whose visual language belongs to its user

Customization is part of the working model. Akasha's interface is built around theme-controlled colors, typography, rules, and surfaces, so its appearance can change coherently across the workspace and controls.

The theme exposes canvas, UI, ink, accent, and secondary-accent colors; light and dark tone; a global font; and visual treatments including paper, schematic, atlas, circuit, neural, duotone, and pop. The style system derives related surfaces and marks from these choices rather than treating each panel as an unrelated design.

Custom Cell and Shoma surfaces can specify background color, opacity, blur, and padding. Default surface choices establish a baseline, while individual appearances can use their own styles. Additional text-style controls support typography and text color. Color-pick controls can sample the rendered Akasha window. A local image can supply the canvas background.

The current interface also exposes shadow style, header visibility, border width, and Shoma spacing. Some of these controls are session-only; saved theme data and custom surface definitions have a different lifetime. The manuals document that distinction so customization does not imply persistence that the application does not yet provide.

The visual reference remains the same throughout: square edges, a consistent typographic rhythm, colored rules, and deliberate shadows. Personalization should change the character of the instrument while preserving its coherence.

## Reusable structure without a mandatory schema

A useful structure can begin as a habit. The exciting part is how much it can become without needing a new feature for every use.

Imagine repeatedly organizing a reading around a source, a question, an objection, and a next step. At first, these are simply Cells and relationships. Once the arrangement becomes useful, it can be copied. Some identities can remain shared; others can be replaced. Eventually, queries can find similar structures elsewhere in the project.

A recurring child can play the role of a property. A shared concept can play the role of a category. A reused arrangement can play the role of a template. The system does not need to declare each of these a separate user-facing object type in advance.

Consider planning several projects within one Akasha. Make each task a child of **Tasks** and its project Cell, then connect unfinished tasks to a shared **Needs review** Cell. A pattern for children of Tasks associated with Needs review gathers the work across those projects; adding a particular project as another parent constraint narrows it. Needs review can also hold your definition of a good review, a checklist, or examples. A status has become a subject you can explain, improve, and reuse through the same primitives as the work itself.

This is a design preference rather than a prohibition on metadata. Akasha uses metadata where it is needed: source paths, asset information, materialization provenance, relationship support, and visual configuration. The distinction is about what leads the user's thinking. Metadata should support a structure that has meaning, rather than demand that all meaning begin as a form to fill in.

I want the organizational vocabulary to come from the work. If a particular question, method, or distinction keeps mattering, give it an identity and connect it where it belongs. It can gather its own notes and sources while helping organize everything around it. Over time, the workspace can begin to reflect how a particular person thinks: the comparisons they return to, the decisions they care about, the patterns they have learned to recognize.

## Extensibility begins with keeping the model general

Akasha is extensible in two related senses. The user can construct new organizational patterns from a small set of primitives, and the implementation provides boundaries where additional capabilities can be introduced.

The Cell model separates identity from backing. Relationships connect Cells regardless of kind. Shomas place Cell identities rather than maintaining separate layout systems for images, notes, and files. This means a future source adapter should not require a new relationship ontology, and a new graph visualization should not require a new persistence model.

The code separates domain state and invariants, operations, history, storage, text references, queries, and presentation. New operations can be tested against the same laws. Derived views and indexes can be rebuilt from canonical data. Additional previews can read a source without gaining authority to rewrite it.

Those boundaries are meaningful extension points, but they are not a claim that a public plugin platform already exists. The current project does not offer a stable third-party plugin SDK or a built-in scripting console. New adapters and automation would still require implementation work. The extensibility is in the architecture and the composability of the user's structures; a public extension ecosystem remains a possible future direction.

## Technology and reliability

The desktop shell uses **Electron**. The interface uses **Svelte**, with a DOM-based spatial workspace and dedicated graph rendering. **CodeMirror 6** owns Markdown editing. **TypeScript** defines the domain model and operation contracts. **Vite** builds the application, and **PDF.js** provides bundled, local first-page rendering for project PDFs.

The core state records Cells, relationships, Shomas, layout trees, focus, selection, and theme information. Operations describe changes to that state. Invariant checks catch invalid references and inconsistent structures. Text bodies are kept separately from the graph-and-layout state, then saved with it through the appropriate persistence path.

For folder projects, `.akasha/vault.json` contains the serialized state and native writing. Source files remain outside that document. Writes use atomic replacement and a per-project queue so an older asynchronous save cannot finish after a newer save and overwrite it. Save checkpoints preserve earlier sidecar states, and a recovery interface restores into a new folder.

Text editing and structural undo are separate histories. A layout change must not erase newer writing. Read-only previews must not acquire editor ownership. A background file discovery must not reset the user's focus or replace the entire working state. These boundaries have been recurring engineering concerns, and the regression suite is organized around them.

The current source suite covers 165 test files, supplemented by desktop and packaged-AppImage checks. That is evidence of specific tested behavior, not a guarantee that every large-project or cross-platform edge case is solved.

## Local ownership, with explicit limits

Local-first means the working project is on the user's filesystem and core editing does not require a hosted service. It does not mean every possible feature is offline: opening web links, fetching optional URL-card metadata, and checking release information may use the network.

The sidecar contains material that ordinary source files do not: native notes, relationships, layouts, and saved theme state. Keeping source files alone preserves the originals, but does not preserve the entire Akasha. A complete backup should include the project directory and its `.akasha` contents.

Recovery checkpoints are also narrower than full historical filesystem snapshots. They preserve Akasha state; restoring copies the current external source files. They cannot recover an old version of a PDF that was independently overwritten outside the application.

This approach gives users direct access to their materials and makes the system's responsibilities visible. It also leaves room for future improvements in export, indexing, migration, and synchronization without pretending those capabilities are already complete.

## What exists now, and what I want it to become

The present application supports native writing, reusable identities, spatial arrangements, directional relationships, selection and duplication, anchors, read-only transclusions, relationship-pattern queries, graph navigation, file-backed sources, live folder connections, theme customization, and project recovery. The Linux desktop build is usable, and the recorded examples exercise real workflows.

There are still rough edges. The keyboard grammar is powerful but needs a more complete cross-platform audit. Very large collections need further performance work. Project PDF support is a first-page preview, not an annotation workstation. Rich anchors for arbitrary file types, built-in collaboration, general synchronization, and a public plugin API are not implemented. Some older documents describe exploratory features or superseded behavior; the accompanying reference manual distinguishes those from the current build.

Akasha is especially suited to work whose meaning lives between documents: researching an argument, developing a fictional world, designing an object, or assembling a body of musical references. The PDFs, drawings, recordings, and prose already matter. The questions, interpretations, and decisions connecting them deserve a place to develop too.

The larger ambition is for that work to keep giving something back. A passing note becomes a question; the question gathers sources; a source passage gets its own place; an arrangement becomes a method worth repeating. Months later, another project brings those same ideas into a different relationship. That is when a workspace starts to feel alive to me: earlier attention becomes useful again. Akasha makes those connections available to revisit, rearrange, and build on as understanding grows.

## Start with a small project

Open a folder containing a few real sources. Make one native note explaining what you are trying to understand. Place a source beside it. Give a question its own Cell. Reuse that question in a second context. Add a relationship only when it expresses something you mean.

The fictional Courtyard observatory is available in the repository as a prepared starting point. It demonstrates a shared question, a small research board, linked homework files, and source-context writing without requiring a large imported collection.

For practical use, read the [task-oriented user manual](manual.md). For the full conceptual model, exact semantics, command reference, implementation boundaries, and extension guidance, read the [comprehensive reference](../reference.md). The latter is designed to be self-contained enough to give to an LLM assisting with Akasha.
