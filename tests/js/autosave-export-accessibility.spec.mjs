import { strict as assert } from 'node:assert';
import { createEditor } from './test-utils.mjs';
let autosaves=[], editor, live, now=0;
beforeEach(()=>{
  now=0; const realPerf=global.performance; global.performance={ now: ()=> now };
  const fakeIntervals=[]; function fakeSetInterval(fn, ms){ const id=fakeIntervals.length; fakeIntervals.push({ fn, ms, elapsed:0 }); return id; }
  editor = createEditor({ html:'<p></p>', options:{ autosaveIntervalMs:2000, onAutosave:v=> autosaves.push(v), _setInterval: fakeSetInterval } });
  live = editor.root.querySelector('.rtx-live'); editor.__intervals=fakeIntervals; editor.__restorePerf=()=>{ global.performance=realPerf; };
});
afterEach(()=>{ if(editor && editor.__restorePerf) editor.__restorePerf(); });

function tick(ms){ editor.__intervals.forEach(iv=>{ iv.elapsed+=ms; if(iv.elapsed>=iv.ms){ iv.elapsed=0; iv.fn(); } }); now += ms; }

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
