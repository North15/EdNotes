// Classic loader for EdNotes RichText (non-module inclusion)
// Usage: <script src="~/_content/EdNotes.RichText/editor/ednotes.richtext.loader.js"></script>
// Then RichText becomes available on window.
(function(){
  if(window.RichText){ return; }
  var dynamicImport;
  try { dynamicImport = new Function('p', 'return import(p);'); } catch(_) { /* no dynamic import */ }
  if(dynamicImport){
    dynamicImport('./ednotes.richtext.bundle.js')
      .then(function(m){ if(!window.RichText) window.RichText = m.RichText; })
      .catch(function(e){ console.error('[EdNotes.RichText] Failed dynamic import:', e); });
  } else {
    console.error('[EdNotes.RichText] Dynamic import not supported in this browser.');
  }
})();
