import { strict as assert } from 'node:assert';
import { JSDOM } from 'jsdom';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

let content;
beforeAll(async ()=>{
  const dom = new JSDOM(`<!DOCTYPE html><textarea id="t1"></textarea>`, { url:'http://localhost/' });
  global.window=dom.window; global.document=dom.window.document; global.performance={ now: (()=>{ let t=0; return ()=> (t+=30); })() };
  global.NodeFilter = dom.window.NodeFilter; global.Node = dom.window.Node;
  const bundlePath = path.resolve('./src/EdNotes.RichText/wwwroot/editor/ednotes.richtext.bundle.js');
  await import(pathToFileURL(bundlePath).href);
  window.RichText.attach('#t1');
  const ta=document.querySelector('#t1');
  const wrap=ta.nextSibling; content=wrap.querySelector('.rtx-content');
});

test('strips disallowed javascript: (case + whitespace)', ()=>{
  content.innerHTML='<p><a href="  javascript:alert(1)">X</a></p>';
  // Trigger normalization via noop transaction
  window.RichText._all()[0].bus.exec('noop');
  const a=content.querySelector('a');
  assert.ok(!a.getAttribute('href'), 'href removed');
});

test('strips percent-encoded javascript protocol', ()=>{
  content.innerHTML='<p><a href="java%73cript:alert(1)">Y</a></p>';
  window.RichText._all()[0].bus.exec('noop');
  const a=content.querySelector('a');
  assert.ok(!a.getAttribute('href'), 'encoded href removed');
});
