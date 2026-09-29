# Architecture migration record

The pre-edit repository was backed up to `/tmp/portfoliosite-before-semantic-migration.tar.gz` before substantial edits. The original Git baseline is `51c442f`. No changes have been committed or deployed by this migration.

## Files added

- `package.json`, `package-lock.json`, `.gitignore`
- `manifest.json`, `legacy-routes.json`, `site.config.json`
- `js/content.js`, `js/navigation.js`, `js/renderer.js`, `js/main.js`
- `generated/pages/`: 38 build-generated, frontmatter-free Markdown sources
- `work/index.html`: generated from the shared root shell
- `tests/build.test.js`, `tests/navigation.test.js`, `tests/content.test.js`, `tests/browser.cjs`
- `tools/content-migration-map.json`, this record, and expanded authoring instructions in `README.md`

`build.js`, `script.js` and `index.html` were updated. `style.css`, `CNAME` and the shared visual assets were not changed.

## Files moved

All canonical page moves are listed below and in machine-readable form in `tools/content-migration-map.json`. Related asset directories and HTML/CSV embeds moved with their projects or collections. Shared root Home assets remain in `content/assets`; Consumption and Inspirations have nearby copies of their shared assets.

| Original | Canonical authored page |
| --- | --- |
| `content/content.md` | `content/home.md` |
| `content/home/moreAboutMe.md` | `content/about/about.md` |
| `content/sciences/akashom/akashom.md` | `content/projects/akashom/index.md` |
| `content/sciences/akashom/VisualNon-VisualTrailer.md` | `content/projects/akashom/visual-nonvisual-trailer.md` |
| `content/sciences/akashom/DL2_Visualmaxxing_Is_Meta.md` | `content/projects/akashom/visual-design.md` |
| `content/sciences/akashom/DL5_Distros_and_Architecture.md` | `content/projects/akashom/architecture.md` |
| `content/sciences/cornocupia/cornocupia.md` | `content/projects/cornocupia/index.md` |
| `content/sciences/jivan/jivanDefined.md` | `content/projects/jivan/index.md` |
| `content/arts/prose/pm_02/projectMindscape.md` | `content/projects/mindscape/index.md` |
| `content/arts/prose/pm_02/premise.md` | `content/projects/mindscape/premise.md` |
| `content/arts/prose/pm_02/theLeviathan.md` | `content/projects/mindscape/leviathan.md` |
| `content/arts/prose/pm_02/mindscapeExamples/braise.md` | `content/projects/mindscape/examples/braise.md` |
| `content/arts/prose/pm_02/mindscapeExamples/lawralai.md` | `content/projects/mindscape/examples/lawralai.md` |
| `content/arts/prose/pm_02/mindscapeExamples/praferin.md` | `content/projects/mindscape/examples/praferin.md` |
| `content/arts/prose/pm_02/mindscapeExamples/riabKaj.md` | `content/projects/mindscape/examples/riab-kaj.md` |
| `content/arts/visuals/darkroom/darkroom.md` | `content/projects/darkroom/index.md` |
| `content/sciences/sciences.md` | `content/notes/systems/logic-composed-emergent-systems.md` |
| `content/arts/prose/theMindfill/theMindfill.md` | `content/notes/mindfill/index.md` |
| `content/arts/prose/theMindfill/03-16-26_MyMotherTongue.md` | `content/notes/mindfill/my-mother-tongue.md` |
| `content/arts/prose/theMindfill/03-16-26_PumpingImaginaryIron.md` | `content/notes/mindfill/pumping-imaginary-iron.md` |
| `content/arts/prose/theMindfill/03-18-26_CalculusKellogsAnd Knowledge.md` | `content/notes/mindfill/calculus-kellogs-and-knowledge.md` |
| `content/arts/prose/theMindfill/03-21-26_EmergentComplexityAndControl.md` | `content/notes/mindfill/emergent-complexity-and-control.md` |
| `content/arts/prose/theMindfill/03-23-26_ChefsInCS.md` | `content/notes/mindfill/chefs-in-cs.md` |
| `content/arts/prose/theMindfill/04-16-26_PursuingGreatness.md` | `content/notes/mindfill/pursuing-greatness.md` |
| `content/arts/prose/theMindfill/04-26-26_TheStandUserCouldBeAnyone.md` | `content/notes/mindfill/the-stand-user-could-be-anyone.md` |
| `content/arts/prose/philosophy/philosophy.md` | `content/notes/philosophy/index.md` |
| `content/arts/prose/philosophy/maximalistSoulDriver.md` | `content/notes/philosophy/maximalist-soul-driver.md` |
| `content/arts/visuals/visuals.md` | `content/notes/art/harnessing-visuals-with-art.md` |
| `content/arts/visuals/lets_Talk_About_AI_Art.md` | `content/notes/art/lets-talk-about-ai-art.md` |
| `content/miscConsumption.md` | `content/archive/consumption/index.md` |
| `content/miscIdeas.md` | `content/archive/ideas/index.md` |
| `content/myChosenCareerPath.md` | `content/archive/career/my-chosen-career-path.md` |
| `content/arts/visuals/currentInspirations.md` | `content/archive/inspiration/current-inspirations.md` |
| `content/arts/visuals/pandorasMusicbox/currents.md` | `content/archive/music/currents.md` |
| `content/arts/prose/schoolEssays/whyArtEssay.md` | `content/archive/school-writing/why-art.md` |
| `content/arts/prose/schoolEssays/whatIsEducationFor.md` | `content/archive/school-writing/what-is-education-for.md` |
| `content/arts/prose/flowOfConciousness/proofOfConcept.md` | `content/archive/experiments/proof-of-concept.md` |
| `content/arts/prose/prose.md` | `content/archive/writing/when-it-rains-it-prose.md` |

