import { readFileSync } from "node:fs";
import { RichText } from "../../src/EdNotes.RichText/wwwroot/editor/ednotes.richtext.bundle.js";
import EdNotesRichText from "../../src/EdNotes.RichText/wwwroot/editor/ednotes.richtext.api.js";
import { initTestPage } from "../../docs/test-page.app.js";

function renderDemoDom(seed = "<p>Seed</p>") {
  document.body.innerHTML = `
    <main>
      <textarea id="playground">${seed}</textarea>
      <div id="editor-host"></div>
      <button id="btn-html">Dump HTML</button>
      <button id="btn-plain">Dump Plain Text</button>
      <button id="btn-markdown">Dump Markdown</button>
      <button id="btn-reset">Reset Content</button>
      <button id="btn-destroy">Destroy Editor</button>
      <pre id="output">Click an action to inspect editor state.</pre>
    </main>
  `;
}

function loadTestPageDocument() {
  const html = readFileSync(
    new URL("../../docs/test-page.html", import.meta.url),
    "utf8"
  );

  return new DOMParser().parseFromString(html, "text/html");
}

afterEach(() => {
  RichText.destroy();
  RichText._clearInstances();
  document.body.innerHTML = "";
  document.title = "";
});

describe("Docs test page lifecycle", () => {
  test("test page locks the showcase to the professional theme and ships control tooltips", () => {
    const testPageDocument = loadTestPageDocument();
    const npmSnippet = testPageDocument.getElementById("setup-npm-snippet");
    const dotnetSnippet = testPageDocument.getElementById("setup-dotnet-snippet");
    const pageText = testPageDocument.body.textContent.toLowerCase();

    expect(testPageDocument.getElementById("theme-select")).toBeNull();
    expect(testPageDocument.querySelector(".hero-stats")).toBeNull();
    expect(testPageDocument.getElementById("theme-value")).toBeNull();
    expect(testPageDocument.getElementById("lifecycle-value")).toBeNull();
    expect(testPageDocument.getElementById("autosave-value")).toBeNull();
    expect(testPageDocument.getElementById("version-value")).toBeNull();
    expect(testPageDocument.getElementById("btn-html").title).toBe(
      "Show the editor's current HTML output"
    );
    expect(testPageDocument.getElementById("btn-plain").title).toBe(
      "Show the editor's plain text export"
    );
    expect(testPageDocument.getElementById("btn-markdown").title).toBe(
      "Show the editor's Markdown export"
    );
    expect(testPageDocument.getElementById("btn-reset").title).toBe(
      "Restore the original demo content"
    );
    expect(testPageDocument.getElementById("btn-destroy").title).toBe(
      "Destroy the current editor instance without leaving the page"
    );
    expect(testPageDocument.getElementById("output")).toBeTruthy();
    expect(testPageDocument.getElementById("output-label")).toBeNull();
    expect(testPageDocument.getElementById("last-action-value")).toBeNull();
    expect(testPageDocument.querySelector(".checklist")).toBeNull();
    expect(testPageDocument.getElementById("seed-preview")).toBeNull();
    expect(testPageDocument.body.textContent).not.toContain("Why EdNotes");
    expect(testPageDocument.body.textContent).not.toContain("Trusted seed");
    expect(pageText).not.toContain("autosave");
    expect(npmSnippet).toBeTruthy();
    expect(npmSnippet.textContent).toContain(
      "npm install @north15/ednotes-richtext"
    );
    expect(npmSnippet.textContent).toContain(
      'import EdNotesRichText from "@north15/ednotes-richtext";'
    );
    expect(npmSnippet.textContent).toContain("EdNotesRichText.init({");
    expect(dotnetSnippet).toBeTruthy();
    expect(dotnetSnippet.textContent).toContain(
      "~/_content/EdNotes.RichText/editor/ednotes.richtext.loader.js"
    );
    expect(dotnetSnippet.textContent).toContain(
      'EdNotesRichText.init({ selector: "#notes", theme: "professional" });'
    );
  });

  test("reset restores the original seed after destroy reattaches the editor", () => {
    const seed =
      '<h2>Live demo instance</h2><p>Use the toolbar.</p><ul data-list="task"><li data-checked="false">First task</li><li data-checked="true">Second task</li></ul>';

    renderDemoDom(seed);
    const controller = initTestPage({ EdNotesRichText, document, window });
    const sourceTextarea = document.getElementById("playground");

    controller.getEditor().setHTML("<p>Changed after attach</p>");
    document.getElementById("btn-destroy").click();

    expect(controller.getEditor()).toBeNull();
    expect(sourceTextarea.value).toBe("<p>Changed after attach</p>");

    document.getElementById("btn-reset").click();

    expect(controller.getEditor()).toBeTruthy();
    expect(controller.getEditor().getHTML()).toBe(seed);
    expect(sourceTextarea.value).toBe(seed);
    expect(document.getElementById("output").textContent).toBe(
      "Content reset to defaults."
    );
  });

  test("control deck buttons export content and preserve lifecycle behavior", () => {
    const seed =
      '<h2>Live demo instance</h2><p>Use the toolbar.</p><ul data-list="task"><li data-checked="false">First task</li><li data-checked="true">Second task</li></ul>';

    renderDemoDom(seed);
    const controller = initTestPage({ EdNotesRichText, document, window });
    const output = document.getElementById("output");

    document.getElementById("btn-html").click();
    expect(output.textContent).toBe(controller.getEditor().getHTML());

    document.getElementById("btn-plain").click();
    expect(output.textContent).toBe(controller.getEditor().getPlain());

    document.getElementById("btn-markdown").click();
    expect(output.textContent).toBe(controller.getEditor().getMarkdown());
    expect(output.textContent).toContain("## Live demo instance");

    controller.getEditor().setHTML("<p>Changed after attach</p>");
    document.getElementById("btn-destroy").click();

    expect(controller.getEditor()).toBeNull();
    expect(output.textContent).toBe(
      "Editor destroyed. Press Reset to restore the original seed HTML."
    );

    document.getElementById("btn-html").click();
    expect(output.textContent).toBe(
      "Editor destroyed. Press Reset to restore the original seed HTML."
    );

    document.getElementById("btn-reset").click();

    expect(controller.getEditor()).toBeTruthy();
    expect(controller.getEditor().getHTML()).toBe(seed);
    expect(output.textContent).toBe("Content reset to defaults.");
  });

  test("reattach stays on the professional theme after destroy", () => {
    renderDemoDom("<p>Seed</p>");
    const controller = initTestPage({ EdNotesRichText, document, window });

    expect(
      document.querySelector(".rtx-editor").classList.contains("theme-professional")
    ).toBe(true);

    document.getElementById("btn-destroy").click();
    expect(controller.getEditor()).toBeNull();

    document.getElementById("btn-reset").click();

    const editorRoot = document.querySelector(".rtx-editor");
    expect(editorRoot).toBeTruthy();
    expect(editorRoot.classList.contains("theme-professional")).toBe(true);
    expect(editorRoot.classList.contains("theme-high-contrast")).toBe(false);
  });
});