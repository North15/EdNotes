import { RichText } from '../../src/EdNotes.RichText/wwwroot/editor/ednotes.richtext.bundle.js';

function attach(html){
  document.body.innerHTML='';
  const ta=document.createElement('textarea'); ta.id='pz'; ta.value=html; document.body.appendChild(ta);
  RichText.attach('#pz', {});
  return RichText._all().slice(-1)[0];
}

function firePaste(target, html, text){
  const evt = new Event('paste', { bubbles:true, cancelable:true });
  evt.clipboardData = { getData: (type)=> type==='text/html'? html : text };
  target.dispatchEvent(evt);
}

function placeCaretEnd(el){
  const sel = document.getSelection();
  const range = document.createRange();
  const node = el.firstChild.firstChild || el.firstChild.appendChild(document.createTextNode(''));
  range.setStart(node, node.textContent.length);
  range.collapse(true);
  sel.removeAllRanges(); sel.addRange(range);
}

describe('paste normalization & link policy', ()=>{
  test('strips disallowed tags and attributes', ()=>{
    const ed=attach('<p>Start</p>');
  ed.content.focus(); placeCaretEnd(ed.content);
    firePaste(ed.content, '<div style="color:red"><script>alert(1)</script><p data-x="y" style="font-size:99px">Hello <em style="foo:1">World</em><iframe></iframe></p></div>', '');
    const html = ed.serialize();
  expect(html).toContain('<p>Start');
  // Ensure script & iframe removed and style / custom attr stripped
    expect(html).not.toContain('<script');
    expect(html).not.toContain('<iframe');
    expect(html).not.toContain('style=');
    expect(html).not.toContain('data-x=');
  // Should retain emphasis content somewhere
  expect(html.toLowerCase()).toContain('<em>world</em>');
  });
  test('enforces link protocol on paste', ()=>{
    const ed=attach('<p></p>');
  ed.content.focus(); placeCaretEnd(ed.content);
    firePaste(ed.content, '<p><a href=" javascript:alert(1) ">Bad</a> <a href="HTTPS://example.com">Ok</a></p>', '');
    const aAll = Array.from(ed.content.querySelectorAll('a'));
    const hrefs = aAll.map(a=> a.getAttribute('href'));
    expect(hrefs.some(h=> h && h.toLowerCase().startsWith('javascript'))).toBe(false);
    // One allowed link remains (protocol enforced + target/rel set) but href may be normalized case or trimmed
  expect(hrefs.filter(Boolean).length).toBe(1);
  });
});
