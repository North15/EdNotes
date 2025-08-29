import { strict as assert } from 'node:assert';
import { JSDOM } from 'jsdom';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

let now=0; const perf={ now: ()=> now };
const dom = new JSDOM(`<!DOCTYPE html><textarea id="t1"></textarea>`, { url:'http://localhost/' });
global.window=dom.window; global.document=dom.window.document; global.performance=perf; global.NodeFilter=dom.window.NodeFilter; global.Node=dom.window.Node;

let autosaves=[];
let editor, live;
beforeAll(async ()=>{
  const bundlePath = path.resolve('./src/EdNotes.RichText/wwwroot/editor/ednotes.richtext.bundle.js');
  await import(pathToFileURL(bundlePath).href);
  // Inject fake setInterval to control autosave
  const fakeIntervals=[];
  function fakeSetInterval(fn, ms){ const id=fakeIntervals.length; fakeIntervals.push({ fn, ms, elapsed:0 }); return id; }
  window.RichText.attach('#t1', { autosaveIntervalMs: 2000, onAutosave:v=> autosaves.push(v), _setInterval: fakeSetInterval });
  editor = window.RichText._all()[0];
  live = editor.root.querySelector('.rtx-live');
  // expose tick helper
  editor.__intervals = fakeIntervals;
});

function tick(ms){
  // Advance time and run any intervals crossing boundary
  editor.__intervals.forEach(iv=>{ iv.elapsed+=ms; if(iv.elapsed>=iv.ms){ iv.elapsed=0; iv.fn(); } });
  now += ms;
}

test('autosave triggers after interval when content changes', ()=>{
  autosaves.length=0;
  editor.content.innerHTML='<p>One</p>'; editor.bus.exec('noop'); // trigger value sync
  tick(1000); // not yet
  assert.equal(autosaves.length,0,'No autosave before interval');
  tick(1200); // cross 2s
  assert.equal(autosaves.length,1,'Autosave fired after interval');
  // No change -> no new autosave
  tick(2000);
  assert.equal(autosaves.length,1,'No autosave without changes');
  editor.content.innerHTML='<p>Two</p>'; editor.bus.exec('noop');
  tick(2000);
  assert.equal(autosaves.length,2,'Second autosave after change');
});

test('export plain & markdown basic mapping', ()=>{
  editor.content.innerHTML='<h1>Title</h1><p>Para <strong>Bold</strong></p><ul><li>Item</li></ul>';
  const plain = editor.exportPlainText();
  assert.ok(plain.includes('Title') && plain.includes('Para') && plain.includes('Item'), 'Plain text contains content');
  const md = editor.exportMarkdown();
  assert.ok(md.startsWith('# Title'), 'Heading mapped to markdown');
  assert.ok(md.includes('- Item'), 'List item mapped');
});

test('live region friendly message', ()=>{
  editor.content.innerHTML='<p>BoldMe</p>';
  const p=editor.content.querySelector('p');
  const sel=window.getSelection(); const r=document.createRange(); r.setStart(p.firstChild,0); r.setEnd(p.firstChild,p.firstChild.textContent.length); sel.removeAllRanges(); sel.addRange(r);
  const boldBtn=[...editor.root.querySelectorAll('button')].find(b=> b.dataset.cmd==='strong');
  boldBtn.click();
  assert.match(live.textContent,/Applied bold/i,'Friendly live region message');
});
