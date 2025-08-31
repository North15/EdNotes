import { createEditor, selectAll } from './test-utils.mjs';

function createInst(html){
  return createEditor({ html, options:{ promptLink: ()=> 'https://example.com' } });
}

describe('link and task list commands', () => {
  test('add and remove link', () => {
    const inst = createInst('<p>Link</p>');
    const content = inst.content;
    const para = content.querySelector('p');
    selectAll(para);
    inst.bus.exec('link:add');
    const a = content.querySelector('a');
    expect(a).toBeTruthy();
    selectAll(a);
    inst.bus.exec('link:remove');
    expect(content.querySelector('a')).toBeFalsy();
  });
  test('task list toggle', () => {
    const inst = createInst('<p>Task item</p>');
    const content = inst.content;
    const para = content.querySelector('p');
    selectAll(para);
    inst.bus.exec('list:task');
    const ul = content.querySelector('ul[data-list="task"]');
    expect(ul).toBeTruthy();
    expect(ul.querySelector('li').getAttribute('data-checked')).toBe('false');
  // Select inner li to ensure stable range before toggling off
  const firstLi = ul.querySelector('li');
  selectAll(firstLi);
    inst.bus.exec('list:task');
    expect(content.querySelector('ul[data-list="task"]')).toBeFalsy();
  });
});
