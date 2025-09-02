// Enhanced loader for EdNotes RichText (non-module inclusion)
// Usage: <script src="~/_content/EdNotes.RichText/editor/ednotes.richtext.loader.js"></script>
// Then EdNotesRichText becomes available on window.
(function(){
  if(window.EdNotesRichText){ return; }
  
  // Auto-inject CSS if not present
  function injectCSS() {
    if (document.querySelector('link[href*="ednotes.richtext.css"]') || 
        document.querySelector('style[data-ednotes-css]')) {
      return; // CSS already loaded
    }
    
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = './ednotes.richtext.css';
    link.setAttribute('data-ednotes-css', 'auto');
    document.head.appendChild(link);
  }
  
  var dynamicImport;
  try { dynamicImport = new Function('p', 'return import(p);'); } catch(_) { /* no dynamic import */ }
  
  if(dynamicImport){
    // Try modern API first, fall back to legacy
    dynamicImport('./ednotes.richtext.api.js')
      .then(function(m){ 
        if(!window.EdNotesRichText) {
          window.EdNotesRichText = m.EdNotesRichText || m.default;
          injectCSS();
        }
      })
      .catch(function(e){ 
        console.warn('[EdNotes.RichText] Modern API failed, falling back to legacy:', e);
        // Fallback to legacy bundle
        return dynamicImport('./ednotes.richtext.bundle.js');
      })
      .then(function(m){ 
        if(!window.RichText && m) {
          window.RichText = m.RichText;
          injectCSS();
        }
      })
      .catch(function(e){ 
        console.error('[EdNotes.RichText] Failed to load editor:', e); 
      });
  } else {
    console.error('[EdNotes.RichText] Dynamic import not supported in this browser.');
  }
})();
