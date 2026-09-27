const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const sourcePath = path.join(__dirname, "..", "afk-warden-hobbit-remix-chat-select.js");
const source = fs.readFileSync(sourcePath, "utf8");
const bundle = fs.readFileSync(path.join(__dirname, "..", "scripts.bundle.js"), "utf8");
const installMarker = source.indexOf("  if (!install())");
assert.notEqual(installMarker, -1, "chat selector install marker is missing");
assert.match(bundle, /\.readEditor\(s,e,t.getValue\(\),A\?a:null,Y.defaultcolors\)/);
assert.match(bundle, /\.startEditorLiveRefresh\(n,r\)/);
assert.match(bundle, /\.editorShouldStickToBottom\(o\.chatbox\)/);

let intervalCallback = null;
let clearedTimer = null;
const storage = new Map();
const mixColor = (red, green, blue) => (red << 16) | (green << 8) | blue;
const windowMock = {
  A1lib: {
    mixColor,
    unmixColor: (color) => [(color >> 16) & 255, (color >> 8) & 255, color & 255],
  },
};
const context = {
  clearInterval: (timer) => {
    clearedTimer = timer;
  },
  document: {},
  localStorage: {
    getItem: (key) => (storage.has(key) ? storage.get(key) : null),
    setItem: (key, value) => storage.set(key, String(value)),
  },
  setInterval: (callback) => {
    intervalCallback = callback;
    return 17;
  },
  setTimeout: () => 0,
  window: windowMock,
};

vm.runInNewContext(`${source.slice(0, installMarker)}})();`, context);
const api = windowMock.AfkWardenHobbitRemixChatSelect;

const defaults = [[255, 255, 255], [127, 169, 255], [255, 0, 0]];
windowMock.Chatbox = { defaultcolors: defaults };
const custom = [[74, 163, 200], [255, 255, 255]];
const palette = api.chatReadColors(custom);
for (const color of defaults.concat(custom, [[30, 255, 0], [235, 47, 47]])) {
  assert.ok(palette.includes(mixColor(...color)));
}
assert.equal(new Set(palette).size, palette.length);
assert.equal(custom.length, 2, 'OCR must not change saved alert colours');

function makeSample() {
  const width = 16;
  const height = 10;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let offset = 0; offset < data.length; offset += 4) {
    data[offset] = 10;
    data[offset + 1] = 10;
    data[offset + 2] = 10;
    data[offset + 3] = 255;
  }

  const setPixel = (x, y, color) => {
    const offset = 4 * x + 4 * width * y;
    data[offset] = color[0];
    data[offset + 1] = color[1];
    data[offset + 2] = color[2];
  };
  setPixel(1, 2, [210, 210, 210]);
  setPixel(6, 2, [74, 163, 200]);
  setPixel(9, 4, [74, 163, 200]);
  return { data, height, width };
}

const reader = {
  constructor: {},
  lastReadBuffer: {
    toData: () => makeSample(),
  },
  pos: {
    mainbox: {
      line0x: 0,
      rect: { height: 100, width: 100, x: 0, y: 0 },
    },
  },
  readargs: {
    colors: [mixColor(255, 255, 255)],
  },
};
const extraColors = [];
assert.equal(
  api.discoverEditorColors(reader, [{ basey: 20, fragments: [{ xend: 12 }] }], extraColors),
  true,
);
assert.deepEqual(Array.from(extraColors[0]), [74, 163, 200]);
reader.readargs.colors.push(mixColor(74, 163, 200));
assert.equal(api.discoverEditorColors(reader, [{ basey: 20, fragments: [] }], extraColors), false);

let readCount = 0;
const capturedData = makeSample();
windowMock.A1lib.ImgRefData = class {
  constructor(data) { this.data = data; }
};
reader.read = () => { readCount++; return [{ text: 'A mimicking soul appears nearby' }]; };
const capture = { toData: () => capturedData };
const lines = api.readEditor(reader, capture, [], null);
assert.equal(api.readEditor(reader, capture, [], null), lines);
assert.equal(readCount, 1, 'unchanged captures must not run OCR again');
capturedData.data[0]++;
api.readEditor(reader, capture, [], null);
assert.equal(readCount, 2, 'new pixels must trigger one OCR read');
api.readEditor(reader, capture, custom, null);
assert.equal(readCount, 3, 'a changed alert colour must invalidate the cached preview');
const discovered = [];
api.readEditor(reader, capture, custom, discovered);
assert.equal(readCount, 4, 'changing preview mode must allow colour discovery');
assert.ok(discovered.length <= 4, 'one refresh must learn at most four colours');
api.readEditor(reader, capture, custom, discovered);
assert.equal(readCount, 4, 'an unchanged preview must not repeat OCR or colour discovery');

