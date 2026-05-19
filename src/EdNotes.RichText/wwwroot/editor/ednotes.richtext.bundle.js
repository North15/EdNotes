// Primary public bundle entry for EdNotes Rich Text Editor.
// Exports all public API symbols (previous legacy yourorg bundle removed in 0.2.0).
import { EditorCore, markCommand } from "./core/CommandBus.js";
import { enforceLinkPolicy } from "./core/Schema.js";
import katex from "katex";

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

export const RichText = {
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
RichText.version = "0.6.0";

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
