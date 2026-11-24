# File import build dependencies

These packages run in the local Node authoring server and static build. The
public viewer receives only sanitized HTML, native media and generated ZIP
downloads. Package code and its licenses remain in the installed npm packages;
the lockfile records exact versions and integrity hashes.

| Package | Purpose | License / upstream |
| --- | --- | --- |
| `uniorg-parse` 3.2.2, `uniorg-rehype` 2.2.0 | Org AST and HTML conversion | GPL-3.0-or-later, [Uniorg](https://github.com/rasendubi/uniorg) by Oleksii Shmalko |
| `marked` 18.0.14 (already used by Wunderkammer) | Markdown/GFM conversion | MIT, [Marked](https://github.com/markedjs/marked) |
| `unified` 11.0.5 | Local conversion pipeline | MIT, [unified](https://github.com/unifiedjs/unified) |
| `rehype-parse` 9.0.1, `rehype-stringify` 10.0.1 | HTML AST input/output | MIT, [rehype](https://github.com/rehypejs/rehype) |
| `rehype-sanitize` 6.0.0 | Allowlisted HTML and URLs | MIT, [rehype-sanitize](https://github.com/rehypejs/rehype-sanitize) |
| `fflate` 0.8.3 | Deterministic ZIP downloads preserving original bytes | MIT, [fflate](https://github.com/101arrowz/fflate) by Arjun Barrett |

Transitive dependency licenses are included with each installed package.
Font licenses and source notices remain in `assets/`: Xanh Mono and Zenbones Mono
use their supplied SIL Open Font License notices. Baskerville uses the visitor's
system font and existing serif fallbacks; no Baskerville font file is redistributed.

`tests/fixtures/import-animation.gif`, `import-clip.mp4` and `import-clip.webm` are small synthetic
color fixtures generated for these tests, with no third-party media content.
