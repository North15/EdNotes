import { jest } from '@jest/globals';

describe('loader script', () => {
  let originalWindow;
  beforeEach(() => {
    originalWindow = global.window;
    global.window = { console: { error: jest.fn() } };
  });
  afterEach(() => {
    global.window = originalWindow;
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

  test('logs error if dynamic import not supported', () => {
    global.window.RichText = undefined;
    global.window.console.error = jest.fn();
    const originalFunction = global.Function;
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
    expect(global.window.console.error).toHaveBeenCalledWith('[EdNotes.RichText] Dynamic import not supported in this browser.');
    global.Function = originalFunction;
  });
});
