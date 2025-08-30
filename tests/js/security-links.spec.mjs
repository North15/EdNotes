import { strict as assert } from 'node:assert';
import { createEditor } from './test-utils.mjs';
let inst, content;
beforeEach(()=>{ inst = createEditor({ html:'<p></p>' }); content = inst.content; });

test('strips disallowed javascript: (case + whitespace)', ()=>{
  content.innerHTML='<p><a href="  javascript:alert(1)">X</a></p>';
  // Trigger normalization via noop transaction
  inst.bus.exec('noop');
  const a=content.querySelector('a');
  assert.ok(!a.getAttribute('href'), 'href removed');
});

test('strips percent-encoded javascript protocol', ()=>{
  content.innerHTML='<p><a href="java%73cript:alert(1)">Y</a></p>';
  inst.bus.exec('noop');
  const a=content.querySelector('a');
  assert.ok(!a.getAttribute('href'), 'encoded href removed');
});
