import { strict as assert } from 'node:assert';
import { JSDOM } from 'jsdom';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const dom = new JSDOM(`<!DOCTYPE html><textarea id="t1"></textarea>`, { url:'http://localhost/' });
global.window = dom.window; global.document = dom.window.document; global.performance = { now: (()=>{ let t=0; return ()=> (t+=100); })() };
global.NodeFilter = dom.window.NodeFilter; global.Node = dom.window.Node;

let ta, content, sel, toolbar;
beforeAll(async ()=>{
  const bundlePath = path.resolve('./src/EdNotes.RichText/wwwroot/editor/ednotes.richtext.bundle.js');
  await import(pathToFileURL(bundlePath).href);
  window.RichText.attach('#t1',{ historyLimit: 5, promptLink: ()=> 'https://example.com' });
  ta=document.querySelector('#t1');
  const wrap=ta.nextSibling; content=wrap.querySelector('.rtx-content'); toolbar=wrap.querySelector('.rtx-toolbar'); sel=window.getSelection();
});

function selectNodeText(el){ const r=document.createRange(); r.setStart(el.firstChild||el,0); r.setEnd(el.firstChild||el,(el.firstChild||el).textContent.length); sel.removeAllRanges(); sel.addRange(r);} 

test('list indent and outdent with tab', ()=>{
  content.innerHTML = '<ul><li>One</li><li>Two</li><li>Three</li></ul>';
  const liTwo = content.querySelectorAll('li')[1];
  selectNodeText(liTwo);
  // indent (Tab)
  const evtIndent = new dom.window.KeyboardEvent('keydown',{ key:'Tab' });
  content.dispatchEvent(evtIndent);
  assert.ok(liTwo.parentNode.parentNode.tagName.toLowerCase()==='li','Indented nested under previous li');
  // outdent (Shift+Tab)
  selectNodeText(liTwo);
  const evtOut = new dom.window.KeyboardEvent('keydown',{ key:'Tab', shiftKey:true });
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
  const inst = window.RichText._all()[0];
  assert.ok(inst.history.stack.length <=5,'History trimmed to limit');
});

test('link add/remove commands', ()=>{
  content.innerHTML='<p>LinkHere</p>';
  const p=content.querySelector('p'); selectNodeText(p);
  const addBtn=[...toolbar.querySelectorAll('button')].find(b=> b.dataset.cmd==='link:add');
  addBtn.click();
  assert.match(content.innerHTML,/<a /i,'Link inserted');
  const removeBtn=[...toolbar.querySelectorAll('button')].find(b=> b.dataset.cmd==='link:remove');
  const a=content.querySelector('a'); selectNodeText(a);
  removeBtn.click();
  assert.ok(!content.querySelector('a'),'Link removed');
});