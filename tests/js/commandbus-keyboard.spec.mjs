import { jest } from '@jest/globals';
import { EditorCore } from '../../src/EdNotes.RichText/wwwroot/editor/core/CommandBus.js';

describe('CommandBus keyboard shortcuts and list handling', () => {
  let textarea;
  let editor;
  let mockBus;

  beforeEach(() => {
    textarea = document.createElement('textarea');
    textarea.value = '<p>Test content</p>';
    document.body.appendChild(textarea);

    editor = new EditorCore(textarea, { onChange: jest.fn() });
    // Mock the bus.exec method instead of replacing the entire bus
    jest.spyOn(editor.bus, 'exec').mockImplementation(() => true);
  });

  afterEach(() => {
    document.body.removeChild(textarea);
  });

  test('handles Ctrl+Z undo shortcut', () => {
    const event = new KeyboardEvent('keydown', {
      key: 'z',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
      shiftKey: false,
      bubbles: true,
      cancelable: true
    });

    jest.spyOn(editor, 'undo');
    editor.content.dispatchEvent(event);

    expect(editor.undo).toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
  });

  test('handles Ctrl+Shift+Z redo shortcut', () => {
    const event = new KeyboardEvent('keydown', {
      key: 'z',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
      shiftKey: true
    });

    jest.spyOn(editor, 'redo');
    editor.content.dispatchEvent(event);

    expect(editor.redo).toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
  });

  test('handles Ctrl+B bold shortcut', () => {
    const event = new KeyboardEvent('keydown', {
      key: 'b',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
      bubbles: true,
      cancelable: true
    });

    editor.content.dispatchEvent(event);

    expect(editor.bus.exec).toHaveBeenCalledWith('strong');
    expect(event.defaultPrevented).toBe(true);
  });

  test('handles Ctrl+I italic shortcut', () => {
    const event = new KeyboardEvent('keydown', {
      key: 'i',
      ctrlKey: true,
      bubbles: true,
      cancelable: true
    });

    editor.content.dispatchEvent(event);

    expect(editor.bus.exec).toHaveBeenCalledWith('em');
    expect(event.defaultPrevented).toBe(true);
  });

  test('handles Ctrl+U underline shortcut', () => {
    const event = new KeyboardEvent('keydown', {
      key: 'u',
      ctrlKey: true,
      bubbles: true,
      cancelable: true
    });

    editor.content.dispatchEvent(event);

    expect(editor.bus.exec).toHaveBeenCalledWith('u');
    expect(event.defaultPrevented).toBe(true);
  });

  test('handles Ctrl+Alt+1 heading shortcut', () => {
    const event = new KeyboardEvent('keydown', {
      key: '1',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
      altKey: true,
      bubbles: true,
      cancelable: true
    });

    editor.content.dispatchEvent(event);

    expect(editor.bus.exec).toHaveBeenCalledWith('block:h1');
    expect(event.defaultPrevented).toBe(true);
  });

  test('handles Ctrl+Alt+0 paragraph shortcut', () => {
    const event = new KeyboardEvent('keydown', {
      key: '0',
      ctrlKey: true,
      altKey: true,
      bubbles: true,
      cancelable: true
    });

    editor.content.dispatchEvent(event);

    expect(editor.bus.exec).toHaveBeenCalledWith('block:p');
    expect(event.defaultPrevented).toBe(true);
  });

  test('handles task list toggle with Enter key', () => {
    // Set up content with task list
    editor.content.innerHTML = '<ul data-list="task"><li data-checked="false">Task item</li></ul>';

    // Set up selection inside the li
    const li = editor.content.querySelector('li');
    const range = document.createRange();
    range.setStart(li, 0);
    range.setEnd(li, 0);
    const sel = document.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true
    });

    editor._pushHistory = jest.fn();
    editor.content.dispatchEvent(event);

    expect(li.getAttribute('data-checked')).toBe('true');
    expect(editor._pushHistory).toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
  });

  test('handles task list toggle with Space key', () => {
    // Set up content with task list
    editor.content.innerHTML = '<ul data-list="task"><li data-checked="true">Task item</li></ul>';

    // Set up selection inside the li
    const li = editor.content.querySelector('li');
    const range = document.createRange();
    range.setStart(li, 0);
    range.setEnd(li, 0);
    const sel = document.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    const event = new KeyboardEvent('keydown', {
      key: ' ',
      bubbles: true,
      cancelable: true
    });

    editor._pushHistory = jest.fn();
    editor.content.dispatchEvent(event);

    expect(li.getAttribute('data-checked')).toBe('false');
    expect(editor._pushHistory).toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
  });

  test('ignores task list toggle when not in task list', () => {
    // Set up content with regular list
    editor.content.innerHTML = '<ul><li>Regular item</li></ul>';

    // Set up selection inside the li
    const li = editor.content.querySelector('li');
    const range = document.createRange();
    range.setStart(li, 0);
    range.setEnd(li, 0);
    const sel = document.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    const event = new KeyboardEvent('keydown', {
      key: 'Enter'
    });

    const originalChecked = li.getAttribute('data-checked');
    editor.content.dispatchEvent(event);

    expect(li.getAttribute('data-checked')).toBe(originalChecked);
    expect(event.defaultPrevented).toBe(false);
  });

  test('handles Tab key for list indentation', () => {
    const event = new KeyboardEvent('keydown', {
      key: 'Tab'
    });

    editor._maybeHandleListIndent = jest.fn().mockReturnValue(true);
    editor.content.dispatchEvent(event);

    expect(editor._maybeHandleListIndent).toHaveBeenCalledWith(event);
  });

  test('ignores other keys', () => {
    const event = new KeyboardEvent('keydown', {
      key: 'a'
    });

    editor.content.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(editor.bus.exec).not.toHaveBeenCalled();
  });
});
