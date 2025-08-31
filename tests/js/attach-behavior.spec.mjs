import { RichText } from '../../src/EdNotes.RichText/wwwroot/editor/ednotes.richtext.bundle.js';

describe('RichText.attach behavior', () => {
  test('attaches editor and sets data attributes', () => {
    document.body.innerHTML = '<textarea id="notes">Hello</textarea>';
    const count = RichText.attach('#notes');
    expect(count).toBe(1);
    expect(document.querySelector('.rtx-editor')).toBeTruthy();
    expect(document.querySelector('[data-rtx-source]')).toBeTruthy();
  });
  test('warns when selector missing', () => {
    let called = false;
    const original = console.warn;
    console.warn = function(...args) { called = true; original.apply(this, args); };
    try {
      const count = RichText.attach('#does-not-exist');
      expect(count).toBe(0);
      expect(called).toBe(true);
    } finally {
      console.warn = original;
    }
  });
});
