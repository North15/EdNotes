// RichText public API built on EditorCore + CommandBus abstraction.
import { EditorCore, CommandBus, markCommand } from './core/CommandBus.js';
import { enforceLinkPolicy } from './core/Schema.js';

const instances = new Set();
function _all(){ return Array.from(instances); }

function mountToolbar(editor){
  const tb = editor.root.querySelector('.rtx-toolbar');
  const buttons = [
    { label:'B', aria:'Bold', cmd:'strong', mark:'strong' },
    { label:'I', aria:'Italic', cmd:'em', mark:'em' },
    { label:'U', aria:'Underline', cmd:'u', mark:'u' },
    { label:'P', aria:'Paragraph', cmd:'block:p', block:'p' },
    { label:'H1', aria:'Heading 1', cmd:'block:h1', block:'h1' },
  { label:'H2', aria:'Heading 2', cmd:'block:h2', block:'h2' },
  { label:'H3', aria:'Heading 3', cmd:'block:h3', block:'h3' },
    { label:'•', aria:'Bullet List', cmd:'list:ul', list:'ul' },
    { label:'1.', aria:'Numbered List', cmd:'list:ol', list:'ol' },
    { label:'🔗', aria:'Add Link', cmd:'link:add' },
    { label:'✖', aria:'Remove Link', cmd:'link:remove' },
    { label:'☑', aria:'Task List', cmd:'list:task' }
  ];
  const btnEls=[];
  buttons.forEach((b,i)=>{
    const btn=document.createElement('button');
    btn.type='button'; btn.textContent=b.label; btn.setAttribute('aria-label',b.aria); btn.dataset.cmd=b.cmd; btn.tabIndex = i===0?0:-1;
    btn.addEventListener('click',()=> editor.bus.exec(b.cmd));
    btn.addEventListener('keydown', e=>{
      if(e.key==='ArrowRight'||e.key==='ArrowLeft'){
        e.preventDefault();
        const dir = e.key==='ArrowRight'?1:-1;
        let idx = btnEls.indexOf(btn)+dir; if(idx<0) idx=btnEls.length-1; if(idx>=btnEls.length) idx=0;
        btnEls.forEach(b2=> b2.tabIndex=-1); btnEls[idx].tabIndex=0; btnEls[idx].focus();
      }
    });
    tb.appendChild(btn); btnEls.push(btn);
  });
  // State reflection
  const reflect = ()=>{
    const sel = document.getSelection(); if(!sel || sel.rangeCount===0) return;
    const node = sel.anchorNode && sel.anchorNode.nodeType===1? sel.anchorNode : sel.anchorNode && sel.anchorNode.parentNode;
    btnEls.forEach(b=> b.removeAttribute('aria-pressed'));
    if(node){
      const path=[]; let n=node; while(n && n!==editor.content){ if(n.nodeType===1) path.push(n); n=n.parentNode; }
      path.forEach(el=>{
        const tag=el.tagName && el.tagName.toLowerCase();
        btnEls.forEach(btn=>{
          if(btn.dataset.cmd.startsWith('block:') && btn.textContent && tag===btn.textContent.toLowerCase()) btn.setAttribute('aria-pressed','true');
          if(btn.dataset.cmd.startsWith('list:') && (tag==='ul'||tag==='ol') && btn.dataset.cmd==='list:'+tag) btn.setAttribute('aria-pressed','true');
          if(['strong','em','u'].includes(tag) && btn.dataset.cmd===tag) btn.setAttribute('aria-pressed','true');
        });
      });
    }
  };
  editor.content.addEventListener('keyup', reflect);
  editor.content.addEventListener('mouseup', reflect);
}

export const RichText = {
  attach(selector, options={}){
    document.querySelectorAll(selector).forEach(t=>{
      if(t._rtxAttached) return; t._rtxAttached=true;
      const ed = new EditorCore(t, options);
      // register commands
      ed.bus.register('strong', markCommand('strong'));
      ed.bus.register('em', markCommand('em'));
      ed.bus.register('u', markCommand('u'));
  // Block + list commands
  ed.bus.register('block:p', blockCommand('p'));
  ed.bus.register('block:h1', blockCommand('h1'));
  ed.bus.register('block:h2', blockCommand('h2'));
  ed.bus.register('block:h3', blockCommand('h3'));
  ed.bus.register('list:ul', listCommand('ul'));
    ed.bus.register('list:ol', listCommand('ol'));
    ed.bus.register('link:add', linkAddCommand(options));
    ed.bus.register('link:remove', linkRemoveCommand());
    ed.bus.register('list:task', taskListCommand());
  mountToolbar(ed);
      instances.add(ed);
    });
  },
  triggerSave(){ instances.forEach(i=> i.triggerSave()); },
  undo(){ instances.forEach(i=> i.undo()); },
  redo(){ instances.forEach(i=> i.redo()); },
  exportAllPlain(){ return _all().map(i=> i.exportPlainText()); },
  exportAllMarkdown(){ return _all().map(i=> i.exportMarkdown()); },
  enforceLinkPolicy,
  _all
};

