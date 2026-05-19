// Plugin registry for EdNotes RichText Editor
// Provides modern plugin system with declarative toolbar configuration

const plugins = new Map();
const toolbarButtons = new Map();

// Core plugin registry
export function registerPlugin(name, definition) {
  if (plugins.has(name)) {
    console.warn(
      `[EdNotes.RichText] Plugin '${name}' already registered, skipping`
    );
    return;
  }

  plugins.set(name, definition);

  // Register toolbar buttons from this plugin
  if (definition.buttons) {
    definition.buttons.forEach((button) => {
      toolbarButtons.set(button.name, {
        ...button,
        plugin: name,
      });
    });
  }
}

export function getPlugin(name) {
  return plugins.get(name);
}

export function parseToolbar(toolbarString) {
  if (!toolbarString) return [];

  return toolbarString.split("|").map((group) =>
    group
      .trim()
      .split(/\s+/)
      .filter((name) => name.length > 0)
  );
}

export function getToolbarButton(name) {
  return toolbarButtons.get(name);
}

export function buildToolbarLayout(pluginList, toolbarString) {
  const enabled = new Set(pluginList);
  enabled.add("core");
  const groups = parseToolbar(toolbarString);
  return groups
    .map((group) =>
      group
        .map((name) => toolbarButtons.get(name))
        .filter(
          (btn) => btn && (btn.plugin === "core" || enabled.has(btn.plugin))
        )
        .map((btn) => cloneButton(btn))
    )
    .filter((group) => group.length);
}

function cloneButton(btn) {
  return {
    ...btn,
    options: btn.options ? btn.options.map((opt) => ({ ...opt })) : undefined,
  };
}

export function validatePlugins(pluginList) {
  const invalid = [];
  pluginList.forEach((name) => {
    if (!plugins.has(name)) {
      invalid.push(name);
    }
  });
  return invalid;
}

// Core plugins (always available)
registerPlugin("core", {
  name: "core",
  required: true,
  buttons: [
    { name: "undo", text: "↺", label: "Undo", run: (editor) => editor.undo() },
    { name: "redo", text: "↻", label: "Redo", run: (editor) => editor.redo() },
  ],
  init(editor) {
    // Core functionality always enabled
  },
});

registerPlugin("formatting", {
  name: "formatting",
  buttons: [
    {
      name: "bold",
      text: "B",
      label: "Bold",
      command: "strong",
      shortcut: "Ctrl+B",
    },
    {
      name: "italic",
      text: "I",
      label: "Italic",
      command: "em",
      shortcut: "Ctrl+I",
    },
    {
      name: "underline",
      text: "U",
      label: "Underline",
      command: "u",
      shortcut: "Ctrl+U",
    },
    {
      name: "removeformat",
      text: "⌫",
      label: "Clear Formatting",
      command: "format:clear",
    },
  ],
});

registerPlugin("blocks", {
  name: "blocks",
  buttons: [
    {
      name: "blocks",
      label: "Blocks",
      type: "dropdown",
      options: [
        { name: "paragraph", label: "Paragraph", command: "block:p" },
        { name: "h1", label: "Heading 1", command: "block:h1" },
        { name: "h2", label: "Heading 2", command: "block:h2" },
        { name: "h3", label: "Heading 3", command: "block:h3" },
      ],
    },
  ],
});

registerPlugin("lists", {
  name: "lists",
  buttons: [
    { name: "numlist", text: "1.", label: "Numbered List", command: "list:ol" },
    { name: "bullist", text: "•", label: "Bullet List", command: "list:ul" },
  ],
});

registerPlugin("links", {
  name: "links",
  buttons: [
    { name: "link", text: "🔗", label: "Insert Link", command: "link:add" },
    { name: "unlink", text: "✖", label: "Remove Link", command: "link:remove" },
  ],
});

registerPlugin("tables", {
  name: "tables",
  buttons: [
    {
      name: "table",
      text: "⌗",
      label: "Insert Table",
      command: "table:insert",
    },
  ],
});

registerPlugin("tasks", {
  name: "tasks",
  buttons: [
    { name: "task", text: "☑", label: "Task List", command: "list:task" },
  ],
});

registerPlugin("math", {
  name: "math",
  buttons: [
    { name: "math", text: "∑", label: "Math Equation", command: "math:add" },
  ],
});
