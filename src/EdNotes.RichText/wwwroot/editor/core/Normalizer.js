import { isAllowedTag, ALLOWED_ATTRS, enforceLinkPolicy } from './Schema.js';

export function normalize(root){
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, null);
  const toRemove = [];
  while(walker.nextNode()){
    const el = walker.currentNode;
    const tag = el.tagName.toLowerCase();
  if(tag === 'script' || tag === 'iframe') { toRemove.push(el); continue; }
  // Remove any embedded script/iframe children early
  el.querySelectorAll && el.querySelectorAll('script,iframe').forEach(child=> child.remove());
    if(!isAllowedTag(tag)){
      if(el.childNodes.length){
        while(el.firstChild) el.parentNode.insertBefore(el.firstChild, el);
      }
      toRemove.push(el);
      continue;
    }
    // Strip disallowed attributes (including style)
    for(const attr of Array.from(el.attributes)){
      const name = attr.name.toLowerCase();
      if(name === 'style' || !ALLOWED_ATTRS.has(name)) el.removeAttribute(attr.name);
    }
    if(el.getAttribute && el.getAttribute('style')) el.removeAttribute('style');
    if(/h[1-6]/.test(tag) && el.getAttribute && el.getAttribute('style')) el.removeAttribute('style');
    if(tag === 'a') enforceLinkPolicy(el);
    if(tag === 'ul' && el.getAttribute('data-list') === 'task'){
      el.querySelectorAll('li').forEach(li=>{ if(!li.hasAttribute('data-checked')) li.setAttribute('data-checked','false'); });
    }
    if(tag === 'table'){
      // Ensure structure: table>thead?+tbody? allowed; move stray tr into tbody
      const rows=[...el.children].filter(c=> c.tagName && c.tagName.toLowerCase()==='tr');
      if(rows.length){
        let tbody=el.querySelector('tbody'); if(!tbody){ tbody=document.createElement('tbody'); el.appendChild(tbody); }
        rows.forEach(r=> tbody.appendChild(r));
      }
      // Remove disallowed descendants
      [...el.querySelectorAll('*')].forEach(child=>{
        const ct = child.tagName.toLowerCase();
        if(!['table','thead','tbody','tr','th','td'].includes(ct)) child.remove();
      });
    }
  }
  toRemove.forEach(n=> n.remove());
  // Final sweep: remove any lingering style attributes
  root.querySelectorAll && root.querySelectorAll('[style]').forEach(el=> el.removeAttribute('style'));
}
