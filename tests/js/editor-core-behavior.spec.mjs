import { RichText } from "../../src/EdNotes.RichText/wwwroot/editor/ednotes.richtext.bundle.js";
import EdNotesRichText from "../../src/EdNotes.RichText/wwwroot/editor/ednotes.richtext.api.js";

function createTextarea(id = "rtx-demo", value = "<p>Demo</p>") {
  document.body.innerHTML = "";
  const ta = document.createElement("textarea");
  ta.id = id;
  ta.value = value;
  document.body.appendChild(ta);
  return ta;
}

function selectNodeContents(node) {
  const sel = document.getSelection();
  const range = document.createRange();
  range.selectNodeContents(node);
  sel.removeAllRanges();
  sel.addRange(range);
}

afterEach(() => {
  RichText.destroy();
  RichText._clearInstances();
  document.body.innerHTML = "";
});

describe("Editor core behavior", () => {
  test("command execution pushes undo history", () => {
    createTextarea("history");
    RichText.attach("#history");
    const instance = RichText._all()[0];
    const paragraph = instance.content.querySelector("p");
    selectNodeContents(paragraph.firstChild);
    instance.bus.exec("strong");
    expect(instance.content.querySelector("strong")).toBeTruthy();
    instance.undo();
    expect(instance.content.querySelector("strong")).toBeFalsy();
  });

  test("initial value is normalized before history", () => {
    const ta = createTextarea(
      "sanitize",
      "<p>Safe</p><script>alert(1)</script>"
    );
    RichText.attach("#sanitize");
    const instance = RichText._all()[0];
    expect(instance.content.querySelector("script")).toBeNull();
    expect(ta.value.toLowerCase()).not.toContain("<script");
  });

  test("toolbar honors plugin configuration", () => {
    const ta = createTextarea("toolbar");
    EdNotesRichText.init({
      selector: "#toolbar",
      plugins: "core formatting",
      toolbar: "bold",
    });
    const toolbar = ta.parentNode.querySelector(".rtx-toolbar");
    const buttons = toolbar.querySelectorAll("button");
    expect(buttons.length).toBe(1);
    expect(buttons[0].textContent).toBe("B");
    EdNotesRichText.destroy("#toolbar");
  });

  test("destroy restores textarea and removes wrapper", () => {
    const ta = createTextarea("destroy");
    EdNotesRichText.init({ selector: "#destroy" });
    expect(document.querySelector(".rtx-editor")).toBeTruthy();
    EdNotesRichText.destroy("#destroy");
    expect(document.querySelector(".rtx-editor")).toBeFalsy();
    expect(ta.style.display).not.toBe("none");
    expect(ta._rtxAttached).toBeFalsy();
  });
});