The two empty placeholders moved into `content/drafts/` and are unpublished.

## Files removed or consolidated

- `index.json`, replaced by the semantic manifest and asset directory index.
- All old `_order.json` files, replaced by metadata plus `site.config.json`.
- Both `content/.obsidian` and the nested Mindscape `.obsidian` tree, including editor themes/plugins.
- Duplicate Home, Ideas and Career pages under `content/home/`, and duplicate Home assets. Their legacy routes resolve to the canonical pages.
- The divergent old Consumption copy: the root version is canonical, with its missing July 21 and July 27 entries restored from the older copy. No unique entries were discarded.
- Empty obsolete subject directories after moving their contents.

All 263 original non-editor assets were compared by Git blob hash; every one survives byte-for-byte. All 38 canonical Markdown bodies were compared against the pre-migration text. Only known internal route destinations and the restored Consumption entries differ. Metadata extraction also fixes the stray trailing backticks on Leviathan's old WIP/banner lines.

## Architectural changes

Navigation no longer depends on filesystem shape or a `.created` heuristic. Frontmatter is validated at build time, with duplicate IDs/slugs and invalid/missing metadata producing source-specific errors. The manifest carries metadata, stable slugs, author/generated source paths, asset bases, gallery indexes and 147 legacy aliases.

The browser filters pages by audience first, then constructs groups and next-page lists. The normal view contains 38 pages; work mode contains 9. Stable IDs key visit state. Existing path-based visits are migrated when recognized. Browser hash changes, direct URLs, refresh and history navigation use the same semantic lookup.

The build emits a shared work shell and clean Markdown sources. There are no new runtime dependencies or frameworks. Existing styling, rendering wrappers and paper effects are retained.

## Manual content review

- **Review Home and About before sharing `/work/`.** Their prose was preserved and still describes older plans/interests.
- **Cornocupia spelling:** retained the existing displayed name because neither metadata nor prose establishes a preferred correction. Project label/ID/slug use `cornocupia` for now.
- **Missing About essay:** `Why I Do What I Do` still links to `https://parmenides07.github.io/wunderkammer/#whenItRainsItProse/philosophy/04-08-26_Why_I_Do_What_I_Do.md`. No corresponding essay exists in this repository. Its original link was retained instead of inventing a replacement.
- **Dates:** dated Mindfill filenames supplied their original dates; otherwise initial/last content dates came from Git history. These are now explicit metadata. Review them if more accurate original publication dates are known.
- **Professional selection:** Home, About, all four Akashom pages, Jivan, Cornocupia, and Emergent Complexity and Control are included. Logic-Composed Emergent Systems remains public-only pending review.
- **Historical writing:** Maximalist Soul Driver is marked `archived` and can later be changed to `superseded`. Career writing is in Personal Snapshots, not About. Other essays retain their prose.
- **Additional prose:** When It Rains It Prose was discovered outside the supplied mapping and retained in Archive / Writing.
- **Missing original font:** the unchanged stylesheet references `assets/Baskerville.woff2`, which is absent from the original repository. The existing serif fallback is preserved. Restore the intended font later if desired; browser checks classify this known 404 separately from migration failures.
- **No Now prose was written.** Add a page with `section: about` when ready.

## Validation

Stages A–D were each built and loaded over local HTTP in headless Chrome before proceeding. Stage A used a temporary compatibility bridge; Stage B briefly rebuilt the old index to check moved assets. Neither bridge nor old index remains.

Final validation passed:

- `npm run build`, `npm test` (build, content and navigation suites), JavaScript syntax checks and `git diff --check`.
- 54 browser page checks, covering all 38 public pages, all 9 professional pages, repeated special-feature checks, semantic direct loads, refresh, back/forward and legacy normalization.
- Professional navigation contains no archive/worldbuilding/photography groups; filtered next traversal checks pass. Both `/work/` and `/work/index.html` select professional mode.
- 41 Darkroom gallery images, including full-width mode; all rendered local images loaded successfully.
- Banners, WIP, CSV tables, HTML iframes, multiply blending, lightbox, ambient sound, right-click sound images, mute/unmute, both draggable cards, both tuck controls, folder-line animation, next-page control and stable-ID visit markers.
- No uncaught JavaScript errors or migration-induced local HTTP failures. Browser console inspection found only pre-existing missing `assets/Baskerville.woff2` and browser-requested `favicon.ico` 404s. The original repository has neither file; both are left unchanged.
- Screenshots reviewed at `/tmp/site-public-final.png` and `/tmp/site-work-final.png`. The detailed browser report is in ignored `.test-results/browser.json`.

The browser verifies media playback state and URLs; an optional human listening pass can confirm audio balance. External embedded videos remain dependent on their hosts.
