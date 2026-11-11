// Slugs are validated before reaching this template; token is random hex, never content.
import { normalizeBasePath } from './client/model.js';
export function pageHTML(slug, token = '', base = '/personal/') {
  normalizeBasePath(base);
  return `<!doctype html>
<html lang="en" data-slug="${slug}" data-space-base="${base}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,follow">
  <meta name="description" content="An experiment in words, images, and open space.">
  <title>Zibaldone</title>
  <link rel="stylesheet" href="${base}client/style.css">
${token ? `<meta name="zibaldone-editor-token" content="${token}"><link rel="stylesheet" href="${base}client/editor.css">` : ''}
</head>
<body>
  <nav id="breadcrumbs" aria-label="Canvas trail"><ol></ol></nav>
  <main id="viewport" aria-label="Spatial page. Space and drag or trackpad scroll to pan; mouse wheel or Ctrl and scroll to zoom. On touch, drag to pan.">
    <div id="world"></div>
  </main>
  <p id="notice" role="alert" hidden></p>
  <dialog id="focus-view" aria-label="Object in isolation">
    <button id="close-focus" type="button">Close ×</button>
    <div id="focus-content"></div>
  </dialog>
  <noscript>This spatial prototype requires JavaScript to load its page data.</noscript>
  <script type="module" src="${base}client/main.js"></script>
${token ? `<script type="module" src="${base}client/editor.js"></script>` : ''}
</body>
</html>\n`;
}
