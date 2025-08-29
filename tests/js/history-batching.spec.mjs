import { strict as assert } from 'node:assert';
import { JSDOM } from 'jsdom';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Custom performance.now we can advance manually
let current = 0;
const perf = { now: ()=> current };

const dom = new JSDOM(`<!DOCTYPE html><textarea id="t1"></textarea>`, { url:'http://localhost/' });
global.window = dom.window; global.document = dom.window.document; global.performance = perf;
global.NodeFilter = dom.window.NodeFilter; global.Node = dom.window.Node;

let editor;
beforeAll(async ()=>{
  const bundlePath = path.resolve('./src/EdNotes.RichText/wwwroot/editor/ednotes.richtext.bundle.js');
  await import(pathToFileURL(bundlePath).href);
  window.RichText.attach('#t1');
  editor = window.RichText._all()[0];
});

function typeSim(text){
  // Directly mutate innerHTML to simulate typing then dispatch input event
  editor.content.innerHTML = `<p>${text}</p>`;
  const evt = new dom.window.Event('input', { bubbles:true });
  editor.content.dispatchEvent(evt);
}

test('history batching within idle gap', ()=>{
  current = 0;
  typeSim('A');
  const initialLen = editor.history.stack.length; // baseline after first typed snapshot
  current += 100; // < 600ms gap
  typeSim('AB');
  current += 200; // still < 600 since last
  typeSim('ABC');
  // Should still be one additional history entry max relative to initialLen
  assert.ok(editor.history.stack.length === initialLen, 'Batched changes within gap (no new snapshots)');
  // Advance beyond gap
  current += 1000;
  typeSim('ABCD');
  assert.ok(editor.history.stack.length === initialLen + 1, 'Exactly one new snapshot after idle gap');
});
