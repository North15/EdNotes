import { captureBookmark, restoreBookmark } from '../../src/EdNotes.RichText/wwwroot/editor/core/Selection.js';
import { normalize } from '../../src/EdNotes.RichText/wwwroot/editor/core/Normalizer.js';
import { strict as assert } from 'node:assert';
import { createEditor } from './test-utils.mjs';

test('restoreBookmark no-ops when anchor/focus nodes removed', ()=>{
  const ed = createEditor({ html: '<p>Alpha <strong>Beta</strong> Gamma</p>' });
  // Select inside strong element
  const sel = document.getSelection();
  const strong = ed.content.querySelector('strong');
  const range = document.createRange();
  range.setStart(strong.firstChild, 1); // inside 'Beta'
  range.setEnd(strong.firstChild, 2);
  sel.removeAllRanges(); sel.addRange(range);
  const bm = captureBookmark(ed.content);
  // Remove strong entirely so stored path becomes invalid
  strong.remove();
  restoreBookmark(ed.content, bm); // Should silently return without throwing
  assert.ok(true, 'Did not throw when restoring stale bookmark');
});

test('normalize removes disallowed nested elements and style attributes deeply', ()=>{
  const ed = createEditor({ html: '<p style="color:red">Hi <span style="font-weight:bold"><script>alert(1)</script>There</span></p>' });
  normalize(ed.content);
  const p = ed.content.querySelector('p');
  assert.ok(p && !p.hasAttribute('style'), 'Paragraph style removed');
  assert.equal(ed.content.querySelectorAll('script').length, 0, 'Script removed');
  assert.equal(p.textContent.trim(), 'Hi There');
});
