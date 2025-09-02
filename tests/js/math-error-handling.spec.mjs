import { jest } from '@jest/globals';
import { RichText } from '../../src/EdNotes.RichText/wwwroot/editor/ednotes.richtext.bundle.js';

describe('Math command error handling', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  test('math command with invalid LaTeX shows error', () => {
    document.body.innerHTML = '<textarea id="editor"><p>Math: </p></textarea>';
    RichText.attach('#editor');

    const editor = RichText._all()[0];
    const content = editor.content;

    // Set up selection
    const p = content.querySelector('p');
    const textNode = p.firstChild;
    const range = document.createRange();
    range.setStart(textNode, 6);
    range.setEnd(textNode, 6);
    const sel = document.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    // Mock prompt to return invalid LaTeX
    global.prompt = jest.fn(() => '\\invalid{latex}');

    // Don't mock KaTeX - let it handle the error naturally with throwOnError: false
    // This should result in KaTeX rendering an error message in the span

    // Execute math command
    editor.bus.exec('math:add');

    // Check that a math span was created
    const mathSpan = content.querySelector('.math');
    expect(mathSpan).toBeTruthy();
    // With throwOnError: false, KaTeX should still render something (possibly the original LaTeX)
    expect(mathSpan.textContent).toBeTruthy();
  });

  test('math command with cancelled prompt does nothing', () => {
    document.body.innerHTML = '<textarea id="editor"><p>Math: </p></textarea>';
    RichText.attach('#editor');

    const editor = RichText._all()[0];
    const content = editor.content;
    const originalHTML = content.innerHTML;

    // Mock prompt to return null (cancelled)
    global.prompt = jest.fn(() => null);

    // Execute math command
    editor.bus.exec('math:add');

    // Check that nothing changed
    expect(content.innerHTML).toBe(originalHTML);
  });
});
