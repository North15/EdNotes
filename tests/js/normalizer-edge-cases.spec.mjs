import { jest } from '@jest/globals';
import { normalize } from '../../src/EdNotes.RichText/wwwroot/editor/core/Normalizer.js';

describe('Normalizer edge cases', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  test('repairs table structure by moving stray tr into tbody', () => {
    container.innerHTML = '<table><tr><td>Cell 1</td></tr><tr><td>Cell 2</td></tr></table>';

    normalize(container);

    const table = container.querySelector('table');
    expect(table.querySelector('tbody')).toBeTruthy();
    expect(table.querySelectorAll('tbody tr').length).toBe(2);
    expect(table.querySelectorAll('tr').length).toBe(2); // No stray tr outside tbody
  });

  test('creates tbody when table has tr but no tbody', () => {
    container.innerHTML = '<table><tr><td>Cell</td></tr></table>';

    normalize(container);

    const table = container.querySelector('table');
    expect(table.querySelector('tbody')).toBeTruthy();
    expect(table.querySelector('tbody tr')).toBeTruthy();
  });

  test('removes disallowed elements from table', () => {
    container.innerHTML = '<table><tbody><tr><td>Cell</td><div>Bad</div></tr></tbody></table>';

    normalize(container);

    const table = container.querySelector('table');
    expect(table.querySelector('div')).toBeFalsy();
    expect(table.querySelector('td')).toBeTruthy();
  });

  test('keeps allowed table elements', () => {
    container.innerHTML = '<table><thead><tr><th>Header</th></tr></thead><tbody><tr><td>Cell</td></tr></tbody></table>';

    normalize(container);

    const table = container.querySelector('table');
    expect(table.querySelector('thead')).toBeTruthy();
    expect(table.querySelector('tbody')).toBeTruthy();
    expect(table.querySelector('th')).toBeTruthy();
    expect(table.querySelector('td')).toBeTruthy();
  });

  test('sanitizes math span content', () => {
    container.innerHTML = '<p><span class="math">x &lt; 5 &amp; y &gt; 10</span></p>';

    normalize(container);

    const mathSpan = container.querySelector('.math');
    expect(mathSpan).toBeTruthy();
    expect(mathSpan.textContent).toBe('x  5  y  10'); // <>& should be removed
  });

  test('handles math span without dangerous content', () => {
    container.innerHTML = '<p><span class="math">x^2 + y^2 = z^2</span></p>';

    normalize(container);

    const mathSpan = container.querySelector('.math');
    expect(mathSpan).toBeTruthy();
    expect(mathSpan.textContent).toBe('x^2 + y^2 = z^2');
  });

  test('removes style attribute from headings', () => {
    container.innerHTML = '<h1 style="color: red;">Heading</h1>';

    normalize(container);

    const h1 = container.querySelector('h1');
    expect(h1).toBeTruthy();
    expect(h1.hasAttribute('style')).toBe(false);
  });

  test('removes style attribute from all elements', () => {
    container.innerHTML = '<p style="color: blue;">Paragraph</p>';

    normalize(container);

    const p = container.querySelector('p');
    expect(p).toBeTruthy();
    expect(p.hasAttribute('style')).toBe(false);
  });

  test('enforces link policy on anchor tags', () => {
    container.innerHTML = '<p><a href="javascript:alert(1)">Link</a></p>';

    normalize(container);

    const a = container.querySelector('a');
    expect(a).toBeTruthy();
    expect(a.hasAttribute('href')).toBe(false); // href should be removed for javascript: links
    expect(a.getAttribute('target')).toBe('_blank');
    expect(a.getAttribute('rel')).toBe('noopener noreferrer');
  });

  test('adds data-checked attribute to task list items', () => {
    container.innerHTML = '<ul data-list="task"><li>Item 1</li><li data-checked="true">Item 2</li></ul>';

    normalize(container);

    const lis = container.querySelectorAll('li');
    expect(lis[0].getAttribute('data-checked')).toBe('false');
    expect(lis[1].getAttribute('data-checked')).toBe('true');
  });

  test('ignores non-task lists', () => {
    container.innerHTML = '<ul><li>Item 1</li><li>Item 2</li></ul>';

    normalize(container);

    const lis = container.querySelectorAll('li');
    expect(lis[0].hasAttribute('data-checked')).toBe(false);
    expect(lis[1].hasAttribute('data-checked')).toBe(false);
  });
});
