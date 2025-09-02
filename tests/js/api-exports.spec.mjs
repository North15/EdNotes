import { jest } from '@jest/globals';
import { RichText } from '../../src/EdNotes.RichText/wwwroot/editor/ednotes.richtext.bundle.js';

describe('RichText API exports', () => {
  beforeEach(() => {
    // Create a fresh document body to avoid DOM carryover
    document.body = document.createElement('body');
    document.documentElement.appendChild(document.body);

    // Clear any existing RichText instances
    RichText._clearInstances();
  });

  test('exportAllPlain returns array of plain text', () => {
    document.body.innerHTML = '<textarea id="editor1">Hello world</textarea>';
    RichText.attach('#editor1');

    const results = RichText.exportAllPlain();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(1);
    expect(results[0]).toContain('Hello world');
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
    expect(RichText.version).toBe('0.5.0');
  });

  test('triggerSave calls triggerSave on all instances', () => {
    document.body.innerHTML = '<textarea id="editor1">Test1</textarea>';
    RichText.attach('#editor1');

    const editors = RichText._all();
    const mockSave = jest.fn();
    editors.forEach(editor => {
      editor.triggerSave = mockSave;
    });

    RichText.triggerSave();
    expect(mockSave).toHaveBeenCalledTimes(1);
  });

  test('undo and redo call methods on all instances', () => {
    document.body.innerHTML = '<textarea id="editor1">Test1</textarea>';
    RichText.attach('#editor1');

    const mockUndo = jest.fn();
    const mockRedo = jest.fn();
    const editors = RichText._all();
    editors.forEach(editor => {
      editor.undo = mockUndo;
      editor.redo = mockRedo;
    });

    RichText.undo();
    RichText.redo();

    expect(mockUndo).toHaveBeenCalledTimes(1);
    expect(mockRedo).toHaveBeenCalledTimes(1);
  });
});
