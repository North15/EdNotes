import { normalize } from '../../src/EdNotes.RichText/wwwroot/editor/core/Normalizer.js';
import { enforceLinkPolicy } from '../../src/EdNotes.RichText/wwwroot/editor/core/Schema.js';

// Direct Normalizer coverage for table and task list repairs

describe('normalize table & task list', () => {
  test('moves stray tr into new tbody when absent', () => {
    const root = document.createElement('div');
    root.innerHTML = `<table><tr><td>Cell</td></tr><tr><td>X</td></tr></table>`;
    normalize(root);
    const tbody = root.querySelector('tbody');
    expect(tbody).toBeTruthy();
    expect(tbody.querySelectorAll('tr').length).toBe(2);
  });
  test('ensures task list li get default data-checked', () => {
    const root = document.createElement('div');
    root.innerHTML = `<ul data-list="task"><li>One</li><li data-checked="true">Two</li></ul>`;
    normalize(root);
    const lis = root.querySelectorAll('li');
    expect(lis[0].getAttribute('data-checked')).toBe('false');
    expect(lis[1].getAttribute('data-checked')).toBe('true');
  });
});
