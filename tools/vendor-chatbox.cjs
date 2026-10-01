const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const upstreamUrl = 'https://www.unpkg.com/alt1@0.1.3/dist/chatbox/index.js';
const upstreamHash = '36d6aa0bf1e852bcc4a00485f8473faa75343bae092ced75258b64520d78bb7c';
const originalProbe = `        if (!this.font) {
            for (let font of fonts) {
                let line1 = this.readChatLine(box, imgdata, imgx, imgy, font, ocrcolors, 0);
                let line2 = this.readChatLine(box, imgdata, imgx, imgy, font, ocrcolors, 1);
                let m = (line1.text + line2.text).match(/\\w/g);
                if (m && m.length > 10) {
                    this.font = font;
                    break;
                }
            }
        }`;

const fontProbe = `        if (!this.font) {
            // Prefer the original two-line probe, then inspect up to eight visible lines.
            // A complete timestamp also identifies the font when the message colour is unknown.
            for (const limit of [2, 8]) {
                for (const font of fonts) {
                    let letters = 0;
                    for (let line = limit === 2 ? 0 : 2; line < limit; line++) {
                        if (box.line0y - line * font.lineheight + font.dy < font.lineheight) break;
                        const text = this.readChatLine(box, imgdata, imgx, imgy, font, ocrcolors, line).text;
                        letters += (text.match(/\\w/g) || []).length;
                        if (letters > 10 || /^\\[(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d\\]/.test(text)) {
                            this.font = font;
                            break;
                        }
                    }
                    if (this.font) break;
                }
                if (this.font) break;
            }
        }`;

function patch(source) {
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), upstreamHash,
    'Unexpected upstream chatbox build; review it before updating this patch.');
  assert.equal(source.split(originalProbe).length, 2, 'Font probe must match exactly once');
  return source.replace(originalProbe, fontProbe)
    .replace('console.log("found box left because of chat contents", ctx.text);', '')
    .replace('exports.defaultcolors = [',
    'exports.defaultcolors = [\n    [255, 204, 0], //gold game messages\n    [235, 47, 47], //red soul events\n    [30, 255, 0], //green soul events');
}

if (require.main === module) (async () => {
  const response = process.argv[2] ? null : await fetch(upstreamUrl);
  if (response && !response.ok) throw new Error('Download failed: ' + response.status);
  const source = process.argv[2] ? fs.readFileSync(process.argv[2], 'utf8') : await response.text();
  const output = path.join(__dirname, '..', 'vendor', 'chatbox.js');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, patch(source));
  console.log('Built vendor/chatbox.js from verified alt1 0.1.3');
})().catch(error => { console.error(error); process.exitCode = 1; });

module.exports = { patch, fontProbe };
