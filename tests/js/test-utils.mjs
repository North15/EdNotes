// Shared test helpers for RichText editor
import { RichText } from '../../src/EdNotes.RichText/wwwroot/editor/ednotes.richtext.bundle.js';

export function createEditor({ html='<p></p>', options={} }={}){
  document.body.innerHTML='';
  const ta=document.createElement('textarea'); ta.id='rtx-test'; ta.value=html; document.body.appendChild(ta);
  RichText.attach('#rtx-test', options);
  const inst = RichText._all().slice(-1)[0];
  return inst;
}

export function selectAll(node){
  const sel=document.getSelection(); if(!sel) return;
  const r=document.createRange();
  if(node.firstChild && node.firstChild.nodeType===3){
    r.setStart(node.firstChild,0);
    r.setEnd(node.firstChild,node.firstChild.textContent.length);
  } else if(node.firstChild){
    // If firstChild is element choose its contents
    r.selectNodeContents(node);
  } else {
    r.setStart(node,0); r.setEnd(node,0);
  }
  sel.removeAllRanges(); sel.addRange(r);
}
