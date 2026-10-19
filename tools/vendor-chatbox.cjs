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

function replaceOnce(source, from, to) {
  assert.equal(source.split(from).length, 2, 'Expected exactly one reader patch: ' + from.slice(0, 80));
  return source.replace(from, to);
}

function patchDetection(source) {
  const labelStart = source.indexOf('            var matched = false;');
  const labelEnd = source.indexOf('            //active chat', labelStart);
  assert.ok(labelStart >= 0 && labelEnd > labelStart);
  source = source.slice(0, labelStart) + `            var matched = false;
            // Prefer full labels; the short private-message prefix is handled separately.
            const labels = Object.keys(chatimgs.raw).filter(chat => chat !== "privateRecent")
                .sort((a, b) => chatimgs.raw[b].width - chatimgs.raw[a].width);
            for (const chat of labels) {
                const label = chatimgs.raw[chat];
                for (const offsetY of [1, 0]) {
                    if (data.pixelCompare(label, 0, offsetY) < Infinity || data.pixelCompare(label, 5, offsetY) < Infinity) {
                        botlefts.push({ x: loc.x, y: loc.y - 1, type: chatmap[chat] });
                        matched = true;
                        break;
                    }
                }
                if (matched) break;
            }
` + source.slice(labelEnd);
  source = replaceOnce(source,
    '            botlefts.push({ x: loc.x, y: loc.y - 1, type: "private" });',
    `            const inputY = loc.y - 1;
            // A "To" match on an identified input row is not another window.
            const existing = botlefts.some(left => Math.abs(left.y - inputY) <= 2 && loc.x >= left.x &&
                loc.x < Math.min(...toprights.filter(right => right.x > left.x && right.y < inputY).map(right => right.x)));
            if (!existing) botlefts.push({ x: loc.x, y: inputY, type: "private" });`);
  source = replaceOnce(source, "        //check if we're in full-on legacy", `        // A changed collapse icon can fail the native per-pixel threshold. Only search
        // the header row of a verified game-filter label and require a unique match.
        for (const marker of [imgs.gameall, imgs.gamefilter, imgs.gameoff].flatMap(label => img.findSubimage(label))) {
            const top = marker.y + 22;
            const input = botlefts.find(left => left.type === "main" && left.x >= marker.x - 10 && left.x < marker.x + 300 && left.y > top);
            if (!input) continue;
            const rightLimit = Math.min(img.width, ...botlefts.filter(left => left !== input &&
                left.x > input.x && Math.abs(left.y - input.y) <= 3).map(left => left.x));
            if (toprights.some(right => Math.abs(right.y - top) <= 3 && right.x > input.x && right.x <= rightLimit)) continue;
            const rowY = Math.max(0, marker.y - 1);
            const rowHeight = Math.min(18, img.height - rowY);
            if (rowHeight < imgs.minusbutton.height) continue;
            const row = img.toData(0, rowY, img.width, rowHeight);
            const matches = [];
            for (let x = marker.x + 60; x <= rightLimit - imgs.minusbutton.width; x++) {
                for (let y = 0; y <= row.height - imgs.minusbutton.height; y++) {
                    const score = row.pixelCompare(imgs.minusbutton, x, y, 150);
                    if (score < 50) matches.push({ x, y: y + rowY, score });
                }
            }
            matches.sort((a, b) => a.score - b.score);
            const best = matches[0];
            const competitor = best && matches.find(match => Math.abs(match.x - best.x) >= imgs.minusbutton.width);
            if (best && (!competitor || competitor.score >= best.score + 8)) {
                toprights.push({ x: best.x + 5, y: best.y + 21, type: "full" });
            }
        }
        //check if we're in full-on legacy`);
  const groupsStart = source.indexOf('        var groups = [];');
  const groupsEnd = source.indexOf('        var mainbox = null;', groupsStart);
  assert.ok(groupsStart >= 0 && groupsEnd > groupsStart);
  source = source.slice(0, groupsStart) + `        const candidates = [];
        for (const right of toprights) {
            for (const left of botlefts) {
                const width = right.x - left.x;
                const height = left.y - right.y;
                if (width < 60 || height < 14) continue;
                candidates.push({ timestamp: false, type: left.type, leftfound: false,
                    topright: right, botleft: left,
                    rect: new a1lib.Rect(left.x, right.y, width, height), line0x: 0, line0y: 0 });
            }
        }
        // Nearby corners belong together; reject reversed and overlapping rectangles.
        candidates.sort((a, b) => a.rect.width * a.rect.height - b.rect.width * b.rect.height);
        const groups = [];
        for (const candidate of candidates) {
            if (groups.some(group => group.topright === candidate.topright || group.botleft === candidate.botleft ||
                group.rect.overlaps(candidate.rect))) continue;
            groups.push(candidate);
        }
        groups.sort((a, b) => Math.abs(a.rect.y - b.rect.y) <= 3 ? a.rect.x - b.rect.x : a.rect.y - b.rect.y);
        for (const group of groups) {
            // Backward OCR must stay on this side of the neighbouring panel's right edge.
            group.captureLeft = Math.max(0, ...groups.filter(other => other !== group &&
                other.rect.x + other.rect.width <= group.rect.x &&
                other.rect.y < group.rect.y + group.rect.height &&
                other.rect.y + other.rect.height > group.rect.y)
                .map(other => other.rect.x + other.rect.width));
        }
` + source.slice(groupsEnd);
  for (const image of ['gameall', 'gamefilter', 'gameoff']) {
    source = replaceOnce(source,
      'img.findSubimage(imgs.' + image + ', Math.max(0, group.rect.x - 300), group.rect.y - 22, 310, 16)',
      'img.findSubimage(imgs.' + image + ', Math.max(group.captureLeft, group.rect.x - 300), group.rect.y - 22, Math.min(group.rect.x + 100, group.rect.x + group.rect.width) - Math.max(group.captureLeft, group.rect.x - 300), 16)');
  }
  source = replaceOnce(source, 'var d = group.rect.x - pos[0].x + 2;',
    'var d = group.rect.x - Math.max(group.captureLeft, pos[0].x - 2);');
  source = replaceOnce(source, '        if (groups.length == 0 || !mainbox) {', `        // All standard input bars start with the same player's name. A verified Main
        // left edge supplies that shared prefix width for adjacent collapsed chats.
        const reference = groups.find(group => group.type === "main" && group.leftfound);
        if (reference) {
            const prefixWidth = reference.botleft.x - reference.rect.x;
            for (const group of groups) {
                if (group.leftfound || group.type === "private" || group.type === "unknown") continue;
                const left = group.botleft.x - prefixWidth;
                if (prefixWidth > 0 && left >= group.captureLeft && left < group.rect.x) {
                    group.rect.width += group.rect.x - left;
                    group.rect.x = left;
                    group.leftfound = true;
                }
            }
        }
        if (groups.length == 0 || !mainbox) {`);
  return replaceOnce(source, 'var leftmargin = (box.leftfound ? 0 : 300);',
    'var leftmargin = box.leftfound ? 0 : Math.min(300, Math.max(0, box.rect.x - (box.captureLeft || 0)));');
}

function patch(source) {
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), upstreamHash,
    'Unexpected upstream chatbox build; review it before updating this patch.');
  assert.equal(source.split(originalProbe).length, 2, 'Font probe must match exactly once');
  return patchDetection(source).replace(originalProbe, fontProbe)
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

module.exports = { patch, fontProbe, patchDetection };
