const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.join(__dirname, '..');

async function library(name) {
  if (process.env.ALT1_READER_DEPS) return fs.readFile(path.join(process.env.ALT1_READER_DEPS, name + '.js'), 'utf8');
  const response = await fetch('https://www.unpkg.com/alt1@0.1.3/dist/' + name + '/index.js');
  assert.ok(response.ok, 'Could not load pinned Alt1 ' + name);
  return response.text();
}

(async () => {
  const browser = await chromium.launch({ headless: true,
    ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  try {
    const page = await browser.newPage();
    await page.route('https://chat.test/**', route => route.fulfill({ contentType: 'text/html', body: '<html><body></body></html>' }));
    await page.goto('https://chat.test/');
    for (const name of ['base', 'ocr']) await page.addScriptTag({ content: await library(name) });
    await page.addScriptTag({ content: await fs.readFile(path.join(root, 'vendor/chatbox.js'), 'utf8') });
    const png = await fs.readFile(path.join(__dirname, 'fixtures/main-group-chat.png'));
    const result = await page.evaluate(async base64 => {
      const image = new Image();
      image.src = 'data:image/png;base64,' + base64;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext('2d');
      context.drawImage(image, 0, 0);
      const capture = window.testCapture = new A1lib.ImgRefData(context.getImageData(0, 0, canvas.width, canvas.height));
      const shared = window.testReader = new Chatbox.default();
      shared.find(capture);
      return shared.pos.boxes.map(box => {
        const reader = new Chatbox.default();
        reader.pos = { boxes: shared.pos.boxes, mainbox: structuredClone(box) };
        reader.diffRead = false;
        const lines = reader.read(capture);
        return { type: box.type, font: reader.font?.name, rect: box.rect, lines: lines?.map(line => line.text).filter(Boolean) };
      });
    }, png.toString('base64'));
    assert.deepEqual(result.map(box => box.type), ['main', 'gimc']);
    assert.ok(result.every(box => box.font === '12pt'));
    assert.ok(result[0].lines.some(line => line.includes('A Seren spirit appears')));
    assert.ok(!result[0].lines.some(line => line.includes('your bank.')), 'Main must not read GIM pixels');
    assert.deepEqual(result[1].lines, ['your bank.', 'your bank.']);
    assert.ok(result[1].rect.x >= result[0].rect.x + result[0].rect.width);
    await page.evaluate(() => {
      window.AfkScripts = { sharedChatboxReader: { reader: testReader, tryFind() {}, read() {}, invalidate() {} } };
    });
    const helper = await fs.readFile(path.join(root, 'afk-warden-hobbit-remix-chat-select.js'), 'utf8');
    await page.addScriptTag({ content: helper.slice(0, helper.indexOf('  if (!install())')) + '})();' });
    const previews = await page.evaluate(() => {
      const api = AfkWardenHobbitRemixChatSelect;
      const editor = new Chatbox.default();
      api.setSelectedIndex(0);
      const main = api.readEditor(editor, testCapture, [], null).map(line => line.text).filter(Boolean);
      api.setSelectedIndex(1);
      const gim = api.readEditor(editor, testCapture, [], null).map(line => line.text).filter(Boolean);
      return { main, gim };
    });
    assert.ok(previews.main.some(line => line.includes('A Seren spirit appears')));
    assert.deepEqual(previews.gim, ['your bank.', 'your bank.']);
    const aligned = await page.evaluate(() => {
      const data = testCapture.toData();
      const canvas = document.createElement('canvas');
      canvas.width = data.width;
      canvas.height = data.height;
      const context = canvas.getContext('2d');
      context.putImageData(new ImageData(new Uint8ClampedArray(data.data), data.width, data.height), 0, 0);
      const header = context.getImageData(476, 94, 340, 26);
      context.fillStyle = '#0c1a23';
      context.fillRect(476, 94, 340, 26);
      context.putImageData(header, 476, 32);
      const reader = new Chatbox.default();
      const found = reader.find(new A1lib.ImgRefData(context.getImageData(0, 0, canvas.width, canvas.height)));
      return found.boxes.map(box => ({ type: box.type, right: box.rect.x + box.rect.width }));
    });
    assert.deepEqual(aligned, [{ type: 'main', right: 458 }, { type: 'gimc', right: 800 }],
      'GIM header buttons must not stand in for a changed Main collapse icon on the same row');
    // Run the production editor UI with real OCR; only the host capture and DOM framework are supplied here.
    const bundle = await fs.readFile(path.join(root, 'scripts.bundle.js'), 'utf8');
    const factoryStart = bundle.indexOf('s=function(e,t){var s=globalThis.Chatbox');
    const factoryEnd = bundle.indexOf('}(e.lines,e.colors);', factoryStart);
    assert.ok(factoryStart >= 0 && factoryEnd > factoryStart);
    const factory = bundle.slice(factoryStart + 2, factoryEnd + 1);
    await page.evaluate(factory => {
      window.se = (spec, attrs, children) => {
        if (Array.isArray(attrs)) { children = attrs; attrs = {}; }
        const [classes, tagSpec = 'div'] = spec.split(':');
        const [tag, type] = tagSpec.split('/');
        const node = document.createElement(tag);
        node.className = classes;
        if (type) node.type = type;
        for (const [key, value] of Object.entries(attrs || {})) {
          if (key.startsWith('on')) node[key] = value;
          else node.setAttribute(key, value);
        }
        node.append(...(children || []));
        return node;
      };
      window.ae = (...children) => { const fragment = document.createDocumentFragment(); fragment.append(...children); return fragment; };
      window.re = (node, content) => node.replaceChildren(content);
      window.ie = (...keys) => Object.fromEntries(keys.map(key => [key, null]));
      window.w = (r, g, b) => `rgb(${r},${g},${b})`;
      window.A1lib = { ...A1lib, capture: (x, y, width, height) => testCapture.toData(x, y, width, height) };
      window.b = { ...A1lib, captureHoldFullRs: () => testCapture };
      window.Y = { defaultcolors: Chatbox.defaultcolors };
      AfkWardenHobbitRemixChatSelect.setSelectedIndex(0);
      window.pixelPreview = eval('(' + factory + ')')({ getValue: () => [] }, { getValue: () => [] });
      document.body.append(pixelPreview.root);
    }, factory);
    await page.waitForFunction(() => document.querySelector('.chatbox-content')?.textContent.includes('A Seren spirit appears'), null, { timeout: 3000 });
    await page.evaluate(() => { AfkWardenHobbitRemixChatSelect.setSelectedIndex(1); pixelPreview.draw(); });
    await page.waitForFunction(() => document.querySelector('.chatbox-content')?.textContent.includes('your bank.'), null, { timeout: 3000 });
    assert.ok(!(await page.locator('.chatbox-content').textContent()).includes('A Seren spirit appears'));
    console.log('Real-pixel Main/GIM detection, OCR, and new-alert preview checks passed');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
