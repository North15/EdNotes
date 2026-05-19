(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('katex')) :
  typeof define === 'function' && define.amd ? define(['exports', 'katex'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.EdNotesRichText = {}, global.katex));
})(this, (function (exports, katex) { 'use strict';

  // Core schema definition (V1) – no media, strict allowlist.
  const ALLOWED_BLOCKS = new Set(['p','h1','h2','h3','ul','ol','li','blockquote','pre','code','hr','table','thead','tbody','tr','th','td','span']);
  const ALLOWED_MARKS = new Set(['strong','em','u','a']);
  const ALLOWED_ATTRS = new Set(['href','target','rel','colspan','rowspan','data-list','data-checked','class']);
  const LINK_PROTOCOL_ALLOW = /^(https?:|mailto:|tel:)/i;

  function isAllowedTag(tag){ tag = tag.toLowerCase(); return ALLOWED_BLOCKS.has(tag) || ALLOWED_MARKS.has(tag); }

  function enforceLinkPolicy(a){
    if(!a.getAttribute('href')) return;
    let href = a.getAttribute('href');
    // Trim leading/trailing whitespace
    const originalHref = href;
    href = href.trim();
    // Decode once to catch simple encoded javascript: patterns
    try { href = decodeURIComponent(href); } catch(_) { /* ignore decode issues */ }
    // Explicitly block javascript: (any casing) after trimming/decoding
    if(/^javascript:/i.test(href)) { 
      a.removeAttribute('href'); 
      a.setAttribute('target','_blank');
      a.setAttribute('rel','noopener noreferrer');
      return; 
    }
    if(!LINK_PROTOCOL_ALLOW.test(href)) { 
      a.removeAttribute('href'); 
      a.setAttribute('target','_blank');
      a.setAttribute('rel','noopener noreferrer');
      return; 
    }
    if(href !== originalHref) a.setAttribute('href', href);
    a.setAttribute('target','_blank');
    a.setAttribute('rel','noopener noreferrer');
  }

  function normalize(root){
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, null);
    const toRemove = [];
    while(walker.nextNode()){
      const el = walker.currentNode;
      const tag = el.tagName.toLowerCase();
    if(tag === 'script' || tag === 'iframe') { toRemove.push(el); continue; }
    // Remove any embedded script/iframe children early
    el.querySelectorAll && el.querySelectorAll('script,iframe').forEach(child=> child.remove());
      if(!isAllowedTag(tag)){
        if(el.childNodes.length){
          while(el.firstChild) el.parentNode.insertBefore(el.firstChild, el);
        }
        toRemove.push(el);
        continue;
      }
      // Strip disallowed attributes (including style)
      for(const attr of Array.from(el.attributes)){
        const name = attr.name.toLowerCase();
        if(name === 'style' || !ALLOWED_ATTRS.has(name)) el.removeAttribute(attr.name);
      }
      if(el.getAttribute && el.getAttribute('style')) el.removeAttribute('style');
      if(/h[1-6]/.test(tag) && el.getAttribute && el.getAttribute('style')) el.removeAttribute('style');
      if(tag === 'a') enforceLinkPolicy(el);
      if(tag === 'ul' && el.getAttribute('data-list') === 'task'){
        el.querySelectorAll('li').forEach(li=>{ if(!li.hasAttribute('data-checked')) li.setAttribute('data-checked','false'); });
      }
      if(tag === 'span' && el.classList.contains('math')){
        // Allow math spans but sanitize content
        el.textContent = el.textContent.replace(/[<>&]/g, ''); // Basic sanitization
      }
      if(tag === 'table'){
        // Ensure structure: table>thead?+tbody? allowed; move stray tr into tbody
        const rows=[...el.children].filter(c=> c.tagName && c.tagName.toLowerCase()==='tr');
        if(rows.length){
          let tbody=el.querySelector('tbody'); if(!tbody){ tbody=document.createElement('tbody'); el.appendChild(tbody); }
          rows.forEach(r=> tbody.appendChild(r));
        }
        // Remove disallowed descendants
        [...el.querySelectorAll('*')].forEach(child=>{
          const ct = child.tagName.toLowerCase();
          if(!['table','thead','tbody','tr','th','td'].includes(ct)) child.remove();
        });
      }
    }
    toRemove.forEach(n=> n.remove());
    // Final sweep: remove any lingering style attributes
    root.querySelectorAll && root.querySelectorAll('[style]').forEach(el=> el.removeAttribute('style'));
  }

  // Lightweight selection bookmark utilities.
  function captureBookmark(root){
    const sel = document.getSelection();
    if(!sel || sel.rangeCount===0) return null;
    const range = sel.getRangeAt(0);
    return { anchor: pathTo(root, range.startContainer, range.startOffset), focus: pathTo(root, range.endContainer, range.endOffset) };
  }

  function restoreBookmark(root, bookmark){
    if(!bookmark) return;
    const sel = document.getSelection(); if(!sel) return;
    const range = document.createRange();
    const anchor = nodeFromPath(root, bookmark.anchor); const focus = nodeFromPath(root, bookmark.focus);
    if(!anchor || !focus) return;
    range.setStart(anchor.node, Math.min(bookmark.anchor.offset, anchor.nodeLength));
    range.setEnd(focus.node, Math.min(bookmark.focus.offset, focus.nodeLength));
    sel.removeAllRanges(); sel.addRange(range);
  }

  function pathTo(root, node, offset){
    const path=[]; let n=node;
    while(n && n!==root){ const parent=n.parentNode; if(!parent) break; const idx=Array.prototype.indexOf.call(parent.childNodes,n); path.push(idx); n=parent; }
    return { indexes:path, offset }; // indexes from leaf up
  }
  function nodeFromPath(root, info){ if(!info) return null; let node=root; const rev=[...info.indexes]; while(rev.length){ const idx=rev.shift(); node = node.childNodes[idx]; if(!node) return null; } const TEXT = (typeof Node!=='undefined' && Node.TEXT_NODE) ? Node.TEXT_NODE : 3; return { node, nodeLength: node.nodeType===TEXT ? node.textContent.length : node.childNodes.length }; }

  const defaultSetInterval = (...args) => globalThis.setInterval(...args);
  const defaultClearInterval = (...args) => globalThis.clearInterval(...args);

  function selectionBelongsTo(root, selection = document.getSelection()) {
    return !!(
      selection &&
      selection.rangeCount > 0 &&
      root.contains(selection.anchorNode) &&
      root.contains(selection.focusNode)
    );
  }

  class CommandBus {
    constructor(editor) {
      this.editor = editor;
      this._registry = new Map();
    }
    register(name, fn) {
      this._registry.set(name, fn);
    }
    exec(name, opts = {}, meta = {}) {
      const cmd = this._registry.get(name);
      if (!cmd) return false;
      const commandArgs = opts || {};
      const pushHistory = meta.pushHistory ?? name !== "noop";
      this.editor._transaction((ed) => cmd(ed, commandArgs), { pushHistory });
      const announce = meta.announce ?? name !== "noop";
      if (announce && this.editor._live) {
        const friendly = name
          .replace("strong", "bold")
          .replace("em", "italic")
          .replace("u", "underline")
          .replace("block:", "heading ")
          .replace("list:", "list ")
          .replace("link:", "link ");
        this.editor._live.textContent = `Applied ${friendly}`;
      }
      // Fire custom event so toolbar can refresh aria-pressed state immediately
      try {
        let ev;
        if (typeof CustomEvent === "function")
          ev = new CustomEvent("rtx-command", {
            bubbles: true,
            detail: { name },
          });
        else {
          ev = document.createEvent("CustomEvent");
          ev.initCustomEvent("rtx-command", true, false, { name });
        }
        this.editor.content.dispatchEvent(ev);
      } catch (_) {
        /* non-fatal in headless */
      }
      return true;
    }
  }

  function markCommand(tag) {
    return (editor) => {
      // Prefer native execCommand when available (real browsers) for rich behavior (range merging, etc.)
      const mapping = { strong: "bold", em: "italic", u: "underline" };
      if (typeof document.execCommand === "function" && mapping[tag]) {
        try {
          document.execCommand(mapping[tag]);
          return;
        } catch (_) {
          /* fall back */
        }
      }
      // Fallback implementation (jsdom / non-rich environments): simple wrap / unwrap
      const sel = document.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
      const range = sel.getRangeAt(0);
      let startNode = range.startContainer;
      while (startNode && startNode.nodeType === 3)
        startNode = startNode.parentNode;
      let endNode = range.endContainer;
      while (endNode && endNode.nodeType === 3) endNode = endNode.parentNode;
      if (
        startNode === endNode &&
        startNode &&
        startNode.tagName &&
        startNode.tagName.toLowerCase() === tag
      ) {
        // Toggle off: unwrap
        const el = startNode;
        const frag = document.createDocumentFragment();
        while (el.firstChild) frag.appendChild(el.firstChild);
        el.parentNode.replaceChild(frag, el);
        return;
      }
      const wrapper = document.createElement(tag);
      wrapper.appendChild(range.extractContents());
      range.insertNode(wrapper);
      // Reselect new contents
      sel.removeAllRanges();
      const nr = document.createRange();
      nr.selectNodeContents(wrapper);
      sel.addRange(nr);
    };
  }

  class EditorCore {
    constructor(textarea, options) {
      this.textarea = textarea;
      this.options = options || {};
      this.root = this._build();
      this.content = this.root.querySelector(".rtx-content");
      this.bus = new CommandBus(this);
      // Ensure noop command exists for tests / internal refresh triggers
      this.bus.register("noop", () => {});
      this.history = {
        stack: [],
        index: -1,
        batching: false,
        lastTypeTs: 0,
        limit: this.options.historyLimit || 100,
      };
      this._selectionBookmark = null;
      this._slashCommands = Array.isArray(this.options.slashCommands)
        ? this.options.slashCommands
        : [];
      this._slashState = {
        open: false,
        query: "",
        items: [],
        selectedIndex: 0,
      };
      this._handlers = {};
      this._setInterval = this.options._setInterval || defaultSetInterval;
      this._clearInterval = this.options._clearInterval || defaultClearInterval;
      if (this.options.autosaveIntervalMs) {
        this._autosaveTimer = this._setInterval(() => {
          const val = this.serialize();
          if (this._lastAutosaveValue !== val) {
            this._lastAutosaveValue = val;
            if (typeof this.options.onAutosave === "function")
              this.options.onAutosave(val);
          }
        }, this.options.autosaveIntervalMs);
      }
      this._wire();
    }
    _build() {
      const w = document.createElement("div");
      w.className = "rtx-editor";
      const tb = document.createElement("div");
      tb.className = "rtx-toolbar";
      tb.setAttribute("role", "toolbar");
      tb.setAttribute("aria-label", "Formatting toolbar");
      const c = document.createElement("div");
      c.className = "rtx-content";
      c.contentEditable = "true";
      c.setAttribute("role", "textbox");
      c.setAttribute("aria-multiline", "true");
      const slashMenu = document.createElement("div");
      slashMenu.className = "rtx-slash-menu";
      slashMenu.hidden = true;
      slashMenu.setAttribute("role", "listbox");
      slashMenu.setAttribute("aria-label", "Slash commands");
      const live = document.createElement("div");
      live.className = "rtx-live";
      live.setAttribute("aria-live", "polite");
      live.style.position = "absolute";
      live.style.left = "-9999px";
      live.style.height = "1px";
      live.style.overflow = "hidden";
      w.appendChild(tb);
      w.appendChild(c);
      w.appendChild(slashMenu);
      w.appendChild(live);
      this._slashMenu = slashMenu;
      this._live = live;
      this.textarea.style.display = "none";
      this.textarea.parentNode.insertBefore(w, this.textarea.nextSibling);
      return w;
    }
    _wire() {
      // Input (typing) -> transactional with batching
      this._handlers.input = () => {
        const now = performance.now();
        const gap = now - this.history.lastTypeTs;
        const shouldNewEntry = gap > 600; // simple idle threshold
        this._transaction(() => {}, { pushHistory: shouldNewEntry });
        this.history.lastTypeTs = now;
        this._rememberSelection();
        this._updateSlashMenu();
      };
      this.content.addEventListener("input", this._handlers.input);
      // Paste pipeline
      this._handlers.paste = (e) => {
        e.preventDefault();
        const html = e.clipboardData && e.clipboardData.getData("text/html");
        const text = e.clipboardData && e.clipboardData.getData("text/plain");
        this._transaction(
          () => {
            if (html) {
              const frag = document.createElement("div");
              frag.innerHTML = html;
              normalize(frag); // clean before insert
              this._insertFragmentAtSelection(frag);
            } else if (text) {
              document.execCommand("insertText", false, text);
            }
          },
          { pushHistory: true }
        );
        this._closeSlashMenu();
      };
      this.content.addEventListener("paste", this._handlers.paste);
      this._handlers.focus = () => {
        this._rememberSelection();
        this._updateSlashMenu();
      };
      this.content.addEventListener("focus", this._handlers.focus);
      this._handlers.selectionchange = () => {
        this._rememberSelection();
        this._updateSlashMenu();
      };
      document.addEventListener("selectionchange", this._handlers.selectionchange);
      // Keyboard shortcuts
      this._handlers.keydown = (e) => {
        if (this._handleSlashMenuKeydown(e)) {
          return;
        }

        const mod = e.metaKey || e.ctrlKey;
        const key = e.key.toLowerCase();

        // Task list toggle with Enter or Space
        if ((key === "enter" || key === " ") && !mod) {
          const sel = document.getSelection();
          if (sel.rangeCount > 0) {
            let node = sel.anchorNode;
            while (node && node !== this.content) {
              if (node.nodeType === 1 && node.tagName.toLowerCase() === "li") {
                const ul = node.parentNode;
                if (
                  ul &&
                  ul.tagName.toLowerCase() === "ul" &&
                  ul.getAttribute("data-list") === "task"
                ) {
                  e.preventDefault();
                  const current =
                    node.getAttribute("data-checked") === "true"
                      ? "true"
                      : "false";
                  const next = current === "true" ? "false" : "true";
                  node.setAttribute("data-checked", next);
                  this._pushHistory();
                  return;
                }
              }
              node = node.parentNode;
            }
          }
        }

        if (mod && key === "z") {
          // undo / redo
          e.preventDefault();
          if (e.shiftKey) this.redo();
          else this.undo();
          return;
        }
        if (mod && (key === "b" || key === "i" || key === "u")) {
          // formatting
          e.preventDefault();
          const map = { b: "strong", i: "em", u: "u" };
          this.bus.exec(map[key]);
          return;
        }
        if (mod && e.altKey && ["0", "1", "2", "3"].includes(e.key)) {
          e.preventDefault();
          const hMap = { 0: "p", 1: "h1", 2: "h2", 3: "h3" };
          this.bus.exec("block:" + hMap[e.key]);
          return;
        }
        if (key === "tab") {
          if (this._maybeHandleListIndent(e)) return; // prevent default inside handler
        }
      };
      this.content.addEventListener("keydown", this._handlers.keydown);
      this.content.innerHTML = this.textarea.value || "<p></p>";
      normalize(this.content);
      this.textarea.value = this.serialize();
      this._rememberSelection();
      this._pushHistory();
    }
    _rememberSelection() {
      if (!selectionBelongsTo(this.content)) return;
      const bookmark = captureBookmark(this.content);
      if (bookmark) {
        this._selectionBookmark = bookmark;
      }
    }
    _restoreSavedSelection() {
      if (!this._selectionBookmark) return false;
      restoreBookmark(this.content, this._selectionBookmark);
      return true;
    }
    _getSlashQueryContext() {
      if (!this._slashCommands.length) return null;
      const selection = document.getSelection();
      if (!selectionBelongsTo(this.content, selection) || !selection.isCollapsed) {
        return null;
      }

      const range = selection.getRangeAt(0);
      let node = range.startContainer;
      let offset = range.startOffset;

      if (node.nodeType !== 3) {
        if (offset === 0) return null;
        const previousNode = node.childNodes[offset - 1];
        if (!previousNode || previousNode.nodeType !== 3) return null;
        node = previousNode;
        offset = previousNode.textContent.length;
      }

      const textBefore = node.textContent.slice(0, offset);
      const slashIndex = textBefore.lastIndexOf("/");
      if (slashIndex < 0) return null;

      const beforeSlash = textBefore[slashIndex - 1];
      if (beforeSlash && !/\s/.test(beforeSlash)) return null;

      const query = textBefore.slice(slashIndex + 1);
      if (/\s/.test(query)) return null;

      const triggerRange = document.createRange();
      triggerRange.setStart(node, slashIndex);
      triggerRange.setEnd(node, offset);

      return {
        query: query.toLowerCase(),
        range: triggerRange,
      };
    }
    _getMatchingSlashCommands(query) {
      if (!query) return this._slashCommands.slice(0, 8);

      return this._slashCommands
        .filter((item) => {
          const haystack = [item.label, item.name]
            .concat(item.keywords || [])
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return haystack.includes(query);
        })
        .slice(0, 8);
    }
    _updateSlashMenu() {
      if (!this._slashCommands.length || !this._slashMenu) return;

      const context = this._getSlashQueryContext();
      if (!context) {
        this._closeSlashMenu();
        return;
      }

      const items = this._getMatchingSlashCommands(context.query);
      if (!items.length) {
        this._closeSlashMenu();
        return;
      }

      const queryChanged = this._slashState.query !== context.query;
      this._slashState.open = true;
      this._slashState.query = context.query;
      this._slashState.items = items;
      if (queryChanged) {
        this._slashState.selectedIndex = 0;
      } else {
        this._slashState.selectedIndex = Math.min(
          this._slashState.selectedIndex,
          items.length - 1
        );
      }

      this._renderSlashMenu(context.range);
    }
    _renderSlashMenu(range) {
      this._slashMenu.innerHTML = "";
      this._slashState.items.forEach((item, index) => {
        const button = document.createElement("button");
        const icon = document.createElement("span");
        const label = document.createElement("span");
        button.type = "button";
        button.className = "rtx-slash-item";
        button.setAttribute("role", "option");
        button.setAttribute(
          "aria-selected",
          index === this._slashState.selectedIndex ? "true" : "false"
        );
        if (index === this._slashState.selectedIndex) {
          button.classList.add("is-selected");
        }
        icon.className = "rtx-slash-item-icon";
        icon.textContent = item.text || "/";
        label.className = "rtx-slash-item-label";
        label.textContent = item.label;
        button.appendChild(icon);
        button.appendChild(label);
        button.addEventListener("mousedown", (event) => {
          event.preventDefault();
        });
        button.addEventListener("click", () => {
          this._executeSlashCommand(item);
        });
        this._slashMenu.appendChild(button);
      });

      const rootRect = this.root.getBoundingClientRect();
      const rangeRect =
        typeof range.getBoundingClientRect === "function"
          ? range.getBoundingClientRect()
          : {
              left: rootRect.left + 12,
              bottom: rootRect.top + this.content.offsetTop + 12,
            };
      const fallbackTop = this.content.offsetTop + 16;
      const left = Math.max(
        12,
        Math.round((rangeRect.left || rootRect.left) - rootRect.left)
      );
      const top = Math.max(
        fallbackTop,
        Math.round((rangeRect.bottom || rootRect.top) - rootRect.top + 12)
      );

      this._slashMenu.style.left = `${left}px`;
      this._slashMenu.style.top = `${top}px`;
      this._slashMenu.hidden = false;
    }
    _closeSlashMenu() {
      if (!this._slashMenu) return;
      this._slashState.open = false;
      this._slashState.query = "";
      this._slashState.items = [];
      this._slashState.selectedIndex = 0;
      this._slashMenu.hidden = true;
      this._slashMenu.innerHTML = "";
    }
    _moveSlashSelection(step) {
      if (!this._slashState.items.length) return;
      const lastIndex = this._slashState.items.length - 1;
      const nextIndex =
        this._slashState.selectedIndex + step > lastIndex
          ? 0
          : this._slashState.selectedIndex + step < 0
          ? lastIndex
          : this._slashState.selectedIndex + step;
      this._slashState.selectedIndex = nextIndex;
      const context = this._getSlashQueryContext();
      if (context) {
        this._renderSlashMenu(context.range);
      }
    }
    _executeSlashCommand(item) {
      if (!item) return;
      this._restoreSavedSelection();
      const context = this._getSlashQueryContext();
      if (!context) {
        this._closeSlashMenu();
        return;
      }

      context.range.deleteContents();
      const selection = document.getSelection();
      selection.removeAllRanges();
      selection.addRange(context.range);
      this._rememberSelection();
      this._closeSlashMenu();

      if (item.command) {
        this.bus.exec(item.command);
        return;
      }
      if (item.action === "undo") {
        this.undo();
        return;
      }
      if (item.action === "redo") {
        this.redo();
        return;
      }
      if (typeof item.run === "function") {
        item.run(this);
      }
    }
    _handleSlashMenuKeydown(e) {
      if (!this._slashState.open) return false;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        this._moveSlashSelection(1);
        return true;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        this._moveSlashSelection(-1);
        return true;
      }

      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        this._executeSlashCommand(
          this._slashState.items[this._slashState.selectedIndex]
        );
        return true;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        this._closeSlashMenu();
        return true;
      }

      return false;
    }
    _transaction(worker, opts = {}) {
      const bm = captureBookmark(this.content);
      worker(this);
      normalize(this.content);
      restoreBookmark(this.content, bm);
      this.textarea.value = this.serialize();
      if (typeof this.options.onChange === "function")
        this.options.onChange(this.textarea.value);
      if (opts.pushHistory) this._pushHistory();
    }
    _pushHistory() {
      // Truncate redo tail
      if (this.history.index < this.history.stack.length - 1) {
        this.history.stack = this.history.stack.slice(0, this.history.index + 1);
      }
      this.history.stack.push({ html: this.serialize() });
      this.history.index = this.history.stack.length - 1;
      if (this.history.stack.length > this.history.limit) {
        // Drop oldest
        const overflow = this.history.stack.length - this.history.limit;
        this.history.stack.splice(0, overflow);
        this.history.index -= overflow;
      }
    }
    undo() {
      if (this.history.index <= 0) return;
      this.history.index--;
      this._restoreHistoryEntry();
    }
    redo() {
      if (this.history.index >= this.history.stack.length - 1) return;
      this.history.index++;
      this._restoreHistoryEntry();
    }
    _restoreHistoryEntry() {
      const entry = this.history.stack[this.history.index];
      if (!entry) return;
      this.content.innerHTML = entry.html;
      normalize(this.content);
      this.textarea.value = this.serialize();
    }
    _insertFragmentAtSelection(frag) {
      const sel = document.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      range.deleteContents();
      while (frag.firstChild) {
        range.insertNode(frag.firstChild);
      }
      // Move caret to end of inserted content
      sel.collapse(range.endContainer, range.endOffset);
    }
    _maybeHandleListIndent(e) {
      // Returns true if handled
      const sel = document.getSelection();
      if (!sel || sel.rangeCount === 0) return false;
      let node = sel.getRangeAt(0).startContainer;
      while (node && node !== this.content && node.nodeType === 3)
        node = node.parentNode;
      while (
        node &&
        node.tagName &&
        node.tagName.toLowerCase() !== "li" &&
        node !== this.content
      )
        node = node.parentNode;
      if (!node || node === this.content) return false;
      const li = node;
      const list = li.parentNode;
      if (e.shiftKey) {
        // outdent
        const parentLi =
          list.parentNode &&
          list.parentNode.tagName &&
          list.parentNode.tagName.toLowerCase() === "li"
            ? list.parentNode
            : null;
        e.preventDefault();
        if (parentLi) {
          const ancestorList = parentLi.parentNode; // ul/ol
          ancestorList.insertBefore(li, parentLi.nextSibling);
          if (list.children.length === 0) list.remove();
          this._transaction(() => {}, { pushHistory: true });
          return true;
        } else if (list.parentNode === this.content) {
          // Already top-level: no action
          return false;
        }
        return false;
      } else {
        // indent
        const prev = li.previousElementSibling;
        if (!prev) return false; // cannot indent first
        e.preventDefault();
        let sublist = Array.from(prev.children)
          .reverse()
          .find(
            (ch) =>
              ch.tagName &&
              (ch.tagName.toLowerCase() === "ul" ||
                ch.tagName.toLowerCase() === "ol")
          );
        if (!sublist) {
          sublist = document.createElement(list.tagName.toLowerCase());
          prev.appendChild(sublist);
        }
        sublist.appendChild(li);
        this._transaction(() => {}, { pushHistory: true });
        return true;
      }
    }
    serialize() {
      return this.content.innerHTML;
    }
    getHTML() {
      return this.serialize();
    }
    setHTML(html) {
      this.content.innerHTML = html || "<p></p>";
      normalize(this.content);
      this.textarea.value = this.serialize();
      this._closeSlashMenu();
      this._rememberSelection();
      this._pushHistory();
    }
    triggerSave() {
      this.textarea.value = this.serialize();
    }
    exportPlainText() {
      // Basic block separation by newlines
      const clone = this.content.cloneNode(true);
      clone.querySelectorAll("script,style").forEach((n) => n.remove());
      return clone.textContent.replace(/\n{2,}/g, "\n").trim();
    }
    exportMarkdown() {
      // Ultra-minimal mapping
      const out = [];
      for (const child of this.content.children) {
        const tag = child.tagName.toLowerCase();
        let line = "";
        if (tag === "p") line = child.textContent.trim();
        else if (/^h[1-6]$/.test(tag))
          line = "#".repeat(parseInt(tag[1])) + " " + child.textContent.trim();
        else if (tag === "ul") {
          child
            .querySelectorAll(":scope > li")
            .forEach((li) => out.push("- " + li.textContent.trim()));
          continue;
        } else if (tag === "ol") {
          let i = 1;
          child
            .querySelectorAll(":scope > li")
            .forEach((li) => out.push(i++ + ". " + li.textContent.trim()));
          continue;
        } else line = child.textContent.trim();
        out.push(line);
      }
      return out.join("\n\n");
    }
    exportHTML() {
      return this.content.innerHTML;
    }
    getPlain() {
      return this.exportPlainText();
    }
    getMarkdown() {
      return this.exportMarkdown();
    }
    focus() {
      this.content.focus();
    }
    dispose() {
      if (this._autosaveTimer) this._clearInterval(this._autosaveTimer);
    }
    destroy() {
      this.dispose();
      if (this._handlers) {
        if (this._handlers.input)
          this.content.removeEventListener("input", this._handlers.input);
        if (this._handlers.focus)
          this.content.removeEventListener("focus", this._handlers.focus);
        if (this._handlers.paste)
          this.content.removeEventListener("paste", this._handlers.paste);
        if (this._handlers.keydown)
          this.content.removeEventListener("keydown", this._handlers.keydown);
        if (this._handlers.selectionchange)
          document.removeEventListener(
            "selectionchange",
            this._handlers.selectionchange
          );
      }
      this._closeSlashMenu();
      this.triggerSave();
      if (this.root && this.root.parentNode) {
        this.root.parentNode.removeChild(this.root);
      }
      this.textarea.style.display = "";
      this.textarea.removeAttribute("data-rtx-source");
      this.textarea._rtxAttached = false;
    }
  }

  // Primary public bundle entry for EdNotes Rich Text Editor.
  // Exports all public API symbols (previous legacy yourorg bundle removed in 0.2.0).

  // Minimal facade replicating prior RichText export shape.
  const instances = new Set();
  function _all() {
    return Array.from(instances);
  }

  const EXCLUDED_SLASH_COMMANDS = new Set(["undo", "redo", "unlink"]);

  const LEGACY_TOOLBAR_LAYOUT = [
    [
      { name: "undo", text: "↺", aria: "Undo", action: "undo" },
      { name: "redo", text: "↻", aria: "Redo", action: "redo" },
    ],
    [
      { name: "paragraph", text: "P", aria: "Paragraph", command: "block:p" },
      { name: "h1", text: "H1", aria: "Heading 1", command: "block:h1" },
      { name: "h2", text: "H2", aria: "Heading 2", command: "block:h2" },
      { name: "h3", text: "H3", aria: "Heading 3", command: "block:h3" },
    ],
    [
      { name: "bold", text: "B", aria: "Bold", command: "strong" },
      { name: "italic", text: "I", aria: "Italic", command: "em" },
      { name: "underline", text: "U", aria: "Underline", command: "u" },
    ],
    [
      { name: "bullist", text: "•", aria: "Bullet List", command: "list:ul" },
      { name: "numlist", text: "1.", aria: "Numbered List", command: "list:ol" },
    ],
    [{ name: "table", text: "⌗", aria: "Insert Table", command: "table:insert" }],
    [
      { name: "link", text: "🔗", aria: "Add Link", command: "link:add" },
      { name: "unlink", text: "✖", aria: "Remove Link", command: "link:remove" },
    ],
    [
      { name: "task", text: "☑", aria: "Task List", command: "list:task" },
      { name: "math", text: "∑", aria: "Math Equation", command: "math:add" },
    ],
    [
      {
        name: "removeformat",
        text: "⌫",
        aria: "Clear Formatting",
        command: "format:clear",
      },
    ],
  ];

  function cloneLegacyLayout() {
    return LEGACY_TOOLBAR_LAYOUT.map((group) => group.map((btn) => ({ ...btn })));
  }

  function buildSlashCommands(layout) {
    const slashCommands = [];
    const seen = new Set();
    const groups = layout && layout.length ? layout : cloneLegacyLayout();
    groups.forEach((group) => {
      group.forEach((def) => {
        collectSlashCommand(def, slashCommands, seen);
      });
    });
    return slashCommands;
  }

  function collectSlashCommand(def, slashCommands, seen, parentLabel) {
    if (!def) return;

    if (def.type === "dropdown") {
      (def.options || []).forEach((opt) => {
        collectSlashCommand(opt, slashCommands, seen, def.label || def.name);
      });
      return;
    }

    if (!def.command) return;

    const name = def.name || def.command;
    if (EXCLUDED_SLASH_COMMANDS.has(name)) return;

    if (seen.has(def.command)) return;
    seen.add(def.command);

    slashCommands.push({
      name,
      label: def.label || def.aria || def.name || def.command,
      command: def.command,
      text: def.text || def.icon || "/",
      keywords: [parentLabel, def.name, def.label, def.aria, def.command].filter(
        Boolean
      ),
    });
  }

  function mountToolbar(editor, layout) {
    const tb = editor.root.querySelector(".rtx-toolbar");
    if (!tb) return;
    tb.innerHTML = "";
    const focusables = [];
    const groups = layout && layout.length ? layout : cloneLegacyLayout();
    groups.forEach((group) => {
      if (!Array.isArray(group) || group.length === 0) return;
      const groupEl = document.createElement("div");
      groupEl.className = "rtx-toolbar-group";
      group.forEach((def) => {
        const control =
          def && def.type === "dropdown"
            ? createDropdownControl(editor, def, focusables)
            : createButtonControl(editor, def, focusables);
        if (control) groupEl.appendChild(control);
      });
      if (groupEl.children.length) tb.appendChild(groupEl);
    });
  }

  function createButtonControl(editor, def, focusables) {
    if (!def) return null;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "rtx-button";
    const tooltip = def.title || def.aria || def.label || def.name || "Button";
    btn.textContent = def.text || def.icon || def.label || def.name || "Button";
    btn.setAttribute("aria-label", tooltip);
    btn.title = tooltip;
    if (def.name) btn.dataset.plugin = def.name;
    if (def.command) btn.dataset.cmd = def.command;
    if (def.action) btn.dataset.action = def.action;
    if (def.disabled) btn.disabled = true;
    btn.addEventListener("mousedown", (event) => {
      event.preventDefault();
      if (typeof editor._rememberSelection === "function") {
        editor._rememberSelection();
      }
      if (typeof editor.focus === "function") {
        editor.focus();
      }
    });
    btn.addEventListener("click", () => handleToolbarAction(editor, def));
    registerRovingControl(btn, focusables);
    return btn;
  }

  function createDropdownControl(editor, def, focusables) {
    const select = document.createElement("select");
    select.className = "rtx-select";
    const tooltip = def.title || def.label || def.name || "Options";
    select.setAttribute("aria-label", tooltip);
    select.title = tooltip;
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = def.label || def.name || "Select";
    placeholder.disabled = true;
    placeholder.selected = true;
    select.appendChild(placeholder);
    select.addEventListener("mousedown", () => {
      if (typeof editor._rememberSelection === "function") {
        editor._rememberSelection();
      }
    });
    (def.options || []).forEach((opt) => {
      const optionEl = document.createElement("option");
      optionEl.value = opt.value || opt.command || opt.name;
      optionEl.textContent = opt.label || opt.name || optionEl.value;
      select.appendChild(optionEl);
    });
    select.addEventListener("change", () => {
      const idx = select.selectedIndex - 1; // account for placeholder
      if (idx >= 0 && def.options && def.options[idx]) {
        handleToolbarAction(editor, def.options[idx]);
      }
      select.selectedIndex = 0;
    });
    registerRovingControl(select, focusables);
    return select;
  }

  function registerRovingControl(el, focusables) {
    const isFirst = focusables.length === 0;
    el.tabIndex = isFirst ? 0 : -1;
    focusables.push(el);
    el.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      const dir = e.key === "ArrowRight" ? 1 : -1;
      let idx = focusables.indexOf(el) + dir;
      if (idx < 0) idx = focusables.length - 1;
      if (idx >= focusables.length) idx = 0;
      focusables.forEach((control, i) => {
        control.tabIndex = i === idx ? 0 : -1;
      });
      focusables[idx].focus();
    });
  }

  function handleToolbarAction(editor, def) {
    if (!def) return;
    if (typeof editor._restoreSavedSelection === "function") {
      editor._restoreSavedSelection();
    }
    if (typeof editor.focus === "function") {
      editor.focus();
    }
    if (typeof def.run === "function") {
      def.run(editor);
      return;
    }
    if (def.action === "undo") {
      editor.undo();
      return;
    }
    if (def.action === "redo") {
      editor.redo();
      return;
    }
    if (def.command) {
      editor.bus.exec(def.command);
    }
  }

  const RichText = {
    attach(selector, options = {}) {
      const nodes = document.querySelectorAll(selector);
      if (nodes.length === 0) {
        console.warn("[EdNotes.RichText] No elements matched selector", selector);
        return 0;
      }
      nodes.forEach((t) => {
        if (t._rtxAttached) return;
        t._rtxAttached = true;
        const {
          toolbarLayout,
          promptLink,
          promptMath,
          slashCommands,
          ...editorOptions
        } = options;
        const layout = Array.isArray(toolbarLayout) ? toolbarLayout : null;
        const ed = new EditorCore(t, {
          ...editorOptions,
          slashCommands: Array.isArray(slashCommands)
            ? slashCommands
            : buildSlashCommands(layout),
        });
        ed.bus.register("strong", markCommand("strong"));
        ed.bus.register("em", markCommand("em"));
        ed.bus.register("u", markCommand("u"));
        ed.bus.register("block:p", blockCommand("p"));
        ed.bus.register("block:h1", blockCommand("h1"));
        ed.bus.register("block:h2", blockCommand("h2"));
        ed.bus.register("block:h3", blockCommand("h3"));
        ed.bus.register("list:ul", listCommand("ul"));
        ed.bus.register("list:ol", listCommand("ol"));
        ed.bus.register("link:add", linkAddCommand({ promptLink }));
        ed.bus.register("link:remove", linkRemoveCommand());
        ed.bus.register("list:task", taskListCommand());
        ed.bus.register("math:add", mathCommand({ promptMath }));
        ed.bus.register("format:clear", clearFormatCommand());
        ed.bus.register("table:insert", tableInsertCommand());
        mountToolbar(ed, layout);
        ed.root.setAttribute("data-rtx-attached", "true");
        t.setAttribute("data-rtx-source", "true");
        const originalDestroy = ed.destroy.bind(ed);
        ed.destroy = () => {
          originalDestroy();
          instances.delete(ed);
        };
        instances.add(ed);
      });
      return nodes.length;
    },
    triggerSave() {
      instances.forEach((i) => i.triggerSave());
    },
    undo() {
      instances.forEach((i) => i.undo());
    },
    redo() {
      instances.forEach((i) => i.redo());
    },
    exportAllPlain() {
      return _all().map((i) => i.exportPlainText());
    },
    exportAllMarkdown() {
      return _all().map((i) => i.exportMarkdown());
    },
    exportAllHTML() {
      return _all().map((i) => i.exportHTML());
    },
    destroy(selector) {
      if (!selector) {
        instances.forEach((i) => i.destroy());
        instances.clear();
        return;
      }
      const isNodeList =
        typeof globalThis.NodeList !== "undefined" &&
        selector instanceof globalThis.NodeList;
      const targets =
        typeof selector === "string"
          ? document.querySelectorAll(selector)
          : isNodeList || Array.isArray(selector)
          ? selector
          : [selector];
      Array.from(targets).forEach((el) => {
        const instance = _all().find(
          (inst) =>
            inst.textarea === el || inst.root === el || inst.content === el
        );
        if (instance) {
          instance.destroy();
          instances.delete(instance);
        }
      });
    },
    enforceLinkPolicy,
    _all,
    _clearInstances: () => instances.clear(),
  };

  // Version injected manually (consider automated replacement in future build step)
  // Bump version for release metadata alignment.
  RichText.version = "0.5.5";

  function blockCommand(tag) {
    return (ed) => {
      const sel = document.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      let node = range.startContainer;
      while (node && node !== ed.content && node.nodeType === 3)
        node = node.parentNode;
      while (node && node.parentNode !== ed.content) node = node.parentNode;
      if (!node) return;
      if (node.tagName && node.tagName.toLowerCase() === tag) return;
      const replacement = document.createElement(tag);
      replacement.innerHTML = node.innerHTML || "<br />";
      ed.content.replaceChild(replacement, node);
    };
  }
  function listCommand(listTag) {
    return (ed) => {
      const sel = document.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      let node = range.startContainer;
      while (node && node !== ed.content && node.nodeType === 3)
        node = node.parentNode;
      while (node && node.parentNode !== ed.content) node = node.parentNode;
      if (!node) return;
      const tag = node.tagName ? node.tagName.toLowerCase() : "";
      if (tag === "ul" || tag === "ol") {
        const frag = document.createDocumentFragment();
        Array.from(node.querySelectorAll("li")).forEach((li) => {
          const p = document.createElement("p");
          p.innerHTML = li.innerHTML || "<br />";
          frag.appendChild(p);
        });
        ed.content.replaceChild(frag, node);
      } else {
        const list = document.createElement(listTag);
        const li = document.createElement("li");
        li.innerHTML = node.innerHTML || "<br />";
        list.appendChild(li);
        ed.content.replaceChild(list, node);
      }
    };
  }
  function linkAddCommand({ promptLink } = {}) {
    const promptFn =
      typeof promptLink === "function"
        ? promptLink
        : () =>
            typeof window.prompt === "function"
              ? window.prompt("Enter URL (https://...)", "https://")
              : null;
    return (ed) => {
      if (typeof ed._rememberSelection === "function") {
        ed._rememberSelection();
      }
      const promptSelection = ed._selectionBookmark;
      const url = promptFn();
      if (!url) return;
      if (promptSelection) {
        ed._selectionBookmark = promptSelection;
        if (typeof ed._restoreSavedSelection === "function") {
          ed._restoreSavedSelection();
        }
      }
      const sel = document.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const a = document.createElement("a");
      a.href = url;
      enforceLinkPolicy(a);
      const range = sel.getRangeAt(0);
      if (range.collapsed) {
        a.textContent = url;
        range.insertNode(a);
      } else {
        const txt = range.extractContents();
        a.appendChild(txt);
        range.insertNode(a);
      }
    };
  }
  function linkRemoveCommand() {
    return (ed) => {
      const sel = document.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      let node = sel.anchorNode || sel.focusNode;
      while (
        node &&
        node !== ed.content &&
        (!node.tagName || node.tagName.toLowerCase() !== "a")
      )
        node = node.parentNode;
      if (node && node.tagName && node.tagName.toLowerCase() === "a") {
        const parent = node.parentNode;
        while (node.firstChild) parent.insertBefore(node.firstChild, node);
        node.remove();
      }
    };
  }
  function taskListCommand() {
    return (ed) => {
      const sel = document.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      let node = sel.anchorNode;
      while (node && node !== ed.content && node.nodeType === 3)
        node = node.parentNode;
      while (node && node.parentNode !== ed.content) node = node.parentNode;
      if (!node) return;
      const tag = node.tagName ? node.tagName.toLowerCase() : "";
      if (tag === "ul" && node.getAttribute("data-list") === "task") {
        node.removeAttribute("data-list");
        node
          .querySelectorAll("li")
          .forEach((li) => li.removeAttribute("data-checked"));
      } else if (tag === "ul") {
        node.setAttribute("data-list", "task");
        node.querySelectorAll("li").forEach((li) => {
          if (!li.hasAttribute("data-checked"))
            li.setAttribute("data-checked", "false");
        });
      } else {
        const ul = document.createElement("ul");
        ul.setAttribute("data-list", "task");
        const li = document.createElement("li");
        li.setAttribute("data-checked", "false");
        li.innerHTML = node.innerHTML || "<br />";
        ul.appendChild(li);
        ed.content.replaceChild(ul, node);
      }
    };
  }
  function mathCommand({ promptMath } = {}) {
    const promptFn =
      typeof promptMath === "function"
        ? promptMath
        : () =>
            typeof window.prompt === "function"
              ? window.prompt("Enter LaTeX:", "x^2")
              : null;
    return (ed) => {
      if (typeof ed._rememberSelection === "function") {
        ed._rememberSelection();
      }
      const promptSelection = ed._selectionBookmark;
      const latex = promptFn();
      if (!latex) return;
      if (promptSelection) {
        ed._selectionBookmark = promptSelection;
        if (typeof ed._restoreSavedSelection === "function") {
          ed._restoreSavedSelection();
        }
      }
      const sel = document.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const span = document.createElement("span");
      span.className = "math";
      span.textContent = latex;
      try {
        katex.render(latex, span, { throwOnError: false });
      } catch (e) {
        span.textContent = "[Math Error]";
      }
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(span);
    };
  }

  function clearFormatCommand() {
    const formatTags = new Set(["strong", "em", "u"]);

    function collectFullySelectedAncestors(range, root) {
      const matches = [];
      const seen = new Set();

      [range.startContainer, range.endContainer].forEach((node) => {
        let current = node && node.nodeType === 3 ? node.parentNode : node;
        while (current && current !== root) {
          const tag = current.tagName && current.tagName.toLowerCase();
          if (
            formatTags.has(tag) &&
            current.textContent === range.toString() &&
            !seen.has(current)
          ) {
            matches.push(current);
            seen.add(current);
          }
          current = current.parentNode;
        }
      });

      return matches;
    }

    return (ed) => {
      if (typeof document.execCommand === "function") {
        try {
          document.execCommand("removeFormat");
          return;
        } catch (_) {
          /* fall back */
        }
      }
      const sel = document.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      const ancestors = ed
        ? collectFullySelectedAncestors(range, ed.content)
        : [];

      if (ancestors.length) {
        ancestors.forEach((el) => {
          const parent = el.parentNode;
          if (!parent) return;
          while (el.firstChild) parent.insertBefore(el.firstChild, el);
          el.remove();
        });
        return;
      }

      const frag = range.extractContents();
      const walker = document.createTreeWalker(
        frag,
        NodeFilter.SHOW_ELEMENT,
        null
      );
      const toUnwrap = [];
      while (walker.nextNode()) {
        const el = walker.currentNode;
        const tag = el.tagName && el.tagName.toLowerCase();
        if (tag === "strong" || tag === "em" || tag === "u") toUnwrap.push(el);
      }
      toUnwrap.forEach((el) => {
        const parent = el.parentNode;
        if (!parent) return;
        while (el.firstChild) parent.insertBefore(el.firstChild, el);
        el.remove();
      });
      range.insertNode(frag);
    };
  }

  function tableInsertCommand() {
    return () => {
      const sel = document.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      const table = document.createElement("table");
      const tbody = document.createElement("tbody");
      for (let r = 0; r < 2; r++) {
        const tr = document.createElement("tr");
        for (let c = 0; c < 2; c++) {
          const td = document.createElement("td");
          td.innerHTML = "<br />";
          tr.appendChild(td);
        }
        tbody.appendChild(tr);
      }
      table.appendChild(tbody);
      range.deleteContents();
      range.insertNode(table);
    };
  }
  if (typeof window !== "undefined") window.RichText = RichText;

  exports.RichText = RichText;

}));
//# sourceMappingURL=ednotes.richtext.umd.js.map
