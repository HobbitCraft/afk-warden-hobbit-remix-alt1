const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const vendor = fs.readFileSync(path.join(root, 'vendor/chatbox.js'), 'utf8');
const start = vendor.indexOf('    find(imgornull) {');
const end = vendor.indexOf('    checkTimestamp(', start);
class Rect {
  constructor(x, y, width, height) { Object.assign(this, { x, y, width, height }); }
  overlaps(other) {
    return this.x < other.x + other.width && this.x + this.width > other.x &&
      this.y < other.y + other.height && this.y + this.height > other.y;
  }
}
const names = ['plusbutton', 'filterbutton', 'minusbutton', 'chatbubble', 'chatLegacyBorder',
  'legacyreport', 'gameall', 'gamefilter', 'gameoff'];
const imgs = Object.fromEntries(names.map(name => [name, name]));
const widths = { public: 43, private: 68, group: 40, groupironman: 66, privateRecent: 14 };
const raw = Object.fromEntries(Object.entries(widths).map(([key, width]) => [key, { key, width }]));
const chatmap = { public: 'main', private: 'private', group: 'gc', groupironman: 'gimc', privateRecent: 'private' };
const find = new Function('a1lib', 'imgs', 'chatimgs', 'chatmap',
  'return function ' + vendor.slice(start, end).trim())({ Rect }, imgs, { raw, privateRecent: 'To' }, chatmap);

function scene(windows, reverse = false, extraPrivate = []) {
  const corners = windows.slice();
  if (reverse) corners.reverse();
  return {
    findSubimage(image, x, y, width) {
      if (image === 'minusbutton') return corners.map(box => ({ x: box.right - 5, y: box.top - 21 }));
      if (image === 'chatbubble') return corners.filter(box => box.label !== 'recent').map(box => ({ x: box.left, y: box.bottom + 1 }));
      if (image === 'To') return corners.filter(box => box.label === 'recent').map(box => ({ x: box.left, y: box.bottom + 1 })).concat(extraPrivate);
      if (image === 'gameall') return windows.filter(box => box.gameX !== undefined &&
        box.gameX >= x && box.gameX + 30 <= x + width && Math.abs(box.top - 22 - y) < 2)
        .map(box => ({ x: box.gameX, y }));
      return [];
    },
    toData(x, y) {
      const box = windows.find(box => box.left + 19 === x && box.bottom + 1 === y);
      return { pixelCompare: label => box && (label.key === box.label ||
        (box.label === 'groupironman' && ['group', 'privateRecent'].includes(label.key))) ? 0 : Infinity,
      data: [255, 255, 255, 255] };
    },
  };
}
const main = { left: 50, top: 100, right: 400, bottom: 300, label: 'public', gameX: 20 };
const gim = { left: 500, top: 101, right: 800, bottom: 300, label: 'groupironman' };
function detect(windows, reverse = false, extraPrivate = []) {
  const reader = { checkTimestamp: () => false };
  return find.call(reader, scene(windows, reverse, extraPrivate));
}
for (const reverse of [false, true]) {
  const result = detect([main, gim], reverse, [{ x: 570, y: 301 }]);
  assert.deepEqual(result.boxes.map(box => box.type), ['main', 'gimc']);
  assert.equal(result.boxes.length, 2, 'short To matches must not create extra private windows');
  assert.equal(result.boxes[1].captureLeft, 400);
  assert.ok(result.boxes[1].rect.x >= 400, 'GIM must not borrow Main game-filter buttons');
  assert.ok(result.boxes.every(box => box.rect.width > 0 && box.rect.height > 0));
  assert.ok(!result.boxes[0].rect.overlaps(result.boxes[1].rect));
}
assert.deepEqual(detect([gim, main]).boxes.map(box => box.type), ['main', 'gimc']);
const stacked = detect([main, { ...gim, left: 50, top: 340, bottom: 550, right: 400 }], true);
assert.deepEqual(stacked.boxes.map(box => box.type), ['main', 'gimc']);
const pm = detect([main, { ...gim, label: 'recent' }]);
assert.deepEqual(pm.boxes.map(box => box.type), ['main', 'private'], 'real private chat must remain detectable');
const swapped = detect([{ ...main, label: 'groupironman' }, { ...gim, label: 'public' }]);
assert.equal(swapped.mainbox.type, 'main');
assert.equal(swapped.mainbox.captureLeft, 400, 'a Main window on the right must not capture GIM on its left');

const readStart = vendor.indexOf('    read(img) {');
const readEnd = vendor.indexOf('    //convert some similar characters', readStart);
const captures = [];
const mixColor = (r, g, b) => (r << 16) | (g << 8) | b;
const read = new Function('a1lib', 'base_1', 'ChatBoxReader', 'return function ' + vendor.slice(readStart, readEnd).trim())(
  { mixColor, unmixColor: () => [255, 255, 255] }, { ImgRefData: class {} }, { getMessageTime: () => -1 });
read.call({ pos: swapped, readargs: { colors: [] }, font: { lineheight: 16, dy: -3 }, diffRead: false,
  readChatLine: () => ({ text: '', fragments: [] }), overlaplines: [], minoverlap: 2 },
  { toData: (x, y, width, height) => { captures.push({ x, y, width, height }); return {}; } });
assert.equal(captures[0].x, 400, 'production OCR crop must stop at the neighbouring window');

const source = fs.readFileSync(path.join(root, 'afk-warden-hobbit-remix-chat-select.js'), 'utf8');
const marker = source.indexOf('  if (!install())');
const storage = new Map();
const windowMock = {};
const context = { window: windowMock, document: {}, localStorage: {
  getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value)),
} };
vm.runInNewContext(source.slice(0, marker) + 'window.patchReaderForTest = patchSharedReader;})();', context);
const api = windowMock.AfkWardenHobbitRemixChatSelect;
let invalidations = 0;
let reads = 0;
const reader = { pos: detect([main, gim]), overlaplines: [] };
windowMock.AfkScripts = { sharedChatboxReader: { reader, tryFind() {}, read() {
  reads++; return [reader.pos.mainbox.type];
}, invalidate() { invalidations++; } } };
windowMock.patchReaderForTest();
const shared = windowMock.AfkScripts.sharedChatboxReader;
api.setSelectedIndex(0);
assert.deepEqual(shared.read(), ['main']);
reader.pos.boxes.reverse();
assert.deepEqual(shared.read(), ['main'], 'reordered results must retain the selected window');
assert.deepEqual(reader.pos.boxes.map(box => box.type), ['main', 'gimc']);
api.setSelectedIndex(1);
assert.deepEqual(shared.read(), ['gimc']);
assert.ok(invalidations >= 2, 'switching windows must discard the per-tick cache');
reader.pos = detect([main, { ...gim, label: 'unknown' }]);
assert.deepEqual(shared.read(), ['gimc'], 'typing must not erase a previously identified GIM label');
reader.pos = detect([main]);
const before = reads;
assert.equal(shared.read().length, 0, 'a missing selected chat must not read another window');
assert.equal(reads, before);
reader.pos = detect([main, { ...gim, left: 600, right: 900 }]);
assert.deepEqual(shared.read(), ['gimc'], 'a uniquely identified moved chat must remain selected');
console.log('Chat window detection, isolation, and stable selection checks passed');
