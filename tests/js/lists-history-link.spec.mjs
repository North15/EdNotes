import { strict as assert } from 'node:assert';
import { createEditor, selectAll } from './test-utils.mjs';
let inst, content, sel;
beforeEach(()=>{ inst = createEditor({ html:'<p></p>', options:{ historyLimit:5, promptLink: ()=> 'https://example.com' } }); content = inst.content; sel=document.getSelection(); });

function selectNodeText(el){ const r=document.createRange(); r.setStart(el.firstChild||el,0); r.setEnd(el.firstChild||el,(el.firstChild||el).textContent.length); sel.removeAllRanges(); sel.addRange(r);} 

test('list indent and outdent with tab', ()=>{
  content.innerHTML = '<ul><li>One</li><li>Two</li><li>Three</li></ul>';
  const liTwo = content.querySelectorAll('li')[1];
  selectNodeText(liTwo);
  // indent (Tab)
  const evtIndent = new KeyboardEvent('keydown',{ key:'Tab' });
  content.dispatchEvent(evtIndent);
  assert.ok(liTwo.parentNode.parentNode.tagName.toLowerCase()==='li','Indented nested under previous li');
  // outdent (Shift+Tab)
  selectNodeText(liTwo);
  const evtOut = new KeyboardEvent('keydown',{ key:'Tab', shiftKey:true });
  content.dispatchEvent(evtOut);
  // After outdent attempt at top-level, stays nested under root ul
  assert.ok(liTwo.parentNode === content.querySelector('ul'),'Remains at top level after outdent');
});

test('history limit enforced', ()=>{
  content.innerHTML='<p>Start</p>';
  for(let i=0;i<10;i++){
    content.innerHTML = `<p>Entry ${i}</p>`;
    window.RichText.triggerSave();
  }
  assert.ok(inst.history.stack.length <=5,'History trimmed to limit');
});

test('link add/remove commands', ()=>{
  content.innerHTML='<p>LinkHere</p>';
  const p=content.querySelector('p'); selectNodeText(p);
  inst.bus.exec('link:add');
  assert.match(content.innerHTML,/<a /i,'Link inserted');
  const a=content.querySelector('a'); selectNodeText(a); inst.bus.exec('link:remove');
  assert.ok(!content.querySelector('a'),'Link removed');
});