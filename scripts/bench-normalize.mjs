import { JSDOM } from 'jsdom';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const SIZE = parseInt(process.argv[2]||'200',10);
const samplePara = '<p>Lorem <strong>ipsum</strong> dolor sit <em>amet</em> consectetur <u>adipisicing</u> elit.</p>';
let bigHtml = '';
for(let i=0;i<SIZE;i++) bigHtml += samplePara;

const dom = new JSDOM(`<!DOCTYPE html><div id="root">${bigHtml}</div>`);
global.window=dom.window; global.document=dom.window.document; global.NodeFilter=dom.window.NodeFilter; global.Node=dom.window.Node;
const { normalize } = await import(pathToFileURL(path.resolve('./src/EdNotes.RichText/wwwroot/editor/core/Normalizer.js')).href);

const root=document.getElementById('root');
const t0 = performance.now();
normalize(root);
const t1 = performance.now();
const ms = (t1 - t0).toFixed(2);
console.log(JSON.stringify({ nodes: root.querySelectorAll('*').length, blocks: SIZE, msPerBlock: (ms / SIZE).toFixed(4), totalMs: parseFloat(ms) }));