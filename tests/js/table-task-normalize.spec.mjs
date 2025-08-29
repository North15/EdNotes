import { strict as assert } from 'node:assert';
import { JSDOM } from 'jsdom';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { normalize } from '../../src/EdNotes.RichText/wwwroot/editor/core/Normalizer.js';

const dom = new JSDOM(`<!DOCTYPE html><textarea id="t1"></textarea>`, { url:'http://localhost/' });
global.window = dom.window; global.document = dom.window.document; global.performance = { now: (()=>{ let t=0; return ()=> (t+=50); })() };
global.NodeFilter = dom.window.NodeFilter; global.Node = dom.window.Node;

beforeAll(async ()=>{
  const bundlePath = path.resolve('./src/EdNotes.RichText/wwwroot/editor/ednotes.richtext.bundle.js');
  await import(pathToFileURL(bundlePath).href);
  window.RichText.attach('#t1');
});

test('table stray rows moved into tbody and disallowed removed', ()=>{
  const wrap=document.createElement('div');
  wrap.innerHTML = '<table><tr><td>X</td></tr><p>Bad</p><tbody><tr><td>Y</td><script>evil()</script></tr></tbody></table>';
  normalize(wrap);
  const html = wrap.innerHTML.toLowerCase();
  assert.match(html, /<tbody>/, 'Tbody ensured');
  assert.ok(!html.includes('<script'), 'Script removed');
  // Paragraph inside table is unwrapped; ensure no <p> inside table fragment
  assert.ok(!/table>.*<p>bad/.test(html), 'Paragraph not retained inside table structure');
});

test('task list command sets defaults', ()=>{
  const inst = window.RichText._all()[0];
  inst.content.innerHTML='<p>Task One</p>';
  const p=inst.content.querySelector('p');
  const sel=window.getSelection(); const r=document.createRange(); r.setStart(p.firstChild,0); r.setEnd(p.firstChild,p.firstChild.textContent.length); sel.removeAllRanges(); sel.addRange(r);
  const btn=[...inst.root.querySelectorAll('button')].find(b=> b.dataset.cmd==='list:task');
  btn.click();
  const ul=inst.content.querySelector('ul[data-list="task"]');
  assert.ok(ul,'Task list created');
  const li=ul.querySelector('li');
  assert.equal(li.getAttribute('data-checked'),'false','Default data-checked');
});
