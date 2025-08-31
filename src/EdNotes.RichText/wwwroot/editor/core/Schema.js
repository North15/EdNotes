// Core schema definition (V1) – no media, strict allowlist.
export const ALLOWED_BLOCKS = new Set(['p','h1','h2','h3','ul','ol','li','blockquote','pre','code','hr','table','thead','tbody','tr','th','td','span']);
export const ALLOWED_MARKS = new Set(['strong','em','u','a']);
export const ALLOWED_ATTRS = new Set(['href','target','rel','colspan','rowspan','data-list','data-checked','class']);
export const LINK_PROTOCOL_ALLOW = /^(https?:|mailto:|tel:)/i;

export function isAllowedTag(tag){ tag = tag.toLowerCase(); return ALLOWED_BLOCKS.has(tag) || ALLOWED_MARKS.has(tag); }

export function enforceLinkPolicy(a){
  if(!a.getAttribute('href')) return;
  let href = a.getAttribute('href');
  // Trim leading/trailing whitespace
  const originalHref = href;
  href = href.trim();
  // Decode once to catch simple encoded javascript: patterns
  try { href = decodeURIComponent(href); } catch(_) { /* ignore decode issues */ }
  // Explicitly block javascript: (any casing) after trimming/decoding
  if(/^javascript:/i.test(href)) { a.removeAttribute('href'); return; }
  if(!LINK_PROTOCOL_ALLOW.test(href)) { a.removeAttribute('href'); return; }
  if(href !== originalHref) a.setAttribute('href', href);
  a.setAttribute('target','_blank');
  a.setAttribute('rel','noopener noreferrer');
}
