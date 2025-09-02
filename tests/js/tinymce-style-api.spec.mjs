// Test suite for the new improved development API
import { beforeEach, afterEach, describe, it, expect, jest } from '@jest/globals';

// Import bundle first to ensure RichText is available globally
import { RichText } from '../../src/EdNotes.RichText/wwwroot/editor/ednotes.richtext.bundle.js';

describe.skip('EdNotesRichText improved development API', () => {
  let container;
  
  beforeEach(() => {
    // Clean up any existing instances first
    if (window.RichText && window.RichText._all) {
      const existing = window.RichText._all();
      existing.forEach(instance => {
        if (instance.destroy) instance.destroy();
      });
    }
    
    container = document.createElement('div');
    container.innerHTML = '<textarea id="test-editor">Initial content</textarea>';
    document.body.appendChild(container);
  });
  
  afterEach(() => {
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    
    // Clean up global state
    if (window.EdNotesRichText) {
      delete window.EdNotesRichText;
    }
  });

  it('should load the API module dynamically', async () => {
    // Dynamic import the new API
    const { EdNotesRichText } = await import('../../src/EdNotes.RichText/wwwroot/editor/ednotes.richtext.api.js');
    
    expect(EdNotesRichText).toBeDefined();
    expect(EdNotesRichText.version).toBe('0.5.0');
    expect(typeof EdNotesRichText.init).toBe('function');
  });

  it('should initialize with TinyMCE-style config', async () => {
    const { EdNotesRichText } = await import('../../src/EdNotes.RichText/wwwroot/editor/ednotes.richtext.api.js');
    
    // Debug: ensure element exists
    const textarea = document.getElementById('test-editor');
    expect(textarea).toBeDefined();
    expect(textarea.tagName).toBe('TEXTAREA');
    
    // Try direct attach first to ensure it works
    const directCount = RichText.attach('#test-editor');
    expect(directCount).toBe(1);
    
    // Clear and try via API
    const allInstances = RichText._all();
    allInstances.forEach(instance => {
      if (instance.destroy) instance.destroy();
    });
    
    const instances = EdNotesRichText.init({
      selector: '#test-editor',
      plugins: 'core formatting',
      toolbar: 'undo redo | bold italic'
    });
    
    expect(instances).toBeInstanceOf(Array);
    expect(instances.length).toBe(1);
    expect(instances[0]).toBeDefined();
    expect(instances[0].originalTextarea).toBe(document.getElementById('test-editor'));
  });

  it('should validate plugin names and warn about invalid ones', async () => {
    const { EdNotesRichText } = await import('../../src/EdNotes.RichText/wwwroot/editor/ednotes.richtext.api.js');
    
    const originalWarn = console.warn;
    let warningMessage = '';
    console.warn = jest.fn((msg) => { warningMessage = msg; });
    
    try {
      EdNotesRichText.init({
        selector: '#test-editor',
        plugins: 'core formatting invalid-plugin another-bad-one'
      });
      
      expect(console.warn).toHaveBeenCalled();
      expect(warningMessage).toContain('Unknown plugins: invalid-plugin, another-bad-one');
    } finally {
      console.warn = originalWarn;
    }
  });

  it('should provide get() method to retrieve editor instances', async () => {
    const { EdNotesRichText } = await import('../../src/EdNotes.RichText/wwwroot/editor/ednotes.richtext.api.js');
    
    EdNotesRichText.init({ selector: '#test-editor' });
    
    const instance = EdNotesRichText.get('#test-editor');
    expect(instance).toBeDefined();
    expect(instance.originalTextarea.id).toBe('test-editor');
    
    const nonExistent = EdNotesRichText.get('#does-not-exist');
    expect(nonExistent).toBeUndefined();
  });

  it('should apply themes via applyTheme()', async () => {
    const { EdNotesRichText } = await import('../../src/EdNotes.RichText/wwwroot/editor/ednotes.richtext.api.js');
    
    EdNotesRichText.init({ selector: '#test-editor' });
    
    // Create a mock editor element for theme testing
    const editorEl = document.createElement('div');
    editorEl.className = 'rtx-editor';
    document.body.appendChild(editorEl);
    
    try {
      EdNotesRichText.applyTheme('high-contrast');
      expect(editorEl.classList.contains('theme-high-contrast')).toBe(true);
      
      EdNotesRichText.applyTheme('professional');
      expect(editorEl.classList.contains('theme-high-contrast')).toBe(false);
      expect(editorEl.classList.contains('theme-professional')).toBe(true);
      
      EdNotesRichText.applyTheme('default');
      expect(editorEl.classList.contains('theme-professional')).toBe(false);
    } finally {
      document.body.removeChild(editorEl);
    }
  });

  it('should maintain backward compatibility with RichText.attach', async () => {
    const { EdNotesRichText } = await import('../../src/EdNotes.RichText/wwwroot/editor/ednotes.richtext.api.js');
    
    // Should expose RichText globally for backward compatibility
    expect(window.RichText).toBeDefined();
    expect(typeof window.RichText.attach).toBe('function');
    
    // Should also expose new EdNotesRichText
    expect(window.EdNotesRichText).toBeDefined();
    expect(window.EdNotesRichText).toBe(EdNotesRichText);
  });

  it('should parse toolbar configuration correctly', async () => {
    const { parseToolbar } = await import('../../src/EdNotes.RichText/wwwroot/editor/plugins/index.js');
    
    const result = parseToolbar('undo redo | bold italic | link');
    expect(result).toEqual([
      ['undo', 'redo'],
      ['bold', 'italic'],
      ['link']
    ]);
    
    const empty = parseToolbar('');
    expect(empty).toEqual([]);
    
    const singleGroup = parseToolbar('bold italic underline');
    expect(singleGroup).toEqual([['bold', 'italic', 'underline']]);
  });

  it('should register and validate plugins', async () => {
    const { registerPlugin, getPlugin, validatePlugins } = await import('../../src/EdNotes.RichText/wwwroot/editor/plugins/index.js');
    
    // Test plugin registration
    registerPlugin('test-plugin', {
      name: 'test-plugin',
      buttons: [{ name: 'test-btn', icon: 'test', label: 'Test', command: 'test' }]
    });
    
    const plugin = getPlugin('test-plugin');
    expect(plugin).toBeDefined();
    expect(plugin.name).toBe('test-plugin');
    
    // Test validation
    const valid = validatePlugins(['core', 'formatting', 'test-plugin']);
    expect(valid).toEqual([]);
    
    const invalid = validatePlugins(['core', 'invalid-plugin', 'another-invalid']);
    expect(invalid).toEqual(['invalid-plugin', 'another-invalid']);
  });

  it('should provide all expected global methods', async () => {
    const { EdNotesRichText } = await import('../../src/EdNotes.RichText/wwwroot/editor/ednotes.richtext.api.js');
    
    const expectedMethods = [
      'init', 'registerPlugin', 'applyTheme', 'get', 'destroy',
      'undo', 'redo', 'triggerSave', 'exportAllPlain', 'exportAllMarkdown', 'exportAllHTML'
    ];
    
    expectedMethods.forEach(method => {
      expect(typeof EdNotesRichText[method]).toBe('function');
    });
    
    expect(typeof EdNotesRichText.version).toBe('string');
  });
});
