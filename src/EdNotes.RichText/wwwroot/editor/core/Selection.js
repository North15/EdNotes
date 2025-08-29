// Lightweight selection bookmark utilities.
export function captureBookmark(root){
  const sel = document.getSelection();
  if(!sel || sel.rangeCount===0) return null;
  const range = sel.getRangeAt(0);
  return { anchor: pathTo(root, range.startContainer, range.startOffset), focus: pathTo(root, range.endContainer, range.endOffset) };
}

export function restoreBookmark(root, bookmark){
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
