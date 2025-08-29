import { strict as assert } from 'node:assert';
import { JSDOM } from 'jsdom';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const dom = new JSDOM(`<!DOCTYPE html><textarea id=\"t1\"></textarea>`, { url:'http://localhost/' });
global.window = dom.window; global.document = dom.window.document; global.performance = { now: (()=>{ let t=0; return ()=> (t+=50); })() };
global.NodeFilter = dom.window.NodeFilter; global.Node = dom.window.Node;
import { normalize } from '../../src/EdNotes.RichText/wwwroot/editor/core/Normalizer.js';

let ta, content;
beforeAll(async ()=>{
	const bundlePath = path.resolve('./src/EdNotes.RichText/wwwroot/editor/ednotes.richtext.bundle.js');
	await import(pathToFileURL(bundlePath).href);
	window.RichText.attach('#t1');
	ta = document.querySelector('#t1');
	const editorWrapper = ta.nextSibling;
	content = editorWrapper.querySelector('.rtx-content');
});

test('paste normalization', ()=>{
	const pasteHtml = '<div><h2 style="color:red">Hello<script>alert(1)</script><span>World</span></h2><iframe src="http://evil"/><p onclick="evil()">Para <em>Good</em></p></div>';
	content.innerHTML = pasteHtml;
	normalize(content);
	window.RichText.triggerSave();
	const v = ta.value.toLowerCase();
	assert.ok(!v.includes('<script'), 'Script tag removed');
	assert.ok(!v.includes('<iframe'), 'Iframe tag removed');
	assert.ok(!v.includes('onclick'), 'Event handler attribute stripped');
	assert.ok(!v.includes('style='), 'Inline style stripped');
	assert.ok(v.includes('<h2>') || v.includes('<p>'), 'Allowed block retained');
});