function blockCommand(tag){
  return (ed)=>{
    // Wrap selection block(s) into target block type
    const sel = document.getSelection(); if(!sel || sel.rangeCount===0) return;
    const range = sel.getRangeAt(0);
    let node = range.startContainer;
    while(node && node !== ed.content && node.nodeType === 3) node = node.parentNode; // ascend to element
    while(node && node.parentNode !== ed.content) node = node.parentNode;
    if(!node) return;
    if(node.tagName && node.tagName.toLowerCase() === tag) return; // already
    const replacement = document.createElement(tag);
    replacement.innerHTML = node.innerHTML || '<br />';
    ed.content.replaceChild(replacement, node);
  };
}

function listCommand(listTag){
  return (ed)=>{
    const sel = document.getSelection(); if(!sel || sel.rangeCount===0) return;
    const range = sel.getRangeAt(0);
    let node = range.startContainer;
    while(node && node !== ed.content && node.nodeType === 3) node = node.parentNode;
    while(node && node.parentNode !== ed.content) node = node.parentNode;
    if(!node) return;
    const tag = node.tagName ? node.tagName.toLowerCase() : '';
    if(tag === 'ul' || tag === 'ol'){
      // toggle off → unwrap to paragraphs
      const frag = document.createDocumentFragment();
      Array.from(node.querySelectorAll('li')).forEach(li=>{
        const p=document.createElement('p'); p.innerHTML = li.innerHTML || '<br />'; frag.appendChild(p);
      });
      ed.content.replaceChild(frag, node);
    } else {
      // wrap node in list
      const list = document.createElement(listTag);
      const li = document.createElement('li'); li.innerHTML = node.innerHTML || '<br />'; list.appendChild(li);
      ed.content.replaceChild(list, node);
    }
  };
}

function linkAddCommand(options){
  return (ed)=>{
    const sel = document.getSelection(); if(!sel || sel.rangeCount===0) return;
    const url = (options && options.promptLink)? options.promptLink() : (typeof window.prompt==='function'? window.prompt('Enter URL (https://...)','https://') : null);
    if(!url) return;
    const a=document.createElement('a'); a.href=url; enforceLinkPolicy(a);
    const range = sel.getRangeAt(0);
    if(range.collapsed){ a.textContent=url; range.insertNode(a); sel.collapse(a, a.childNodes.length); }
    else {
      const txt=range.extractContents(); a.appendChild(txt); range.insertNode(a);
    }
    ed.bus.exec('noop'); // trigger normalization / save
  };
}
function linkRemoveCommand(){
  return (ed)=>{
    const sel = document.getSelection(); if(!sel || sel.rangeCount===0) return;
    let node = sel.anchorNode || sel.focusNode;
    while(node && node!==ed.content && (!node.tagName || node.tagName.toLowerCase()!=='a')) node=node.parentNode;
    if(node && node.tagName && node.tagName.toLowerCase()==='a'){
      const parent=node.parentNode; while(node.firstChild) parent.insertBefore(node.firstChild, node); node.remove();
      ed._transaction(()=>{}, { pushHistory: true });
    }
  };
}
function taskListCommand(){
  return (ed)=>{
    // Turn current block into a task list (ul data-list="task")
    const sel=document.getSelection(); if(!sel||sel.rangeCount===0) return;
    let node=sel.anchorNode; while(node && node!==ed.content && node.nodeType===3) node=node.parentNode;
    while(node && node.parentNode !== ed.content) node=node.parentNode;
    if(!node) return;
    const tag=node.tagName?node.tagName.toLowerCase():'';
    if(tag==='ul' && node.getAttribute('data-list')==='task'){ // toggle off
      node.removeAttribute('data-list'); node.querySelectorAll('li').forEach(li=> li.removeAttribute('data-checked'));
    } else if(tag==='ul'){ node.setAttribute('data-list','task'); node.querySelectorAll('li').forEach(li=>{ if(!li.hasAttribute('data-checked')) li.setAttribute('data-checked','false'); }); }
    else {
      // wrap block into task list
      const ul=document.createElement('ul'); ul.setAttribute('data-list','task');
      const li=document.createElement('li'); li.setAttribute('data-checked','false'); li.innerHTML=node.innerHTML || '<br />'; ul.appendChild(li); ed.content.replaceChild(ul,node);
    }
  };
}

// No-op command used internally for refresh side-effects
CommandBus.prototype.register && CommandBus.prototype.register.call({ _registry: new Map() },'noop',()=>{});

if(typeof window!== 'undefined') window.RichText = RichText;
