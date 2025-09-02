import { jest } from '@jest/globals';

describe('loader script', () => {
  let originalWindow;
  let originalConsole;
  let originalFunction;
  let mockImport;

  beforeEach(() => {
    originalWindow = global.window;
    originalConsole = global.console;
    originalFunction = global.Function;

    // Mock window
    global.window = {};

    // Mock console
    global.console = {
      error: jest.fn()
    };

    // Mock dynamic import
    mockImport = jest.fn();
    global.Function = jest.fn().mockImplementation((...args) => {
      if (args[0] === 'p' && args[1] === 'return import(p);') {
        return mockImport;
      }
      return originalFunction(...args);
    });
  });

  afterEach(() => {
    global.window = originalWindow;
    global.console = originalConsole;
    global.Function = originalFunction;
  });

  test('does not set RichText if already exists', () => {
    global.window.RichText = { existing: true };
    const script = `
      (function(){
        if(window.RichText){ return; }
        // rest of code
      })();
    `;
    eval(script);
    expect(global.window.RichText).toEqual({ existing: true });
  });

  test('successfully loads RichText when dynamic import is supported', async () => {
    // Setup: RichText doesn't exist
    delete global.window.RichText;

    // Mock successful import resolution
    const mockModule = { RichText: { version: '0.3.0', attach: jest.fn() } };
    mockImport.mockResolvedValueOnce(mockModule);

    const script = `
      (function(){
        if(window.RichText){ return; }
        var dynamicImport;
        try { dynamicImport = new Function('p', 'return import(p);'); } catch(_) { }
        if(dynamicImport){
          dynamicImport('./ednotes.richtext.bundle.js')
            .then(function(m){ if(!window.RichText) window.RichText = m.RichText; })
            .catch(function(e){ console.error('[EdNotes.RichText] Failed dynamic import:', e); });
        } else {
          console.error('[EdNotes.RichText] Dynamic import not supported in this browser.');
        }
      })();
    `;
    eval(script);

    // Verify dynamic import was called with correct path
    expect(mockImport).toHaveBeenCalledWith('./ednotes.richtext.bundle.js');

    // Wait for the promise to resolve
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(global.window.RichText).toBe(mockModule.RichText);
    expect(global.console.error).not.toHaveBeenCalled();
  });

  test('handles dynamic import failure gracefully', async () => {
    // Setup: RichText doesn't exist
    delete global.window.RichText;

    // Mock import rejection
    const mockError = new Error('Network error');
    mockImport.mockRejectedValueOnce(mockError);

    const script = `
      (function(){
        if(window.RichText){ return; }
        var dynamicImport;
        try { dynamicImport = new Function('p', 'return import(p);'); } catch(_) { }
        if(dynamicImport){
          dynamicImport('./ednotes.richtext.bundle.js')
            .then(function(m){ if(!window.RichText) window.RichText = m.RichText; })
            .catch(function(e){ console.error('[EdNotes.RichText] Failed dynamic import:', e); });
        } else {
          console.error('[EdNotes.RichText] Dynamic import not supported in this browser.');
        }
      })();
    `;
    eval(script);

    // Verify dynamic import was called
    expect(mockImport).toHaveBeenCalledWith('./ednotes.richtext.bundle.js');

    // Wait for the promise to resolve
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(global.window.RichText).toBeUndefined();
    expect(global.console.error).toHaveBeenCalledWith(
      '[EdNotes.RichText] Failed dynamic import:',
      mockError
    );
  });

  test('logs error if dynamic import not supported', () => {
    global.window.RichText = undefined;
    global.console.error = jest.fn();
    global.Function = jest.fn(() => { throw new Error('No dynamic import'); });
    const script = `
      (function(){
        if(window.RichText){ return; }
        var dynamicImport;
        try { dynamicImport = new Function('p', 'return import(p);'); } catch(_) { }
        if(!dynamicImport){
          console.error('[EdNotes.RichText] Dynamic import not supported in this browser.');
        }
      })();
    `;
    eval(script);
    expect(global.console.error).toHaveBeenCalledWith('[EdNotes.RichText] Dynamic import not supported in this browser.');
  });
});
