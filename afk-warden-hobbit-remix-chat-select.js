(function () {
  "use strict";

  const STORAGE_KEY = "afkWardenHobbitRemix.chatIndex";
  const LEGACY_STORAGE_KEY = "afkHobbit.chatIndex";
  const selectorSet = new Set();
  let appliedIndex = null;

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
    const options = optionsFor(pos);
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

    const index = selectedIndex();
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

    let index = selectedIndex();
    if (index >= pos.boxes.length) {
      index = 0;
      localStorage.setItem(STORAGE_KEY, "0");
    }

    const selected = pos.boxes[index];
    if (pos.mainbox !== selected) {
      pos.mainbox = selected;
      if (!trackSharedReader || appliedIndex !== index) resetReadState(reader);
    }

    if (trackSharedReader) appliedIndex = index;
    syncSelectors(pos);
    if (showOverlay) showSelectedBox(selected);
    return true;
  }

  function applyToReader(reader, showOverlay) {
    return applyReaderSelection(reader, showOverlay, false);
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
      appliedIndex = null;
      resetReadState(reader);
    }

    try {
      if (forceRescan && reader.find) reader.find();
      else shared.tryFind();
    } catch (_) {}

    return applySelection(showOverlay);
  }

  function setSelectedIndex(index) {
    const current = selectedIndex();
    localStorage.setItem(STORAGE_KEY, String(index));
    if (index !== current) {
      const shared = sharedReader();
      resetReadState(shared && shared.reader);
      appliedIndex = null;
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
      applySelection(false);
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
    refresh,
    settingsDom,
    setSelectedIndex,
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
