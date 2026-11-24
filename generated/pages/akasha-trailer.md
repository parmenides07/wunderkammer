
# Akasha

*A spatial environment for ideas that belong in more than one place.*

A passage in a book becomes a question. The question becomes a small experiment. Months later, a drawing or an unfinished piece of code suddenly seems connected to it. On disk, these things may live in completely different folders. In thought, they belong to the same unfolding investigation.

**I wanted somewhere to work with those connections—not just somewhere to store the files.**

Akasha is a local-first desktop environment for arranging and relating notes, documents, images, code, and the ideas between them. It does not ask you to move everything into a new library. An Akasha workspace can register individual files or whole directories wherever they already live, while keeping its own notes, relationships, and layouts separately. The original work stays in the tools and places where it belongs.

![An Akasha workspace containing spatial boards, notes, and source previews.](assets/workspace.png)

The system rests on a few distinctions. A **Cell** is a persistent identity: a question, a PDF, a sketch, an idea. A **Shoma** is a spatial view centered on a subject. The same Cell can appear in several Shomas without becoming several copies. A **relationship** records why two things are connected; a **placement** records only where you want to see them. A paragraph can be referenced or projected into another context without being torn from its source.

Imagine studying machine learning. Your implementations live in a code repository, your reading notes in another directory, and your sketches somewhere else. You can bring these into a Shoma about *learning*, develop an idea beside its sources, and later bring that **same idea** into a Shoma for a graph simulation. Its writing remains shared, while each view gives it a different context. Connections can also be explored through graph navigation and relationship-pattern queries.

![One question, two contexts: editing a shared Cell updates both appearances.](assets/shared-thought.mp4)

What matters to me is that **organization need not come before understanding**. I may not yet know whether something is a research project, a passing curiosity, or the beginning of an invention. I should be able to place things together, notice a pattern, make a relationship explicit when I mean it, and let an interesting thought grow into a world of its own.

Akasha is an attempt to make a body of work accumulate *continuity*: not a rigid hierarchy of folders or a machine that decides what my ideas mean, but an atlas I can keep revisiting, rearranging, and extending as I learn.

It is a working personal-alpha project built with TypeScript, Svelte, Electron, and CodeMirror. The current source build supports independent workspaces, registered source locations, spatial arrangement, shared Cells, native Markdown writing, references, transclusions, and relationship-based exploration.

[Explore the full project](index.md) · [Read the user manual](manual.md)
