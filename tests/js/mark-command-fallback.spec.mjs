import { jest } from '@jest/globals';
import { markCommand } from '../../src/EdNotes.RichText/wwwroot/editor/core/CommandBus.js';

describe('markCommand fallback implementation', () => {
  let mockExecCommand;
  let originalExecCommand;

  beforeEach(() => {
    document.body.innerHTML = '<div class="rtx-content" contenteditable="true"><p>Test content here</p></div>';

    // Mock document.execCommand
    originalExecCommand = document.execCommand;
    mockExecCommand = jest.fn();
    document.execCommand = mockExecCommand;
  });

  afterEach(() => {
    document.execCommand = originalExecCommand;
    document.body.innerHTML = '';
  });

  test('uses native execCommand when available for bold', () => {
    mockExecCommand.mockReturnValue(true);

    const command = markCommand('strong');
    const mockEditor = { content: document.querySelector('.rtx-content') };

    command(mockEditor);

    expect(mockExecCommand).toHaveBeenCalledWith('bold');
  });

  test('uses native execCommand when available for italic', () => {
    mockExecCommand.mockReturnValue(true);

    const command = markCommand('em');
    const mockEditor = { content: document.querySelector('.rtx-content') };

    command(mockEditor);

    expect(mockExecCommand).toHaveBeenCalledWith('italic');
  });

  test('uses native execCommand when available for underline', () => {
    mockExecCommand.mockReturnValue(true);

    const command = markCommand('u');
    const mockEditor = { content: document.querySelector('.rtx-content') };

    command(mockEditor);

    expect(mockExecCommand).toHaveBeenCalledWith('underline');
  });

  test('falls back when execCommand throws error', () => {
    mockExecCommand.mockImplementation(() => {
      throw new Error('Command failed');
    });

    const command = markCommand('strong');
    const mockEditor = { content: document.querySelector('.rtx-content') };

    // Set up selection
    const p = document.querySelector('p');
    const range = document.createRange();
    range.setStart(p.firstChild, 0);
    range.setEnd(p.firstChild, 4); // Select "Test"
    const sel = document.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    command(mockEditor);

    // Should have wrapped "Test" in strong tag
    expect(document.querySelector('strong')).toBeTruthy();
    expect(document.querySelector('strong').textContent).toBe('Test');
  });

  test('falls back when execCommand not available', () => {
    document.execCommand = undefined;

    const command = markCommand('strong');
    const mockEditor = { content: document.querySelector('.rtx-content') };

    // Set up selection
    const p = document.querySelector('p');
    const range = document.createRange();
    range.setStart(p.firstChild, 0);
    range.setEnd(p.firstChild, 4); // Select "Test"
    const sel = document.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    command(mockEditor);

    // Should have wrapped "Test" in strong tag
    expect(document.querySelector('strong')).toBeTruthy();
    expect(document.querySelector('strong').textContent).toBe('Test');
  });

  test('unwraps existing mark when same tag selected', () => {
    document.execCommand = undefined;

    const command = markCommand('strong');
    const mockEditor = { content: document.querySelector('.rtx-content') };

    // Set up content with existing strong tag
    document.querySelector('.rtx-content').innerHTML = '<p><strong>Test</strong> content here</p>';

    // Select the strong element
    const strong = document.querySelector('strong');
    const range = document.createRange();
    range.selectNodeContents(strong);
    const sel = document.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    command(mockEditor);

    // Should have unwrapped the strong tag
    expect(document.querySelector('strong')).toBeFalsy();
    expect(document.querySelector('p').textContent).toBe('Test content here');
  });

  test('does nothing when selection is collapsed', () => {
    document.execCommand = undefined;

    const command = markCommand('strong');
    const mockEditor = { content: document.querySelector('.rtx-content') };

    // Set up collapsed selection
    const p = document.querySelector('p');
    const range = document.createRange();
    range.setStart(p.firstChild, 0);
    range.setEnd(p.firstChild, 0); // Collapsed
    const sel = document.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    const originalHTML = document.querySelector('.rtx-content').innerHTML;

    command(mockEditor);

    // Should not have changed anything
    expect(document.querySelector('.rtx-content').innerHTML).toBe(originalHTML);
  });

  test('does nothing when no selection', () => {
    document.execCommand = undefined;

    const command = markCommand('strong');
    const mockEditor = { content: document.querySelector('.rtx-content') };

    // Clear selection
    const sel = document.getSelection();
    sel.removeAllRanges();

    const originalHTML = document.querySelector('.rtx-content').innerHTML;

    command(mockEditor);

    // Should not have changed anything
    expect(document.querySelector('.rtx-content').innerHTML).toBe(originalHTML);
  });
});
