import { strict as assert } from 'node:assert';
import { JSDOM } from 'jsdom';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const dom = new JSDOM(`<!DOCTYPE html><textarea id="t1"></textarea>`, { url:'http://localhost/' });
global.window=dom.window; global.document=dom.window.document; global.performance={ now: (()=>{ let t=0; return ()=> (t+=30); })() };
global.NodeFilter=dom.window.NodeFilter; global.Node=dom.window.Node;

let content, live;
beforeAll(async ()=>{
  const bundlePath = path.resolve('./src/EdNotes.RichText/wwwroot/editor/ednotes.richtext.bundle.js');
  await import(pathToFileURL(bundlePath).href);
  window.RichText.attach('#t1');
  const ta=document.querySelector('#t1');
  const wrap=ta.nextSibling; content=wrap.querySelector('.rtx-content'); live=wrap.querySelector('.rtx-live');
});

test('heading shortcut ctrl+alt+2', ()=>{
  content.innerHTML='<p>Heading Demo</p>';
  const p=content.querySelector('p');
  const sel=window.getSelection(); const r=document.createRange(); r.setStart(p.firstChild,0); r.setEnd(p.firstChild,p.firstChild.textContent.length); sel.removeAllRanges(); sel.addRange(r);
  const evt=new dom.window.KeyboardEvent('keydown',{ key:'2', ctrlKey:true, altKey:true });
  content.dispatchEvent(evt);
  assert.ok(/<h2>/i.test(content.innerHTML),'Converted to h2');
  // Friendly announcement form introduced in CommandBus exec
  assert.match(live.textContent,/Applied heading h2/i,'Live region updated with friendly heading message');
});