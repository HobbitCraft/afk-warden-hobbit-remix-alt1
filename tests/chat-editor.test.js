const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const sourcePath = path.join(__dirname, "..", "afk-warden-hobbit-remix-chat-select.js");
const source = fs.readFileSync(sourcePath, "utf8");
const bundle = fs.readFileSync(path.join(__dirname, "..", "scripts.bundle.js"), "utf8");
const installMarker = source.indexOf("  if (!install())");
assert.notEqual(installMarker, -1, "chat selector install marker is missing");
assert.match(bundle, /\.discoverEditorColors\(s,c,a\)/);
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
const unusedRoot = { isConnected: false };
assert.equal(api.startEditorLiveRefresh(unusedRoot, () => drawCount++), 17);
for (let tick = 0; tick < 10; tick++) intervalCallback();
assert.equal(clearedTimer, 17);

console.log("Chat editor regression checks passed.");
