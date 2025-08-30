import { RichText } from '../../src/EdNotes.RichText/wwwroot/editor/ednotes.richtext.bundle.js';

function setup(initial='<p>One</p>'){
  document.body.innerHTML='';
  const ta=document.createElement('textarea'); ta.id='hx'; ta.value=initial; document.body.appendChild(ta);
  RichText.attach('#hx', {});
  return RichText._all().slice(-1)[0];
}

describe('history & undo/redo', ()=>{
  test('pushes new history entries after idle gap and trims overflow', ()=>{
    const ed=setup('<p></p>');
    // Simulate typing bursts separated by artificial time gaps by calling private _transaction
    const content=ed.content;
    function type(text){
      const tn = content.firstChild.firstChild || content.firstChild.appendChild(document.createTextNode(''));
      tn.textContent += text; ed._transaction(()=>{}, { pushHistory: true });
    }
    for(let i=0;i<5;i++) type('A');
    const initialLen = ed.history.stack.length;
    // Exceed limit quickly
    for(let i=0;i<ed.history.limit+10;i++) type('B');
    expect(ed.history.stack.length).toBeLessThanOrEqual(ed.history.limit);
    expect(ed.history.index).toBe(ed.history.stack.length-1);
    // Undo few steps
    const beforeUndoHtml = ed.serialize();
    ed.undo();
    expect(ed.serialize()).not.toBe(beforeUndoHtml);
    ed.redo();
    expect(ed.serialize()).toBe(beforeUndoHtml);
    expect(initialLen).toBeGreaterThan(0);
  });
  test('undo at beginning and redo at end are no-ops', ()=>{
    const ed=setup('<p>X</p>');
    const original = ed.serialize();
    // Move index to 0 by undo loop
    while(ed.history.index>0) ed.undo();
    ed.undo(); // should stay at 0
    expect(ed.serialize()).toBe(original);
    // Redo to end and extra redo
    while(ed.history.index < ed.history.stack.length-1) ed.redo();
    const atEnd = ed.serialize();
    ed.redo();
    expect(ed.serialize()).toBe(atEnd);
  });
});