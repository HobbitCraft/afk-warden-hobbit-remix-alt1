(function () {
  "use strict";

  const STORAGE_KEY = "afkWardenHobbitRemix.chatIndex";
  const LEGACY_STORAGE_KEY = "afkHobbit.chatIndex";
  const WINDOW_KEY = "afkWardenHobbitRemix.chatWindow";
  const selectorSet = new Set();
  const editorReads = new WeakMap();
  const editorSources = new WeakMap();
  const knownWindowTypes = new Map();
  let appliedWindow = null;

  const additionalColors = [
    [130, 70, 184], [0, 174, 0], [45, 184, 20], [67, 188, 188],
    [102, 152, 255], [235, 47, 47], [30, 255, 0], [255, 112, 0], [163, 53, 238],
    [255, 204, 0],
  ];

  const typeNames = {
    main: "Main",
    private: "Private",
    pc: "Private",
    cc: "Clan",
    gcc: "Guest clan",
    fc: "Friends",
    gc: "Group",
    gimc: "Group ironman",
    unknown: "Chat",
  };

  function selectedIndex() {
    let stored = localStorage.getItem(STORAGE_KEY);
    if (stored === null) {
      stored = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (stored !== null) localStorage.setItem(STORAGE_KEY, stored);
    }
    const value = Number.parseInt(stored || "0", 10);
    return Number.isFinite(value) && value >= 0 ? value : 0;
  }

  function sharedReader() {
    return window.AfkScripts && window.AfkScripts.sharedChatboxReader;
  }

  function windowIdentity(box) {
    return { type: box.type, right: box.rect.x + box.rect.width, top: box.rect.y,
      bottom: box.rect.y + box.rect.height };
  }

  function identityKey(box) {
    const id = windowIdentity(box);
    return [id.right, id.top, id.bottom].join(':');
  }

  function normalizeBoxes(pos) {
    const saved = selectedWindow();
    for (const box of pos.boxes) {
      const key = identityKey(box);
      if (box.type === 'unknown' && knownWindowTypes.has(key)) box.type = knownWindowTypes.get(key);
      else if (box.type === 'unknown' && saved && Math.abs(saved.right - windowIdentity(box).right) <= 3 &&
          Math.abs(saved.top - box.rect.y) <= 3 && Math.abs(saved.bottom - windowIdentity(box).bottom) <= 3) box.type = saved.type;
      else if (box.type && box.type !== 'unknown') knownWindowTypes.set(key, box.type);
    }
    pos.boxes.sort((a, b) => Math.abs(a.rect.y - b.rect.y) <= 3 ? a.rect.x - b.rect.x : a.rect.y - b.rect.y);
  }

  function selectedWindow() {
    try {
      const id = JSON.parse(localStorage.getItem(WINDOW_KEY) || 'null');
      return id && typeof id.type === 'string' && [id.right, id.top, id.bottom].every(Number.isFinite) ? id : null;
    } catch (_) { return null; }
  }

  function selectionIndex(pos) {
    const saved = selectedWindow();
    if (!saved) return Math.min(selectedIndex(), pos.boxes.length - 1);
    const exact = pos.boxes.findIndex(box => {
      const id = windowIdentity(box);
      return (box.type === saved.type || box.type === 'unknown' || saved.type === 'unknown') &&
        Math.abs(id.right - saved.right) <= 3 && Math.abs(id.top - saved.top) <= 3 &&
        Math.abs(id.bottom - saved.bottom) <= 3;
    });
    if (exact >= 0) return exact;
    const matching = pos.boxes.filter(box => box.type === saved.type);
    // A moved window can be recovered by type only when the match is unambiguous.
    return matching.length === 1 ? pos.boxes.indexOf(matching[0]) : -1;
  }

  function saveWindow(box, index) {
    const identity = JSON.stringify(windowIdentity(box));
    if (localStorage.getItem(WINDOW_KEY) !== identity) localStorage.setItem(WINDOW_KEY, identity);
    if (localStorage.getItem(STORAGE_KEY) !== String(index)) localStorage.setItem(STORAGE_KEY, String(index));
  }

  function resetReadState(reader) {
    if (!reader) return;
    reader.overlaplines = [];
    reader.lastTimestamp = -1;
    reader.lastTimestampUpdate = 0;
    reader.addedLastread = false;
  }

  function showSelectedBox(box) {
    try {
      const lib = window.a1lib || window.A1lib;
      if (!box || !window.alt1 || !lib) return;
      alt1.overLayRect(
        lib.mixColor(255, 255, 255),
        box.rect.x,
        box.rect.y,
        box.rect.width,
        box.rect.height,
        2000,
        3,
      );
    } catch (_) {
      // Overlay is best-effort; chat selection still applies without it.
    }
  }

  function optionsFor(pos) {
    if (!pos || !Array.isArray(pos.boxes) || pos.boxes.length === 0) {
      return [{ value: "0", text: "Auto" }];
    }

    return pos.boxes.map((box, index) => {
      const type = typeNames[box.type] || box.type || "Chat";
      return { value: String(index), text: `${index + 1} ${type}` };
    });
  }

  function syncSelector(selector, pos) {
    if (pos && Array.isArray(pos.boxes)) normalizeBoxes(pos);
    const options = optionsFor(pos);
    const index = pos && pos.boxes && pos.boxes.length ? selectionIndex(pos) : 0;
    if (index < 0) options.unshift({ value: '-1', text: `${typeNames[selectedWindow().type] || 'Chat'} (not found)` });
    const key = options.map((option) => `${option.value}:${option.text}`).join("|");
    if (selector.dataset.optionsKey !== key) {
      selector.replaceChildren();
      for (const option of options) {
        const element = document.createElement("option");
        element.value = option.value;
        element.textContent = option.text;
        selector.appendChild(element);
      }
      selector.dataset.optionsKey = key;
    }

    selector.value = options.some((option) => option.value === String(index)) ? String(index) : "0";
  }

  function syncSelectors(pos) {
    for (const selector of selectorSet) {
      if (selector.isConnected) syncSelector(selector, pos);
      else selectorSet.delete(selector);
    }
  }

  function applyReaderSelection(reader, showOverlay, trackSharedReader) {
    const pos = reader && reader.pos;
    if (!pos || !Array.isArray(pos.boxes) || pos.boxes.length === 0) {
      syncSelectors(pos);
      return false;
    }

    normalizeBoxes(pos);
    const index = selectionIndex(pos);
    if (index < 0) { syncSelectors(pos); return false; }

    const selected = pos.boxes[index];
    const key = identityKey(selected);
    if (pos.mainbox !== selected || (trackSharedReader && appliedWindow !== key)) {
      pos.mainbox = selected;
      reader.font = null;
      editorReads.delete(reader);
      resetReadState(reader);
      if (trackSharedReader && sharedReader().invalidate) sharedReader().invalidate();
    }

    if (trackSharedReader) { appliedWindow = key; saveWindow(selected, index); }
    syncSelectors(pos);
    if (showOverlay) showSelectedBox(selected);
    return true;
  }

  function applyToReader(reader, showOverlay) {
    return applyReaderSelection(reader, showOverlay, false);
  }

  function chatReadColors(colors, defaults) {
    const lib = window.a1lib || window.A1lib;
    const palette = (window.Chatbox && window.Chatbox.defaultcolors) || defaults || [];
    return Array.from(new Set(palette.concat(additionalColors, colors).map((c) => lib.mixColor(...c))));
  }

  function prepareEditorReader(reader, image) {
    const shared = sharedReader();
    if (shared && shared.reader !== reader) {
      if (!shared.reader.pos) {
        if (image && shared.reader.find) shared.reader.find(image);
        else shared.tryFind();
      }
      if (!applySelection(false)) return false;
      const source = shared.reader.pos;
      const box = source.mainbox;
      const key = JSON.stringify([box.type, box.rect, box.leftfound, box.captureLeft, box.line0x, box.line0y]);
      if (editorSources.get(reader) !== key) {
        // Share window detection, but never share mutable OCR or overlap state.
        const boxes = source.boxes.map(item => ({ ...item, rect: { ...item.rect } }));
        reader.pos = { boxes, mainbox: boxes[source.boxes.indexOf(box)] };
        reader.font = null;
        resetReadState(reader);
        editorReads.delete(reader);
        editorSources.set(reader, key);
      }
    } else {
      if (!reader.pos && reader.find) reader.find(image);
      if (!reader.pos || (Array.isArray(reader.pos.boxes) && !applyToReader(reader, false))) return false;
    }
    reader.diffRead = false;
    return true;
  }

  function readEditor(reader, image, colors, extraColors, defaults) {
    if (!prepareEditorReader(reader, image)) return [];
    const lib = window.a1lib || window.A1lib;
    const box = reader.pos.mainbox;
    const margin = box.leftfound ? 0 : Math.min(300, Math.max(0, box.rect.x - (box.captureLeft || 0)));
    const x = box.rect.x - margin;
    const y = box.rect.y;
    const width = box.rect.width + margin;
    const height = box.rect.height;
    const data = image ? image.toData(x, y, width, height) : lib.capture(x, y, width, height);
    const palette = chatReadColors(colors.concat(extraColors || []), defaults);
    const key = [x, y, width, height, box.line0x, box.line0y, !!extraColors, ...palette].join(',');
    const previous = editorReads.get(reader);
    // Reuse OCR only when both the captured pixels and reader settings are unchanged.
    if (previous && previous.key === key && previous.data.length === data.data.length &&
        previous.data.every((value, index) => value === data.data[index])) return previous.lines;

    reader.readargs = { colors: palette };
    const lines = reader.read(new lib.ImgRefData(data, x, y)) || [];
    editorReads.set(reader, { key, data: data.data.slice(), lines });
    // New colours are used on the next refresh, without another OCR pass in this one.
    if (extraColors) discoverEditorColors(reader, lines, extraColors);
    return lines;
  }

  function discoverEditorColors(reader, lines, extraColors) {
    const box = reader && reader.pos && reader.pos.mainbox;
    const buffer = reader && reader.lastReadBuffer;
    const getFontColor = reader && reader.constructor && reader.constructor.getFontColor;
    const lib = window.a1lib || window.A1lib;
    if (!box || !buffer || !Array.isArray(lines) || !lib || extraColors.length >= 16) return false;

    const existing = new Set(reader.readargs.colors);
    const existingRgb = lib.unmixColor
      ? Array.from(existing, (color) => lib.unmixColor(color))
      : [];
    let added = false;
    let count = 0;
    for (const line of lines) {
      if (extraColors.length >= 16 || count >= 4) break;
      const fragments = line.fragments || [];
      const lastFragment = fragments[fragments.length - 1];
      const startX = lastFragment ? lastFragment.xend : box.rect.x + box.line0x;
      const availableWidth = box.rect.x + box.rect.width - startX;
      if (availableWidth < 3) continue;

      try {
        const sample = buffer.toData(startX, line.basey - 8, Math.min(48, availableWidth), 10);
        let color = null;
        let bestScore = 32000;
        if (sample.data) {
          for (let x = 0; x < sample.width - 1; x++) {
            for (let y = 0; y < sample.height - 1; y++) {
              const offset = 4 * x + 4 * sample.width * y;
              const diagonal = offset + 4 + 4 * sample.width;
              const candidate = [
                sample.data[offset],
                sample.data[offset + 1],
                sample.data[offset + 2],
              ];
              const mixed = lib.mixColor(candidate[0], candidate[1], candidate[2]);
              if (existing.has(mixed) || Math.max(...candidate) < 64) continue;
              if (
                existingRgb.some(
                  (known) =>
                    (Math.abs(candidate[0] - known[0]) <= 18 &&
                      Math.abs(candidate[1] - known[1]) <= 18 &&
                      Math.abs(candidate[2] - known[2]) <= 18) ||
                    (Math.max(...candidate) - Math.min(...candidate) <= 6 &&
                      Math.max(...known) - Math.min(...known) <= 6),
                )
              ) {
                continue;
              }

              const brightness = candidate[0] + candidate[1] + candidate[2];
              const diagonalBrightness =
                sample.data[diagonal] + sample.data[diagonal + 1] + sample.data[diagonal + 2];
              const score = Math.min(255, 275 - diagonalBrightness) * brightness;
              if (score > bestScore) {
                bestScore = score;
                color = candidate;
              }
            }
          }
        } else if (getFontColor) {
          color = getFontColor(sample, 0, 0, sample.width, sample.height);
        }
        if (!color) continue;
        const mixed = lib.mixColor(color[0], color[1], color[2]);
        extraColors.push([color[0], color[1], color[2]]);
        existing.add(mixed);
        existingRgb.push(color);
        added = true;
        count++;
      } catch (_) {}
    }
    return added;
  }

  function editorShouldStickToBottom(container) {
    if (!container.__hobbitChatRendered) return true;
    return container.scrollHeight - container.clientHeight - container.scrollTop <= 8;
  }

  function editorFinishRender(container, stickToBottom) {
    container.__hobbitChatRendered = true;
    if (stickToBottom) container.scrollTop = container.scrollHeight;
  }

  function startEditorLiveRefresh(root, draw) {
    let wasConnected = false;
    let disconnectedTicks = 0;
    const timer = setInterval(() => {
      const view = root.ownerDocument && root.ownerDocument.defaultView;
      if (view && view.closed) {
        clearInterval(timer);
        return;
      }
      if (root.isConnected) {
        wasConnected = true;
        disconnectedTicks = 0;
        const selection = view && view.getSelection();
        if (!selection || selection.isCollapsed) draw();
      } else if (wasConnected || ++disconnectedTicks >= 10) {
        clearInterval(timer);
      }
    }, 1000);
    return timer;
  }

  function applySelection(showOverlay) {
    const shared = sharedReader();
    return applyReaderSelection(shared && shared.reader, showOverlay, true);
  }

  function refresh(forceRescan, showOverlay) {
    const shared = sharedReader();
    const reader = shared && shared.reader;
    if (!shared || !reader) return false;

    if (forceRescan) {
      reader.pos = null;
      appliedWindow = null;
      resetReadState(reader);
    }

    try {
      if (forceRescan && reader.find) reader.find();
      else shared.tryFind();
    } catch (_) {}

    return applySelection(showOverlay);
  }

  function setSelectedIndex(index) {
    if (index < 0) return;
    const current = selectedIndex();
    const currentReader = sharedReader();
    const pos = currentReader && currentReader.reader && currentReader.reader.pos;
    if (pos && pos.boxes) normalizeBoxes(pos);
    if (pos && pos.boxes[index]) saveWindow(pos.boxes[index], index);
    else localStorage.setItem(WINDOW_KEY, '');
    localStorage.setItem(STORAGE_KEY, String(index));
    if (index !== current) {
      const shared = sharedReader();
      resetReadState(shared && shared.reader);
      appliedWindow = null;
    }
    if (!applySelection(true)) refresh(true, true);
  }

  function makeSelector(className) {
    const selector = document.createElement("select");
    selector.className = className;
    selector.title = "Chat used for chat alerts";
    selector.addEventListener("change", () => {
      setSelectedIndex(Number.parseInt(selector.value || "0", 10) || 0);
    });
    selector.addEventListener("focus", () => refresh(false, true));
    selector.addEventListener("mousedown", () => refresh(false, false));
    selectorSet.add(selector);
    syncSelector(selector, sharedReader() && sharedReader().reader && sharedReader().reader.pos);
    return selector;
  }

  function installToolbarSelector() {
    if (document.getElementById("afk-warden-hobbit-remix-chat-select")) return;

    const settingsButton = document.getElementById("settingsbutton");
    const row = settingsButton && settingsButton.parentElement;
    if (!row) return;

    const selector = makeSelector("afk-warden-hobbit-remix-chat-select");
    selector.id = "afk-warden-hobbit-remix-chat-select";
    row.insertBefore(selector, settingsButton.nextSibling);
  }

  function settingsDom() {
    const wrap = document.createElement("div");
    wrap.className = "afk-warden-hobbit-remix-chat-setting";

    const selector = makeSelector("afk-warden-hobbit-remix-chat-select afk-warden-hobbit-remix-chat-select-settings");
    const scan = document.createElement("input");
    scan.type = "button";
    scan.value = "Scan";
    scan.className = "pb2-button";
    scan.title = "Find chat boxes";
    scan.addEventListener("click", () => refresh(true, true));

    wrap.appendChild(selector);
    wrap.appendChild(scan);
    setTimeout(() => refresh(true, true), 1);
    return wrap;
  }

  function installStyles() {
    if (document.getElementById("afk-warden-hobbit-remix-chat-select-style")) return;
    const style = document.createElement("style");
    style.id = "afk-warden-hobbit-remix-chat-select-style";
    style.textContent = [
      ".afk-warden-hobbit-remix-chat-select{height:20px;max-width:92px;margin:1px 3px;background:#10202a;color:#d9f0ff;border:1px solid rgba(255,255,255,.35);font-size:11px;}",
      ".afk-warden-hobbit-remix-chat-setting{display:flex;gap:4px;align-items:center;margin:2px 5px 6px;}",
      ".afk-warden-hobbit-remix-chat-select-settings{max-width:160px;flex:1;margin:0;}",
    ].join("");
    document.head.appendChild(style);
  }

  function patchSharedReader() {
    const shared = sharedReader();
    if (!shared || shared.__hobbitChatSelectPatched) return false;

    const originalTryFind = shared.tryFind.bind(shared);
    const originalRead = shared.read.bind(shared);

    shared.tryFind = function () {
      const result = originalTryFind.apply(this, arguments);
      applySelection(false);
      return result;
    };

    shared.read = function () {
      if (!applySelection(false)) return [];
      const result = originalRead.apply(this, arguments);
      applySelection(false);
      return result;
    };

    shared.__hobbitChatSelectPatched = true;
    return true;
  }

  function install() {
    if (!window.AfkScripts) return false;
    patchSharedReader();
    installStyles();
    installToolbarSelector();
    return true;
  }

  const chatSelectApi = {
    applySelection,
    applyToReader,
    chatReadColors,
    discoverEditorColors,
    editorFinishRender,
    editorShouldStickToBottom,
    refresh,
    readEditor,
    prepareEditorReader,
    settingsDom,
    setSelectedIndex,
    normalizeBoxes,
    selectionIndex,
    startEditorLiveRefresh,
  };
  window.AfkWardenHobbitRemixChatSelect = chatSelectApi;
  window.AfkHobbitChatSelect = chatSelectApi;

  if (!install()) {
    const timer = setInterval(() => {
      if (install()) clearInterval(timer);
    }, 100);
  }

  document.addEventListener("DOMContentLoaded", install);
  window.addEventListener("load", () => {
    install();
    refresh(false, false);
  });
})();
