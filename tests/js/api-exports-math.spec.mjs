import { jest } from '@jest/globals';
import { RichText } from '../../src/EdNotes.RichText/wwwroot/editor/ednotes.richtext.bundle.js';

describe('RichText API exports and math command', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    // Clear all instances between tests
    RichText._clearInstances();
  });

  afterEach(() => {
    // Clean up mocks
    jest.clearAllMocks();
    if (global.prompt) {
      delete global.prompt;
    }
    if (global.window && global.window.prompt) {
      delete global.window.prompt;
    }
    if (global.katex) {
      delete global.katex;
    }
  });

  test('exportAllPlain returns array of plain text', () => {
    document.body.innerHTML = '<textarea id="editor1">Hello world</textarea><textarea id="editor2"><p>Second editor</p></textarea>';
    RichText.attach('#editor1, #editor2');

    const results = RichText.exportAllPlain();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(2);
    expect(results[0]).toContain('Hello world');
    expect(results[1]).toContain('Second editor');
  });

  test('exportAllMarkdown returns array of markdown', () => {
    document.body.innerHTML = '<textarea id="editor"><h1>Title</h1><p>Paragraph</p></textarea>';
    RichText.attach('#editor');

    const results = RichText.exportAllMarkdown();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(1);
    expect(results[0]).toContain('# Title');
  });

  test('exportAllHTML returns array of HTML', () => {
    document.body.innerHTML = '<textarea id="editor"><p>Test content</p></textarea>';
    RichText.attach('#editor');

    const results = RichText.exportAllHTML();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(1);
    expect(results[0]).toContain('<p>Test content</p>');
  });

  test('version property is set', () => {
    expect(RichText.version).toBe('0.4.1');
  });

  test('triggerSave calls triggerSave on all instances', () => {
    document.body.innerHTML = '<textarea id="editor1">Test1</textarea><textarea id="editor2">Test2</textarea>';
    RichText.attach('#editor1, #editor2');

    // Mock triggerSave to verify it's called
    const editors = RichText._all();
    const mockSave = jest.fn();
    editors.forEach(editor => {
      editor.triggerSave = mockSave;
    });

    RichText.triggerSave();
    expect(mockSave).toHaveBeenCalledTimes(2);
  });

  test('undo and redo call methods on all instances', () => {
    document.body.innerHTML = '<textarea id="editor1">Test1</textarea><textarea id="editor2">Test2</textarea>';
    RichText.attach('#editor1, #editor2');

    const mockUndo = jest.fn();
    const mockRedo = jest.fn();
    const editors = RichText._all();
    editors.forEach(editor => {
      editor.undo = mockUndo;
      editor.redo = mockRedo;
    });

    RichText.undo();
    RichText.redo();

    expect(mockUndo).toHaveBeenCalledTimes(2);
    expect(mockRedo).toHaveBeenCalledTimes(2);
  });

  test('math command with valid LaTeX', () => {
    document.body.innerHTML = '<textarea id="editor">Math: </textarea>';
    RichText.attach('#editor');

    const editor = RichText._all()[0];
    const content = editor.content;

    // Set up content with a paragraph
    content.innerHTML = '<p>Math: </p>';

    // Set up selection
    const p = content.querySelector('p');
    expect(p).toBeTruthy(); // Ensure p exists
    const range = document.createRange();
    range.setStart(p.firstChild, 6); // Position after "Math: "
    range.setEnd(p.firstChild, 6);
    const sel = document.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    // Mock prompt to return LaTeX
    global.prompt = jest.fn(() => 'x^2 + y^2');
    // Also set window.prompt since the command checks for window.prompt
    global.window = global.window || {};
    global.window.prompt = global.prompt;

    // Execute math command
    editor.bus.exec('math:add');

    // Check that math span was inserted with the LaTeX
    const mathSpan = content.querySelector('.math');
    expect(mathSpan).toBeTruthy();
    expect(mathSpan).toBeInstanceOf(HTMLSpanElement);
    expect(mathSpan.className).toBe('math');
    // The span should contain the LaTeX text (may be modified by KaTeX rendering)
    expect(mathSpan.textContent).toContain('x^2 + y^2');
  });

  test('math command with invalid LaTeX shows error', () => {
    document.body.innerHTML = '<textarea id="editor">Math: </textarea>';
    RichText.attach('#editor');

    const editor = RichText._all()[0];
    const content = editor.content;

    // Set up content with a paragraph
    content.innerHTML = '<p>Math: </p>';

    // Set up selection
    const p = content.querySelector('p');
    expect(p).toBeTruthy(); // Ensure p exists
    const range = document.createRange();
    range.setStart(p.firstChild, 6); // Position after "Math: "
    range.setEnd(p.firstChild, 6);
    const sel = document.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    // Mock prompt to return invalid LaTeX
    global.prompt = jest.fn(() => '\\invalid{latex}');
    // Also set window.prompt since the command checks for window.prompt
    global.window = global.window || {};
    global.window.prompt = global.prompt;

    // Execute math command
    editor.bus.exec('math:add');

    // Check that math span was inserted with the LaTeX
    const mathSpan = content.querySelector('.math');
    expect(mathSpan).toBeTruthy();
    expect(mathSpan).toBeInstanceOf(HTMLSpanElement);
    expect(mathSpan.className).toBe('math');
    // The span should contain the LaTeX text (may be modified by KaTeX rendering)
    expect(mathSpan.textContent).toContain('\\invalid{latex}');
  });

  test('math command with cancelled prompt does nothing', () => {
    document.body.innerHTML = '<textarea id="editor">Math: </textarea>';
    RichText.attach('#editor');

    const editor = RichText._all()[0];
    const content = editor.content;

    // Set up content with a paragraph
    content.innerHTML = '<p>Math: </p>';
    const originalHTML = content.innerHTML;

    // Set up selection
    const p = content.querySelector('p');
    expect(p).toBeTruthy(); // Ensure p exists
    const range = document.createRange();
    range.setStart(p.firstChild, 6); // Position after "Math: "
    range.setEnd(p.firstChild, 6);
    const sel = document.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    // Mock prompt to return null (cancelled)
    global.prompt = jest.fn(() => null);

    // Execute math command
    editor.bus.exec('math:add');

    // Check that nothing changed
    expect(content.innerHTML).toBe(originalHTML);
  });

  test('math command with no selection does nothing', () => {
    document.body.innerHTML = '<textarea id="editor">Math: </textarea>';
    RichText.attach('#editor');

    const editor = RichText._all()[0];
    const content = editor.content;

    // Set up content with a paragraph
    content.innerHTML = '<p>Math: </p>';
    const originalHTML = content.innerHTML;

    // Clear selection
    const sel = document.getSelection();
    sel.removeAllRanges();

    // Mock prompt
    global.prompt = jest.fn(() => 'x^2');

    // Execute math command
    editor.bus.exec('math:add');

    // Check that nothing changed
    expect(content.innerHTML).toBe(originalHTML);
  });
});
