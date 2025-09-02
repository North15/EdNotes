(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('katex')) :
  typeof define === 'function' && define.amd ? define(['exports', 'katex'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.EdNotesRichText = {}, global.katex));
})(this, (function (exports, katex) { 'use strict';

  // Core schema definition (V1) – no media, strict allowlist.
  const ALLOWED_BLOCKS = new Set(['p','h1','h2','h3','ul','ol','li','blockquote','pre','code','hr','table','thead','tbody','tr','th','td','span']);
  const ALLOWED_MARKS = new Set(['strong','em','u','a']);
  const ALLOWED_ATTRS = new Set(['href','target','rel','colspan','rowspan','data-list','data-checked','class']);
  const LINK_PROTOCOL_ALLOW = /^(https?:|mailto:|tel:)/i;

  function isAllowedTag(tag){ tag = tag.toLowerCase(); return ALLOWED_BLOCKS.has(tag) || ALLOWED_MARKS.has(tag); }

  function enforceLinkPolicy(a){
    if(!a.getAttribute('href')) return;
    let href = a.getAttribute('href');
    // Trim leading/trailing whitespace
    const originalHref = href;
    href = href.trim();
    // Decode once to catch simple encoded javascript: patterns
    try { href = decodeURIComponent(href); } catch(_) { /* ignore decode issues */ }
    // Explicitly block javascript: (any casing) after trimming/decoding
    if(/^javascript:/i.test(href)) { 
      a.removeAttribute('href'); 
      a.setAttribute('target','_blank');
      a.setAttribute('rel','noopener noreferrer');
      return; 
    }
    if(!LINK_PROTOCOL_ALLOW.test(href)) { 
      a.removeAttribute('href'); 
      a.setAttribute('target','_blank');
      a.setAttribute('rel','noopener noreferrer');
      return; 
    }
    if(href !== originalHref) a.setAttribute('href', href);
    a.setAttribute('target','_blank');
    a.setAttribute('rel','noopener noreferrer');
  }

  function normalize(root){
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
      if(tag === 'span' && el.classList.contains('math')){
        // Allow math spans but sanitize content
        el.textContent = el.textContent.replace(/[<>&]/g, ''); // Basic sanitization
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

  // Lightweight selection bookmark utilities.
  function captureBookmark(root){
    const sel = document.getSelection();
    if(!sel || sel.rangeCount===0) return null;
    const range = sel.getRangeAt(0);
    return { anchor: pathTo(root, range.startContainer, range.startOffset), focus: pathTo(root, range.endContainer, range.endOffset) };
  }

  function restoreBookmark(root, bookmark){
    if(!bookmark) return;
    const sel = document.getSelection(); if(!sel) return;
    const range = document.createRange();
    const anchor = nodeFromPath(root, bookmark.anchor); const focus = nodeFromPath(root, bookmark.focus);
    if(!anchor || !focus) return;
    range.setStart(anchor.node, Math.min(bookmark.anchor.offset, anchor.nodeLength));
    range.setEnd(focus.node, Math.min(bookmark.focus.offset, focus.nodeLength));
    sel.removeAllRanges(); sel.addRange(range);
  }

  function pathTo(root, node, offset){
    const path=[]; let n=node;
    while(n && n!==root){ const parent=n.parentNode; if(!parent) break; const idx=Array.prototype.indexOf.call(parent.childNodes,n); path.push(idx); n=parent; }
    return { indexes:path, offset }; // indexes from leaf up
  }
  function nodeFromPath(root, info){ if(!info) return null; let node=root; const rev=[...info.indexes]; while(rev.length){ const idx=rev.shift(); node = node.childNodes[idx]; if(!node) return null; } const TEXT = (typeof Node!=='undefined' && Node.TEXT_NODE) ? Node.TEXT_NODE : 3; return { node, nodeLength: node.nodeType===TEXT ? node.textContent.length : node.childNodes.length }; }

  class CommandBus {
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

  function markCommand(tag){
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

  class EditorCore {
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
        
        // Task list toggle with Enter or Space
        if((key === 'enter' || key === ' ') && !mod){
          const sel = document.getSelection();
          if(sel.rangeCount > 0){
            let node = sel.anchorNode;
            while(node && node !== this.content){
              if(node.nodeType === 1 && node.tagName.toLowerCase() === 'li'){
                const ul = node.parentNode;
                if(ul && ul.tagName.toLowerCase() === 'ul' && ul.getAttribute('data-list') === 'task'){
                  e.preventDefault();
                  const current = node.getAttribute('data-checked') === 'true' ? 'true' : 'false';
                  const next = current === 'true' ? 'false' : 'true';
                  node.setAttribute('data-checked', next);
                  this._pushHistory();
                  return;
                }
              }
              node = node.parentNode;
            }
          }
        }
        
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
        if(mod && e.altKey && ['0','1','2','3'].includes(e.key)){
          e.preventDefault();
          const hMap = { '0':'p', '1':'h1', '2':'h2', '3':'h3' };
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

  // Primary public bundle entry for EdNotes Rich Text Editor.
  // Exports all public API symbols (previous legacy yourorg bundle removed in 0.2.0).

  // Minimal facade replicating prior RichText export shape.
  const instances = new Set();
  function _all(){ return Array.from(instances); }

  function mountToolbar(editor){
  	const tb = editor.root.querySelector('.rtx-toolbar');
  	if(!tb) return;
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
  		{ label:'☑', aria:'Task List', cmd:'list:task' },
  		{ label:'∑', aria:'Math Equation', cmd:'math:add' }
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
  }

  const RichText = {
  	attach(selector, options={}){
  		const nodes = document.querySelectorAll(selector);
  		if(nodes.length===0){
  			console.warn('[EdNotes.RichText] No elements matched selector', selector);
  			return 0;
  		}
  		nodes.forEach(t=>{
  			if(t._rtxAttached) return; t._rtxAttached=true;
  			const ed = new EditorCore(t, options);
  			ed.bus.register('strong', markCommand('strong'));
  			ed.bus.register('em', markCommand('em'));
  			ed.bus.register('u', markCommand('u'));
  			ed.bus.register('block:p', blockCommand('p'));
  			ed.bus.register('block:h1', blockCommand('h1'));
  			ed.bus.register('block:h2', blockCommand('h2'));
  			ed.bus.register('block:h3', blockCommand('h3'));
  			ed.bus.register('list:ul', listCommand('ul'));
  			ed.bus.register('list:ol', listCommand('ol'));
  			ed.bus.register('link:add', linkAddCommand(options));
  			ed.bus.register('link:remove', linkRemoveCommand());
  			ed.bus.register('list:task', taskListCommand());
  			ed.bus.register('math:add', mathCommand(options));
  			mountToolbar(ed);
  			ed.root.setAttribute('data-rtx-attached','true');
  			t.setAttribute('data-rtx-source','true');
  			instances.add(ed);
  		});
  		return nodes.length;
  	},
  	triggerSave(){ instances.forEach(i=> i.triggerSave()); },
  	undo(){ instances.forEach(i=> i.undo()); },
  	redo(){ instances.forEach(i=> i.redo()); },
  	exportAllPlain(){ return _all().map(i=> i.exportPlainText()); },
  	exportAllMarkdown(){ return _all().map(i=> i.exportMarkdown()); },
  	exportAllHTML(){ return _all().map(i=> i.exportHTML()); },
  	enforceLinkPolicy,
  	_all,
  	_clearInstances: () => instances.clear(),
  };

  // Version injected manually (consider automated replacement in future build step)
  // Bump version for documentation/demo fixes (theme switching + demo content adjustments)
  RichText.version = '0.5.2';

  function blockCommand(tag){
  	return (ed)=>{
  		const sel = document.getSelection(); if(!sel || sel.rangeCount===0) return;
  		const range = sel.getRangeAt(0);
  		let node = range.startContainer;
  		while(node && node !== ed.content && node.nodeType === 3) node = node.parentNode;
  		while(node && node.parentNode !== ed.content) node = node.parentNode;
  		if(!node) return;
  		if(node.tagName && node.tagName.toLowerCase() === tag) return;
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
  			const frag = document.createDocumentFragment();
  			Array.from(node.querySelectorAll('li')).forEach(li=>{
  				const p=document.createElement('p'); p.innerHTML = li.innerHTML || '<br />'; frag.appendChild(p);
  			});
  			ed.content.replaceChild(frag, node);
  		} else {
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
  		ed.bus.exec('noop');
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
  		const sel=document.getSelection(); if(!sel||sel.rangeCount===0) return;
  		let node=sel.anchorNode; while(node && node!==ed.content && node.nodeType===3) node=node.parentNode;
  		while(node && node.parentNode !== ed.content) node=node.parentNode;
  		if(!node) return;
  		const tag=node.tagName?node.tagName.toLowerCase():'';
  		if(tag==='ul' && node.getAttribute('data-list')==='task'){
  			node.removeAttribute('data-list'); node.querySelectorAll('li').forEach(li=> li.removeAttribute('data-checked'));
  		} else if(tag==='ul') { node.setAttribute('data-list','task'); node.querySelectorAll('li').forEach(li=>{ if(!li.hasAttribute('data-checked')) li.setAttribute('data-checked','false'); }); }
  		else {
  			const ul=document.createElement('ul'); ul.setAttribute('data-list','task');
  			const li=document.createElement('li'); li.setAttribute('data-checked','false'); li.innerHTML=node.innerHTML || '<br />'; ul.appendChild(li); ed.content.replaceChild(ul,node);
  		}
  	};
  }
  function mathCommand(options){
  	return (ed)=>{
  		const sel = document.getSelection(); if(!sel || sel.rangeCount===0) return;
  		const latex = (options && options.promptMath)? options.promptMath() : (typeof window.prompt==='function'? window.prompt('Enter LaTeX:','x^2') : null);
  		if(!latex) return;
  		const span = document.createElement('span');
  		span.className = 'math';
  		span.textContent = latex;
  		try {
  			katex.render(latex, span, { throwOnError: false });
  		} catch(e) {
  			span.textContent = '[Math Error]';
  		}
  		const range = sel.getRangeAt(0);
  		range.deleteContents();
  		range.insertNode(span);
  		sel.collapse(span.nextSibling || span, 0);
  		ed.bus.exec('noop');
  	};
  }
  if(typeof window!== 'undefined') window.RichText = RichText;

  exports.RichText = RichText;

}));
//# sourceMappingURL=ednotes.richtext.umd.js.map
