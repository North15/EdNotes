import { strict as assert } from 'node:assert';
import { JSDOM } from 'jsdom';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const dom = new JSDOM(`<!DOCTYPE html><textarea id=\"t1\"></textarea>`, { url:'http://localhost/' });
global.window = dom.window; global.document = dom.window.document; global.performance = { now: (()=>{ let t=0; return ()=> (t+=50); })() };
global.NodeFilter = dom.window.NodeFilter; global.Node = dom.window.Node;

let ta, editorWrapper, content, sel;
beforeAll(async ()=>{
	const bundlePath = path.resolve('./src/EdNotes.RichText/wwwroot/editor/ednotes.richtext.bundle.js');
	await import(pathToFileURL(bundlePath).href);
	window.RichText.attach('#t1');
	ta = document.querySelector('#t1');
	editorWrapper = ta.nextSibling;
	content = editorWrapper.querySelector('.rtx-content');
	sel = window.getSelection();
});

test('block and list wrap', ()=>{
	content.innerHTML = '<p>Alpha Beta</p>';
	const p = content.querySelector('p');
	const r = document.createRange(); r.setStart(p.firstChild, 0); r.setEnd(p.firstChild, p.firstChild.textContent.length); sel.removeAllRanges(); sel.addRange(r);
	window.RichText.triggerSave();
	assert.match(ta.value, /Alpha Beta/);
	const h1Btn = [...editorWrapper.querySelectorAll('button')].find(b=>b.textContent==='H1');
	h1Btn.click();
	assert.match(content.innerHTML.toLowerCase(), /<h1>/, 'Converted to h1');
	const listBtn = [...editorWrapper.querySelectorAll('button')].find(b=>b.textContent==='•');
	const h1 = content.querySelector('h1');
	if(h1 && h1.firstChild){ const r2=document.createRange(); r2.setStart(h1.firstChild,0); r2.setEnd(h1.firstChild,h1.firstChild.textContent.length); sel.removeAllRanges(); sel.addRange(r2);} 
	listBtn.click();
	assert.match(content.innerHTML.toLowerCase(), /<ul>/, 'Wrapped in ul');
});
