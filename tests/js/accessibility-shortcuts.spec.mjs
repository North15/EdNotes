import { strict as assert } from 'node:assert';
import { createEditor } from './test-utils.mjs';
let inst, content, live;
beforeEach(()=>{ inst=createEditor({ html:'<p>Heading Demo</p>' }); content=inst.content; live=inst.root.querySelector('.rtx-live'); });

test('heading shortcut ctrl+alt+2', ()=>{
  const p=content.querySelector('p'); const sel=window.getSelection(); const r=document.createRange(); r.setStart(p.firstChild,0); r.setEnd(p.firstChild,p.firstChild.textContent.length); sel.removeAllRanges(); sel.addRange(r);
  const evt=new KeyboardEvent('keydown',{ key:'2', ctrlKey:true, altKey:true });
  content.dispatchEvent(evt);
  assert.ok(/<h2>/i.test(content.innerHTML),'Converted to h2');
  // Friendly announcement form introduced in CommandBus exec
  assert.match(live.textContent,/Applied heading h2/i,'Live region updated with friendly heading message');
});