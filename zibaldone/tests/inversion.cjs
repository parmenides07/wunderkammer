const canvasReady = require('./navigation.cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

const settle = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const ready = async page => { await canvasReady(page);
  await page.waitForSelector('[data-id=note]');
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map(image => image.decode()));
  });
};

async function checkRectangle(page, id, activate) {
  await page.mouse.move(10, 10);
  await page.evaluate(() => document.activeElement.blur());
  await settle(page);
  await page.waitForFunction(() => [...document.querySelectorAll('.image-object img')].every(img => {
    const transform = getComputedStyle(img).transform;
    return transform === 'none' || Math.abs(new DOMMatrix(transform).a - 1) < 0.000001;
  }));
  const box = await page.locator(`[data-id="${id}"]`).boundingBox();
  const before = (await page.screenshot()).toString('base64');
  await activate(box);
  await page.waitForFunction(id => document.querySelector('#viewport').dataset.feedback === id, id);
  await settle(page);
  const after = (await page.screenshot()).toString('base64');
  assert.deepEqual(await page.locator(`[data-id="${id}"]`).boundingBox(), box);
  const result = await page.evaluate(async ({ before, after, box }) => {
    // Test-only pixel inspection of browser screenshots; no canvas is added to
    // the page and the production renderer remains entirely DOM based.
    const decode = async base64 => {
      const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const context = canvas.getContext('2d');
      context.drawImage(bitmap, 0, 0);
      return context.getImageData(0, 0, bitmap.width, bitmap.height);
    };
    const [a, b] = await Promise.all([decode(before), decode(after)]);
    let mismatch = 0, whites = 0, darks = 0, samples = 0;
    const colors = new Set();
    const pixel = (image, x, y) => [...image.data.slice((y * image.width + x) * 4, (y * image.width + x) * 4 + 3)];
    for (let y = Math.ceil(box.y) + 2; y < Math.floor(box.y + box.height) - 2; y++) {
      for (let x = Math.ceil(box.x) + 2; x < Math.floor(box.x + box.width) - 2; x++) {
        if (x < 0 || y < 0 || x >= a.width || y >= a.height) continue;
        const original = pixel(a, x, y), inverted = pixel(b, x, y);
        if (original.some((c, i) => Math.abs(c + inverted[i] - 255) > 2)) mismatch++;
        if (original.every(c => c === 255)) whites++;
        if (original.every(c => c < 40)) darks++;
        colors.add(original.join(','));
        samples++;
      }
    }
    // Pixels immediately outside the grid rectangle must remain unchanged,
    // including overflowing text. Avoid the existing focus button at its right.
    let outsideMismatch = 0;
    for (const y of [Math.floor(box.y) - 8, Math.ceil(box.y + box.height) + 8]) {
      for (let x = Math.ceil(box.x) + 4; x < Math.floor(box.x + box.width) - 4; x++) {
        if (x >= 0 && y >= 0 && x < a.width && y < a.height && pixel(a, x, y).some((c, i) => c !== pixel(b, x, y)[i])) outsideMismatch++;
      }
    }
    return { mismatch, outsideMismatch, whites, darks, samples, colors: colors.size };
  }, { before, after, box });
  if (result.mismatch || result.outsideMismatch) {
    await fs.writeFile(`/tmp/space-inversion-${id}-before.png`, Buffer.from(before, 'base64'));
    await fs.writeFile(`/tmp/space-inversion-${id}-after.png`, Buffer.from(after, 'base64'));
  }
  assert.ok(result.samples > 1000, `${id}: enough visible pixels checked`);
  assert.equal(result.mismatch, 0, `${id}: every interior pixel must be its original RGB complement`);
  assert.equal(result.outsideMismatch, 0, `${id}: inversion must stop at the grid rectangle`);
  return result;
}

