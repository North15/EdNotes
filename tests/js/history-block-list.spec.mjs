import { strict as assert } from 'node:assert';
import { createEditor, selectAll } from './test-utils.mjs';
let inst, content, sel;
beforeEach(()=>{ inst = createEditor({ html:'<p>Alpha Beta</p>' }); content=inst.content; sel=document.getSelection(); });

test('block and list wrap', ()=>{
	const p = content.querySelector('p'); selectAll(p); inst.bus.exec('block:h1');
	assert.match(content.innerHTML.toLowerCase(), /<h1>/, 'Converted to h1');
	const h1 = content.querySelector('h1'); if(h1) selectAll(h1); inst.bus.exec('list:ul');
	assert.match(content.innerHTML.toLowerCase(), /<ul>/, 'Wrapped in ul');
});
