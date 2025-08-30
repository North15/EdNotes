import { strict as assert } from 'node:assert';
import { normalize } from '../../src/EdNotes.RichText/wwwroot/editor/core/Normalizer.js';
import { createEditor, selectAll } from './test-utils.mjs';

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
  const inst = createEditor({ html:'<p>Task One</p>' });
  const p=inst.content.querySelector('p'); selectAll(p);
  inst.bus.exec('list:task');
  const ul=inst.content.querySelector('ul[data-list="task"]');
  assert.ok(ul,'Task list created');
  const li=ul.querySelector('li');
  assert.equal(li.getAttribute('data-checked'),'false','Default data-checked');
});
