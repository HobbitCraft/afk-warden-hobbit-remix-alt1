const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { fontProbe } = require('../tools/vendor-chatbox.cjs');
const probe = new Function('fonts', 'box', 'imgdata', 'imgx', 'imgy', 'ocrcolors', fontProbe);
const fonts = [{ name: 'wrong', lineheight: 14, dy: -2 }, { name: 'right', lineheight: 16, dy: -3 }];
function detect(lines, height = 200) {
  const reader = { font: null, readChatLine: (_box, _data, _x, _y, font, _colors, line) => {
    assert.ok(height - line * font.lineheight + font.dy >= font.lineheight);
    return { text: font.name === 'right' ? lines[line] || '' : '' };
  } };
  probe.call(reader, fonts, { line0y: height }, null, 0, 0, []);
  return reader.font;
}
assert.equal(detect(['', '[21:04:09]']).name, 'right', 'a timestamp must bootstrap unknown colours');
assert.equal(detect(['', '', 'Welcome to RuneScape.']).name, 'right', 'older lines must identify the font');
assert.equal(detect(['A short', 'message']).name, 'right');
assert.equal(detect(['', '', '', '', '', '', '', 'Welcome to RuneScape.']).name, 'right');
assert.equal(detect([]), null, 'empty chat must not invent a font');
assert.equal(detect(['[99:99:99]']), null, 'invalid timestamps must not select a font');
assert.equal(detect([], 20), null, 'small boxes must stay within capture bounds');
const vendor = fs.readFileSync(path.join(__dirname, '..', 'vendor', 'chatbox.js'), 'utf8');
assert.ok(vendor.includes(fontProbe), 'the checked-in reader must contain the tested probe');
assert.match(vendor, /\[255, 204, 0\]/);
console.log('Chat font regression checks passed');
