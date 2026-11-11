import { validatePage, translateElement } from './model.js';
const PREFIX = 'SPACE_ELEMENTS_V1\n';
export const encodeClipboard = elements => PREFIX + JSON.stringify(elements);
export function decodeClipboard(text) {
  if (!text?.startsWith(PREFIX)) return null;
  if (text.length > 2 * 1024 * 1024) throw new Error('Clipboard selection is too large.');
  const elements = JSON.parse(text.slice(PREFIX.length));
  validatePage({ slug: 'clipboard', camera: { x: 0, y: 0, zoom: 1 }, elements });
  return elements;
}
export function cloneElements(elements, offset = 1, newId = () => crypto.randomUUID()) {
  return structuredClone(elements).map(e => translateElement({ ...e, id: newId() }, offset, offset));
}