module.exports = async function inversionChecks({ page, browser, origin, root }) {
  // Reuse an existing local photograph when present; the bundled Zion image is
  // the deterministic fallback on a fresh checkout. Authored assets are read-only.
  const photo = (await fs.readdir(path.join(root, 'assets'))).find(name => /\.jpe?g$/i.test(name)) || 'zion.png';
  await fs.writeFile(path.join(root, 'assets', 'transparent-test.gif'), Buffer.from('R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==', 'base64'));
  const text = (id, x, y, width, height, value, extra = {}) => ({ id, type: 'text', x, y, width, height, text: value, font: 'mono', fontSize: 20, invertOnHover: true, ...extra });
  const fixture = {
    slug: 'inversion-test', camera: { x: 0, y: 0, zoom: 1 }, elements: [
      text('note', -14, -7, 14, 8, 'Black type.\nRoom around it.'),
      { id: 'photo', type: 'image', x: -2, y: -5, width: 20, height: 12, src: `/personal/assets/${photo}`, alt: 'Local photograph' },
      text('overlap', -7, -4, 8, 5, 'OVERLAP'),
      { id: 'transparent', type: 'image', x: 12, y: -5, width: 5, height: 6, src: '/personal/assets/transparent-test.gif', alt: 'Transparent test image' },
      text('veil', 12, -5, 5, 6, '', { zIndex: 1 }),
      text('overflow', -14, 4, 4, 1, 'Text outside this small box remains visible and uninverted.'),
      text('link', -14, 9, 8, 2, 'Back home', { href: '/personal/' }),
    ],
  };
  await fs.writeFile(path.join(root, 'pages', 'inversion-test.json'), JSON.stringify(fixture));
  await page.goto(origin + '/personal/#/inversion-test'); await canvasReady(page); await ready(page);
  const hover = (dx = 10, dy = 10) => box => page.mouse.move(box.x + dx, box.y + dy);
  const note = await checkRectangle(page, 'note', hover());
  assert.ok(note.whites > 1000 && note.darks > 100, 'empty white regions and dark text both invert');
  const transparent = await checkRectangle(page, 'veil', hover());
  assert.ok(transparent.whites > 100 && transparent.colors > 50, 'transparent areas invert both the white page and the photograph underneath');
  await checkRectangle(page, 'overflow', hover(5, 5));
  await checkRectangle(page, 'link', hover());

  // Keyboard focus on either an asset or its secondary focus action inverts
  // exactly the same box, without needing a hover-capable input device.
  await checkRectangle(page, 'note', async () => {
    await page.locator('[data-id=note] .content').focus();
    await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
  });
  await checkRectangle(page, 'link', async () => {
    await page.locator('[data-id=link] .content').focus();
    await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
  });
  await page.keyboard.press('Tab');
  assert.equal(await page.locator('#viewport').getAttribute('data-feedback'), 'link');
  const overlay = await page.locator('#viewport').evaluate(el => {
    const style = getComputedStyle(el, '::after');
    return { blend: style.mixBlendMode, pointer: style.pointerEvents, transition: style.transitionDuration };
  });
  assert.deepEqual(overlay, { blend: 'difference', pointer: 'none', transition: '0s' });

  // Recheck real pixels after a non-integer camera transform; overlay geometry
  // follows the same grid variables, without changing object stacking order.
  await page.mouse.move(10, 10); await page.evaluate(() => document.activeElement.blur());
  await page.evaluate(async () => (await (await import('/personal/client/main.js')).ready).camera.set({ x: 1.25, y: -0.75, zoom: 1.25 }));
  await checkRectangle(page, 'note', hover());
  await checkRectangle(page, 'veil', hover());
  await page.screenshot({ path: '/tmp/space-inversion-overlap.png' });
  assert.equal(await page.locator('[data-id=note]').evaluate(el => getComputedStyle(el).zIndex), '0');
  const savedCamera = await page.evaluate(async () => (await (await import('/personal/client/main.js')).ready).camera.value);
  const photoBox = await page.locator('[data-id=photo]').boundingBox();
  await page.mouse.click(photoBox.x + 100, photoBox.y + 10);
  assert.equal(await page.locator('#focus-view').evaluate(el => el.open), true);
  await page.locator('#close-focus').click();
  assert.deepEqual(await page.evaluate(async () => (await (await import('/personal/client/main.js')).ready).camera.value), savedCamera);
  await page.locator('[data-id=link] .content').click({ position: { x: 10, y: 10 } });
  await page.waitForURL('**/home'); await canvasReady(page);

  await page.goto(origin + '/personal/?edit5500#/inversion-test'); await canvasReady(page); await ready(page);
  await page.waitForSelector('#editor-tools');
  await page.locator('[data-id=note] .content').hover({ position: { x: 10, y: 10 } });
  assert.equal(await page.locator('#viewport').evaluate(el => getComputedStyle(el, '::after').display), 'none');
  await page.locator('[data-id=note] .content').click({ position: { x: 10, y: 10 } });
  assert.equal(await page.locator('[data-id=note].selected').count(), 1);
  await page.locator('#edit-text').click();
  assert.equal(await page.locator('#viewport').evaluate(el => getComputedStyle(el, '::after').display), 'none');

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  try {
    const touchPage = await mobile.newPage();
    await touchPage.goto(origin + '/personal/#/inversion-test'); await canvasReady(touchPage); await ready(touchPage);
    // Synthetic mouse hover must also stay disabled in a touch-only environment.
    await touchPage.locator('[data-id=overlap] .content').hover({ position: { x: 10, y: 10 } });
    assert.equal(await touchPage.locator('#viewport').evaluate(el => getComputedStyle(el, '::after').display), 'none');
    await touchPage.locator('[data-id=overlap] .content').tap({ position: { x: 10, y: 10 } });
    assert.equal(await touchPage.locator('#focus-view').evaluate(el => el.open), true);
    await touchPage.locator('#close-focus').tap();
  } finally { await mobile.close(); }
  console.log(`Opt-in text inversion pixels verified over blank/transparent regions and ${photo}; keyboard, touch, editor, links, and focus checked.`);
};
