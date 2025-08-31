import { normalize } from './Normalizer.js';
import { captureBookmark, restoreBookmark } from './Selection.js';

export class CommandBus {
  constructor(editor){ this.editor = editor; this._registry = new Map(); }
  register(name, fn){ this._registry.set(name, fn); }
  exec(name, opts){ const cmd=this._registry.get(name); if(!cmd) return false; this.editor._transaction((ed)=>cmd(ed, opts||{}));
    if(name !== 'noop' && this.editor._live) {
      const friendly = name.replace('strong','bold').replace('em','italic').replace('u','underline').replace('block:','heading ').replace('list:','list ').replace('link:','link ');
      this.editor._live.textContent = `Applied ${friendly}`;
    }
    // Fire custom event so toolbar can refresh aria-pressed state immediately
    try {
      let ev;
      if(typeof CustomEvent === 'function') ev = new CustomEvent('rtx-command', { bubbles:true, detail:{ name } });
      else {
        ev = document.createEvent('CustomEvent');
        ev.initCustomEvent('rtx-command', true, false, { name });
      }
      this.editor.content.dispatchEvent(ev);
    } catch(_) { /* non-fatal in headless */ }
    return true; }
}

export function markCommand(tag){
  return (editor)=>{
    // Prefer native execCommand when available (real browsers) for rich behavior (range merging, etc.)
    const mapping = { strong:'bold', em:'italic', u:'underline' };
    if(typeof document.execCommand === 'function' && mapping[tag]){
      try { document.execCommand(mapping[tag]); return; } catch(_) { /* fall back */ }
    }
    // Fallback implementation (jsdom / non-rich environments): simple wrap / unwrap
    const sel = document.getSelection();
    if(!sel || sel.rangeCount===0 || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    let startNode = range.startContainer;
    while(startNode && startNode.nodeType===3) startNode = startNode.parentNode;
    let endNode = range.endContainer;
    while(endNode && endNode.nodeType===3) endNode = endNode.parentNode;
    if(startNode === endNode && startNode && startNode.tagName && startNode.tagName.toLowerCase()===tag){
      // Toggle off: unwrap
      const el = startNode;
      const frag = document.createDocumentFragment();
      while(el.firstChild) frag.appendChild(el.firstChild);
      el.parentNode.replaceChild(frag, el);
      return;
    }
    const wrapper = document.createElement(tag);
    wrapper.appendChild(range.extractContents());
    range.insertNode(wrapper);
    // Reselect new contents
    sel.removeAllRanges();
    const nr = document.createRange(); nr.selectNodeContents(wrapper); sel.addRange(nr);
  };
}

export class EditorCore {
  constructor(textarea, options){
    this.textarea = textarea; this.options=options||{};
    this.root = this._build();
    this.content = this.root.querySelector('.rtx-content');
    this.bus = new CommandBus(this);
  // Ensure noop command exists for tests / internal refresh triggers
  this.bus.register('noop', () => {});
  this.history = { stack: [], index: -1, batching: false, lastTypeTs: 0, limit: (this.options.historyLimit||100) };
    this._setInterval = this.options._setInterval || setInterval;
    if(this.options.autosaveIntervalMs){
      this._autosaveTimer = this._setInterval(()=>{
        const val = this.serialize();
        if(this._lastAutosaveValue !== val){
          this._lastAutosaveValue = val;
          if(typeof this.options.onAutosave === 'function') this.options.onAutosave(val);
        }
      }, this.options.autosaveIntervalMs);
    }
    this._wire();
  }
  _build(){
    const w=document.createElement('div'); w.className='rtx-editor';
    const tb=document.createElement('div'); tb.className='rtx-toolbar'; tb.setAttribute('role','toolbar'); tb.setAttribute('aria-label','Formatting toolbar');
    const c=document.createElement('div'); c.className='rtx-content'; c.contentEditable='true'; c.setAttribute('role','textbox'); c.setAttribute('aria-multiline','true');
  const live=document.createElement('div'); live.className='rtx-live'; live.setAttribute('aria-live','polite'); live.style.position='absolute'; live.style.left='-9999px'; live.style.height='1px'; live.style.overflow='hidden';
  w.appendChild(tb); w.appendChild(c); w.appendChild(live); this._live=live; this.textarea.style.display='none'; this.textarea.parentNode.insertBefore(w, this.textarea.nextSibling); return w;
  }
  _wire(){
    // Input (typing) -> transactional with batching
    this.content.addEventListener('input', ()=> {
      const now = performance.now();
      const gap = now - this.history.lastTypeTs;
      const shouldNewEntry = gap > 600; // simple idle threshold
  this._transaction(()=>{}, { pushHistory: shouldNewEntry });
      this.history.lastTypeTs = now;
    });
    // Paste pipeline
    this.content.addEventListener('paste', e => {
      e.preventDefault();
      const html = e.clipboardData && e.clipboardData.getData('text/html');
      const text = e.clipboardData && e.clipboardData.getData('text/plain');
      this._transaction(()=>{
        if(html) {
          const frag = document.createElement('div');
          frag.innerHTML = html;
          normalize(frag); // clean before insert
          this._insertFragmentAtSelection(frag);
        } else if(text) {
          document.execCommand('insertText', false, text);
        }
      }, { pushHistory: true });
    });
    // Keyboard shortcuts
    this.content.addEventListener('keydown', e => {
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      if(mod && key === 'z'){ // undo / redo
        e.preventDefault();
        if(e.shiftKey) this.redo(); else this.undo();
        return;
      }
      if(mod && (key === 'b' || key==='i' || key==='u')){ // formatting
        e.preventDefault();
        const map = { b:'strong', i:'em', u:'u' };
        this.bus.exec(map[key]);
        return;
      }
      if(mod && e.altKey && ['1','2','3'].includes(e.key)){
        e.preventDefault();
        const hMap = { '1':'h1', '2':'h2', '3':'h3' };
        this.bus.exec('block:'+hMap[e.key]);
        return;
      }
      if(key === 'tab'){
        if(this._maybeHandleListIndent(e)) return; // prevent default inside handler
      }
    });
    this.content.innerHTML = this.textarea.value || '<p></p>';
    this._pushHistory();
  }
  _transaction(worker, opts={}){
    const bm = captureBookmark(this.content);
    worker(this);
    normalize(this.content);
    restoreBookmark(this.content, bm);
    this.textarea.value = this.serialize();
    if(typeof this.options.onChange === 'function') this.options.onChange(this.textarea.value);
    if(opts.pushHistory) this._pushHistory();
  }
  _pushHistory(){
    // Truncate redo tail
    if(this.history.index < this.history.stack.length -1){
      this.history.stack = this.history.stack.slice(0, this.history.index+1);
    }
    this.history.stack.push({ html: this.serialize() });
    this.history.index = this.history.stack.length -1;
    if(this.history.stack.length > this.history.limit){
      // Drop oldest
      const overflow = this.history.stack.length - this.history.limit;
      this.history.stack.splice(0, overflow);
      this.history.index -= overflow;
    }
  }
  undo(){
    if(this.history.index <=0) return;
    this.history.index--;
    this._restoreHistoryEntry();
  }
  redo(){
    if(this.history.index >= this.history.stack.length -1) return;
    this.history.index++;
    this._restoreHistoryEntry();
  }
  _restoreHistoryEntry(){
    const entry = this.history.stack[this.history.index];
    if(!entry) return;
    this.content.innerHTML = entry.html;
    normalize(this.content);
    this.textarea.value = this.serialize();
  }
  _insertFragmentAtSelection(frag){
    const sel = document.getSelection(); if(!sel || sel.rangeCount===0) return;
    const range = sel.getRangeAt(0); range.deleteContents();
    while(frag.firstChild){ range.insertNode(frag.firstChild); }
    // Move caret to end of inserted content
    sel.collapse(range.endContainer, range.endOffset);
  }
  _maybeHandleListIndent(e){
    // Returns true if handled
    const sel = document.getSelection();
    if(!sel || sel.rangeCount===0) return false;
    let node = sel.getRangeAt(0).startContainer;
    while(node && node !== this.content && node.nodeType===3) node = node.parentNode;
    while(node && node.tagName && node.tagName.toLowerCase() !== 'li' && node !== this.content) node = node.parentNode;
    if(!node || node===this.content) return false;
    const li = node;
    const list = li.parentNode;
    if(e.shiftKey){ // outdent
      const parentLi = list.parentNode && list.parentNode.tagName && list.parentNode.tagName.toLowerCase()==='li' ? list.parentNode : null;
      e.preventDefault();
      if(parentLi){
      const ancestorList = parentLi.parentNode; // ul/ol
      ancestorList.insertBefore(li, parentLi.nextSibling);
      if(list.children.length===0) list.remove();
      this._transaction(()=>{}, { pushHistory: true });
      return true;
      } else if(list.parentNode === this.content){
      // Already top-level: no action
      return false;
      }
      return false;
    } else { // indent
      const prev = li.previousElementSibling;
      if(!prev) return false; // cannot indent first
      e.preventDefault();
      let sublist = Array.from(prev.children).reverse().find(ch => ch.tagName && (ch.tagName.toLowerCase()==='ul' || ch.tagName.toLowerCase()==='ol'));
      if(!sublist){
        sublist = document.createElement(list.tagName.toLowerCase());
        prev.appendChild(sublist);
      }
      sublist.appendChild(li);
      this._transaction(()=>{}, { pushHistory: true });
      return true;
    }
  }
  serialize(){ return this.content.innerHTML; }
  triggerSave(){ this.textarea.value = this.serialize(); }
  exportPlainText(){
    // Basic block separation by newlines
    const clone = this.content.cloneNode(true);
    clone.querySelectorAll('script,style').forEach(n=> n.remove());
    return clone.textContent.replace(/\n{2,}/g,'\n').trim();
  }
  exportMarkdown(){
    // Ultra-minimal mapping
    const out=[];
    for(const child of this.content.children){
      const tag=child.tagName.toLowerCase();
      let line='';
      if(tag==='p') line = child.textContent.trim();
      else if(/^h[1-6]$/.test(tag)) line = '#'.repeat(parseInt(tag[1])) + ' ' + child.textContent.trim();
      else if(tag==='ul'){
        child.querySelectorAll(':scope > li').forEach(li=> out.push('- '+li.textContent.trim()));
        continue;
      } else if(tag==='ol'){
        let i=1; child.querySelectorAll(':scope > li').forEach(li=> out.push((i++)+'. '+li.textContent.trim()));
        continue;
      } else line = child.textContent.trim();
      out.push(line);
    }
    return out.join('\n\n');
  }
  exportHTML(){
    return this.content.innerHTML;
  }
  dispose(){ if(this._autosaveTimer) clearInterval(this._autosaveTimer); }
}
