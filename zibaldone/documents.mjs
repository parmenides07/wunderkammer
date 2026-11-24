import { unified } from 'unified';
import orgParse from 'uniorg-parse';
import orgRehype from 'uniorg-rehype';
import htmlParse from 'rehype-parse';
import sanitize from 'rehype-sanitize';
import stringify from 'rehype-stringify';
import { marked } from 'marked';
import { extension, decodeText } from './client/files.js';
import { validHref } from './client/model.js';

const schema = {
  tagNames: ['p','h1','h2','h3','h4','h5','h6','strong','b','em','i','del','s','u','ul','ol','li','blockquote','pre','code','hr','br','table','thead','tbody','tr','th','td','a','span','div','sup','sub','dl','dt','dd'],
  attributes: { a: ['href','title'], '*': ['id'], ol: ['start'], td: ['colSpan','rowSpan'], th: ['colSpan','rowSpan'] },
  protocols: { href: ['https','http','mailto','tel'] }, clobberPrefix: 'doc-',
  strip: ['script','style','iframe','object','embed','form','input','svg','math','template'],
};
const text = node => node.type === 'text' ? node.value : (node.children || []).map(text).join('');
function cleanLinks(references) {
  return () => tree => {
    let heading = 0;
    const ids = new Map();
    function visit(node) {
      if (node.type === 'element') {
        const p = node.properties ||= {};
        if (/^h[1-6]$/.test(node.tagName) && !p.id) {
          const id = text(node).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || `heading-${++heading}`;
          const count = ids.get(id) || 0; ids.set(id, count + 1); p.id = count ? `${id}-${count}` : id;
        }
        if (node.tagName === 'img') { node.type = 'text'; node.value = p.alt || '[image reference — import the image separately]'; delete node.children; return; }
        if (node.tagName === 'a' && p.href) {
          const href = String(p.href);
          if (/^#[\p{L}\p{N}_.:-]+$/u.test(href)) p.href = '#doc-' + href.slice(1);
          else if (validHref(href) || [...references.values()].includes(href)) p.href = href;
          else {
            const relative = href.replace(/^file:/, '').replace(/^\.\//, '');
            const resolved = !/[\\/]/.test(relative) && references.get(relative);
            if (resolved) p.href = resolved; else delete p.href;
          }
        }
      }
      for (const child of node.children || []) visit(child);
    }
    visit(tree);
  };
}
export async function renderDocument(bytes, filename, references = new Map()) {
  if (!/^(org|md|markdown)$/.test(extension(filename))) {
    const escaped = decodeText(bytes).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
    return '<div><pre class="plain-text">' + escaped + '</pre></div>';
  }
  let source;
  try { source = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { throw new Error('Documents must be UTF-8 text.'); }
  if (source.includes('\0')) throw new Error('Documents cannot contain binary data.');
  let processor;
  if (extension(filename) === 'org') {
    processor = unified().use(orgParse).use(orgRehype, { imageFilenameExtensions: [] });
    const title = source.match(/^#\+TITLE:\s*(.+)$/im)?.[1];
    // Metadata becomes ordinary document text, never HTML or executable code.
    if (title) source = '* ' + title + '\n\n' + source;
  } else {
    processor = unified().use(htmlParse, { fragment: true });
    source = marked.parse(source, { gfm: true });
  }
  const result = await processor.use(cleanLinks(references)).use(sanitize, schema).use(stringify).process(source);
  return '<div>' + String(result) + '</div>';
}
