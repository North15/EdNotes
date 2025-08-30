import { RichText } from '../../src/EdNotes.RichText/wwwroot/editor/ednotes.richtext.bundle.js';

function collapseAt(node, offset){
  const sel=document.getSelection(); const r=document.createRange();
  r.setStart(node, Math.min(offset, node.length||0)); r.collapse(true);
  sel.removeAllRanges(); sel.addRange(r);
}
function selectRange(node,start,end){ const sel=document.getSelection(); const r=document.createRange(); r.setStart(node,start); r.setEnd(node, Math.min(end,node.length||0)); if(r.collapsed){ r.setEnd(node, Math.min(start+1, node.length||0)); } sel.removeAllRanges(); sel.addRange(r);} 

describe('command coverage (light)', ()=>{
  function create(){ document.body.innerHTML=''; const ta=document.createElement('textarea'); ta.id='tx'; ta.value='<p>Hello world</p>'; document.body.appendChild(ta); RichText.attach('#tx',{ promptLink: ()=>'https://example.com' }); return RichText._all().slice(-1)[0]; }
  test('link add/remove', ()=>{ const ed=create(); const p=ed.content.querySelector('p'); collapseAt(p.firstChild,5); ed.bus.exec('link:add'); expect(ed.content.querySelector('a')).toBeTruthy(); collapseAt(ed.content.querySelector('a').firstChild,0); ed.bus.exec('link:remove'); expect(ed.content.querySelector('a')).toBeFalsy(); });
  test('block h2 then no-op second time', ()=>{ const ed=create(); const p=ed.content.querySelector('p'); expect(p).toBeTruthy(); expect(p.firstChild.nodeType).toBe(3); selectRange(p.firstChild,0,5); ed.bus.exec('block:h2'); const h2=ed.content.querySelector('h2'); expect(h2).toBeTruthy(); const before=h2.outerHTML; selectRange(h2.firstChild,0,1); ed.bus.exec('block:h2'); expect(h2.outerHTML).toBe(before); });
  test('list:ul toggle', ()=>{ const ed=create(); const p=ed.content.querySelector('p'); selectRange(p.firstChild,0,5); ed.bus.exec('list:ul'); expect(ed.content.querySelector('ul li')).toBeTruthy(); const liText=ed.content.querySelector('ul li').firstChild; selectRange(liText,0,liText.length||0); ed.bus.exec('list:ul'); expect(ed.content.querySelectorAll('p').length).toBeGreaterThan(0); });
  test('task list create + toggle off', ()=>{ const ed=create(); const p=ed.content.querySelector('p'); collapseAt(p.firstChild,0); ed.bus.exec('list:task'); expect(ed.content.querySelector('ul[data-list="task"]')).toBeTruthy(); collapseAt(ed.content.querySelector('ul[data-list="task"]').querySelector('li').firstChild,0); ed.bus.exec('list:task'); expect(ed.content.querySelector('ul[data-list="task"]')).toBeFalsy(); });
});