const selectedBox = { rect: { x: 10 } };
reader.pos.boxes = [reader.pos.mainbox, selectedBox];
storage.set('afkWardenHobbitRemix.chatIndex', '1');
reader.font = { name: '12pt' };
api.applyToReader(reader, false);
assert.equal(reader.pos.mainbox, selectedBox);
assert.equal(reader.font, null, 'changing chat must reset the old font');

const container = {
  clientHeight: 130,
  scrollHeight: 500,
  scrollTop: 0,
};
assert.equal(api.editorShouldStickToBottom(container), true);
api.editorFinishRender(container, true);
assert.equal(container.scrollTop, 500);
container.scrollTop = 100;
assert.equal(api.editorShouldStickToBottom(container), false);
container.scrollTop = 365;
assert.equal(api.editorShouldStickToBottom(container), true);

let drawCount = 0;
const root = { isConnected: false };
assert.equal(api.startEditorLiveRefresh(root, () => drawCount++), 17);
intervalCallback();
assert.equal(drawCount, 0);
root.isConnected = true;
intervalCallback();
assert.equal(drawCount, 1);
root.isConnected = false;
intervalCallback();
assert.equal(clearedTimer, 17);

clearedTimer = null;
const closedRoot = { isConnected: true, ownerDocument: { defaultView: { closed: true } } };
api.startEditorLiveRefresh(closedRoot, () => drawCount++);
const beforeClosed = drawCount;
intervalCallback();
assert.equal(clearedTimer, 17);
assert.equal(drawCount, beforeClosed, 'closed popup documents can remain connected');

const selectionRoot = { isConnected: true, ownerDocument: { defaultView: {
  closed: false, getSelection: () => ({ isCollapsed: false }),
} } };
api.startEditorLiveRefresh(selectionRoot, () => drawCount++);
intervalCallback();
assert.equal(drawCount, beforeClosed, 'refresh must not replace text during selection');

clearedTimer = null;
const unusedRoot = { isConnected: false };
assert.equal(api.startEditorLiveRefresh(unusedRoot, () => drawCount++), 17);
for (let tick = 0; tick < 10; tick++) intervalCallback();
assert.equal(clearedTimer, 17);

// Execute the production alert matcher and shared per-tick OCR cache together.
const alertStart = bundle.indexOf('class qe extends ze');
const alertEnd = bundle.indexOf('getSettings(e)', alertStart);
const alertContext = vm.createContext({
  ze: class { constructor() { this.bar = 0; } setTriggered(value) { this.triggered = value; } },
  alt1: { rsLastActive: 60000, overLayRect() {} },
  Date,
  b: { mixColor },
  Y: { defaultcolors: defaults },
  AfkWardenHobbitRemixChatSelect: api,
  Ut: 1,
});
const Alert = vm.runInContext('(' + bundle.slice(alertStart, alertEnd) + '})', alertContext);
const phrases = ['A mimicking soul appears nearby', 'A vengeful soul appears nearby',
  'A lost soul appears nearby', 'An unstable soul appears nearby'];
const alerts = phrases.map(text => {
  const alert = new Alert();
  alert.vars = { resetonactive: false, colors: [], lines: [{ text, percent: 100 }] };
  return alert;
});
let liveReads = 0;
alertContext.Chatbox = { default: class {
  constructor() { this.pos = { mainbox: { leftfound: true, rect: { x: 0, y: 0, width: 100, height: 100 } } }; this.readargs = {}; }
  read() {
    liveReads++;
    assert.ok(this.readargs.colors.includes(mixColor(235, 47, 47)));
    assert.ok(this.readargs.colors.includes(mixColor(30, 255, 0)));
    return liveReads === 1 ? phrases.map(text => ({ text: text + '! More message text.' })) : [];
  }
} };
alertContext.Ct = alerts;
alertContext.ct = { chat: Alert };
const sharedStart = bundle.indexOf('qt=(Jt=');
const sharedEnd = bundle.indexOf(',_t=function', sharedStart);
assert.ok(sharedStart >= 0 && sharedEnd > sharedStart);
vm.runInContext('var Jt,zt,Wt,Xt,Ht,Zt; var ' + bundle.slice(sharedStart, sharedEnd) + ';', alertContext);
for (const alert of alerts) alert.check();
assert.equal(liveReads, 1, 'four alerts must share one OCR read per tick');
assert.ok(alerts.every(alert => alert.triggered), 'all four soul message prefixes must trigger');
for (const alert of alerts) { alert.bar = 0; alert.triggered = false; }
alertContext.Ut++;
for (const alert of alerts) alert.check();
assert.equal(liveReads, 2);
assert.ok(alerts.every(alert => !alert.triggered), 'an empty read must not replay old alerts');

console.log('Chat editor and four-alert regression checks passed.');
