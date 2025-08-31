import { RichText } from '../../src/EdNotes.RichText/wwwroot/editor/ednotes.richtext.bundle.js';
import { createEditor, selectAll } from './test-utils.mjs';

function attach(initial) { return createEditor({ html: initial }); }

describe('block and list commands', () => {
  test('convert paragraph to h2 (no undo history push)', () => {
    const ed = attach('<p>Heading</p>');
  const p = document.querySelector('.rtx-content p');
  selectAll(p);
    ed.bus.exec('block:h2');
    expect(document.querySelector('h2').textContent).toBe('Heading');
  });
  test('list toggle paragraph to ul and back', () => {
    const ed = attach('<p>Item</p>');
    const content = ed.content;
    const p = content.querySelector('p'); selectAll(p);
    ed.bus.exec('list:ul');
    const li = content.querySelector('ul li');
    expect(li && li.textContent).toBe('Item');
    // Convert back: select list element
    const ul = content.querySelector('ul'); selectAll(ul);
    ed.bus.exec('list:ul');
    expect(content.querySelector('ul')).toBeFalsy();
  });
});
