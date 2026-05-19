export function initTestPage({
  EdNotesRichText,
  document = window.document,
  window = globalThis.window,
} = {}) {
  const DEMO_THEME = "professional";

  if (!EdNotesRichText) {
    throw new Error("EdNotesRichText is required to initialize the test page.");
  }

  const sourceTextarea = document.getElementById("playground");
  const host = document.getElementById("editor-host");
  const output = document.getElementById("output");
  const btnMarkdown = document.getElementById("btn-markdown");
  const seedPreview = document.getElementById("seed-preview");
  const themeValue = document.getElementById("theme-value");
  const lifecycleValue = document.getElementById("lifecycle-value");
  const autosaveValue = document.getElementById("autosave-value");
  const versionValue = document.getElementById("version-value");
  const wordCountValue = document.getElementById("word-count");
  const htmlBytesValue = document.getElementById("html-bytes");
  const outputLabel = document.getElementById("output-label");
  const lastActionValue = document.getElementById("last-action-value");
  const editorSurface = document.getElementById("editor-surface");

  if (!sourceTextarea || !host || !output) {
    throw new Error("The test page is missing required elements.");
  }

  const defaultValue = sourceTextarea.defaultValue || sourceTextarea.value;
  let latestHTML = defaultValue;
  let editor = null;

  function setText(element, text) {
    if (element) {
      element.textContent = text;
    }
  }

  function logOutput(text, label = "Product console") {
    output.textContent = text;
    setText(outputLabel, label);
    setText(lastActionValue, label);
  }

  function getSelectedTheme() {
    return DEMO_THEME;
  }

  function countWords(text) {
    const trimmed = (text || "").trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }

  function countBytes(text) {
    if (typeof TextEncoder === "function") {
      return new TextEncoder().encode(text || "").length;
    }

    return (text || "").length;
  }

  function plainTextFromHTML(html) {
    const scratch = document.createElement("div");
    scratch.innerHTML = html || "";
    return scratch.textContent || "";
  }

  function updateThemeState(themeName = getSelectedTheme()) {
    const labels = {
      default: "Default",
      professional: "Professional",
      "high-contrast": "High Contrast",
      dyslexia: "Dyslexia Friendly",
    };

    setText(themeValue, labels[themeName] || themeName);
  }

  function updateLifecycleState(value) {
    setText(lifecycleValue, value);
  }

  function updateAutosaveState(value) {
    setText(autosaveValue, value);
  }

  function updateMetrics(html = latestHTML) {
    const plainText =
      editor && typeof editor.getPlain === "function"
        ? editor.getPlain()
        : plainTextFromHTML(html);

    setText(wordCountValue, String(countWords(plainText)));
    setText(htmlBytesValue, String(countBytes(html)));
  }

  function updateSurfaceState(value) {
    if (editorSurface) {
      editorSurface.setAttribute("data-state", value);
    }
  }

  function renderSeedPreview() {
    setText(seedPreview, defaultValue);
  }

  function buildInitOptions() {
    return {
      selector: "#playground",
      toolbar:
        "undo redo | blocks | bold italic underline | link unlink | numlist bullist task | table math | removeformat",
      plugins: "core formatting blocks lists links tables tasks math",
      theme: getSelectedTheme(),
      autosave: {
        interval: 4000,
        handler: (html) => {
          latestHTML = html;
          updateMetrics(html);
        },
      },
      promptLink: () => window.prompt("Enter URL", "https://"),
      promptMath: () => window.prompt("Enter LaTeX", "x^2"),
      onChange: (html) => {
        document.title = `EdNotes demo - ${new Date().toLocaleTimeString()}`;
        latestHTML = html;
        updateMetrics(html);
        updateLifecycleState("Live");
        updateSurfaceState("live");
      },
    };
  }

  function attachEditor({ resetContent = false } = {}) {
    if (resetContent) {
      sourceTextarea.value = defaultValue;
    }

    if (sourceTextarea.parentNode !== host) {
      host.appendChild(sourceTextarea);
    }

    updateSurfaceState("booting");
    try {
      const list = EdNotesRichText.init(buildInitOptions());
      editor = list[0] || null;
      latestHTML = editor ? editor.getHTML() : sourceTextarea.value;
      updateMetrics(latestHTML);
      updateThemeState();
      updateAutosaveState(editor ? "Watching edits" : "Unavailable");
      updateLifecycleState(
        editor ? (resetContent ? "Reattached" : "Live") : "Unavailable"
      );
      updateSurfaceState(editor ? "live" : "error");

      if (!editor) {
        logOutput(
          "Editor initialization returned no instance. Check the selector and module loading path.",
          "Initialization warning"
        );
      }

      return editor;
    } catch (error) {
      editor = null;
      updateAutosaveState("Unavailable");
      updateLifecycleState("Error");
      updateSurfaceState("error");
      logOutput(
        "Editor initialization failed: " +
          (error && error.message ? error.message : String(error)),
        "Initialization error"
      );
      return null;
    }
  }

  function resetToDefaultContent() {
    if (!editor) {
      attachEditor({ resetContent: true });
      logOutput("Content reset to defaults.", "Reset");
      return;
    }

    editor.setHTML(defaultValue);
    latestHTML = editor.getHTML();
    updateMetrics(latestHTML);
    updateLifecycleState("Reset");
    updateSurfaceState("live");
    logOutput("Content reset to defaults.", "Reset");
  }

  function destroyEditor() {
    if (!editor) {
      return;
    }

    editor.destroy();
    editor = null;
    updateLifecycleState("Destroyed");
    updateAutosaveState("Paused");
    updateSurfaceState("standby");
    logOutput(
      "Editor destroyed. Press Reset to restore the original seed HTML.",
      "Destroyed"
    );
  }

  renderSeedPreview();
  updateThemeState();
  updateMetrics(defaultValue);
  updateLifecycleState("Booting");
  updateAutosaveState("Waiting for first edit");
  setText(versionValue, EdNotesRichText.version || "dev");
  logOutput(
    "Use the live editor to test formatting, lists, tables, links, tasks, and export snapshots.",
    "Product console"
  );

  attachEditor();

  document.getElementById("btn-html").addEventListener("click", () => {
    if (!editor) {
      return;
    }

    logOutput(editor.getHTML(), "HTML export");
  });

  document.getElementById("btn-plain").addEventListener("click", () => {
    if (!editor) {
      return;
    }

    logOutput(editor.getPlain(), "Plain text export");
  });

  if (btnMarkdown) {
    btnMarkdown.addEventListener("click", () => {
      if (!editor || typeof editor.getMarkdown !== "function") {
        return;
      }

      logOutput(editor.getMarkdown(), "Markdown export");
    });
  }

  document
    .getElementById("btn-reset")
    .addEventListener("click", resetToDefaultContent);

  document
    .getElementById("btn-destroy")
    .addEventListener("click", destroyEditor);

  return {
    attachEditor,
    destroyEditor,
    getDefaultValue: () => defaultValue,
    getEditor: () => editor,
    getLatestHTML: () => latestHTML,
    getSelectedTheme,
    resetToDefaultContent,
  };
}

export default initTestPage;