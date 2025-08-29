import fs from 'node:fs';

function computeFromLcov(pathLcov){
  const txt = fs.readFileSync(pathLcov,'utf8');
  let totalLines=0, covered=0;
  for(const line of txt.split(/\r?\n/)){
    if(line.startsWith('DA:')){
      const parts=line.substring(3).split(',');
      totalLines++; if(parseInt(parts[1],10)>0) covered++;
    }
  }
  return covered/totalLines*100;
}
let pct = null;
if(fs.existsSync('artifacts/coverage/js/coverage-summary.json')){
  const data = JSON.parse(fs.readFileSync('artifacts/coverage/js/coverage-summary.json','utf8'));
  pct = data.total.lines.pct;
} else if(fs.existsSync('artifacts/coverage/js/lcov.info')){
  pct = computeFromLcov('artifacts/coverage/js/lcov.info');
}
if(pct==null){
  console.error('Could not locate coverage summary or lcov.info');
  process.exit(1);
}
pct = Math.round(pct*100)/100;
const threshold = parseFloat(process.env.JS_COV_MIN||'60');
if(pct < threshold){
  console.error(`JS coverage ${pct}% below threshold ${threshold}%`);
  process.exit(2);
}
console.log(`JS coverage ${pct}% >= threshold ${threshold}%`);