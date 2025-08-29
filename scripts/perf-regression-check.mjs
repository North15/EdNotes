import fs from 'node:fs';

const file = 'artifacts/benchmark-normalize.json';
if(!fs.existsSync(file)){
  console.error('No benchmark file found at', file);
  process.exit(1);
}
const data = JSON.parse(fs.readFileSync(file,'utf8'));
// Expect structure { nodes, blocks, msPerBlock, totalMs }
const baselineEnvVar = process.env.PERF_BASELINE_MS_PER_BLOCK; // e.g. 0.60
if(!baselineEnvVar){
  console.log('No PERF_BASELINE_MS_PER_BLOCK set; passing (first baseline). Current msPerBlock:', data.msPerBlock);
  process.exit(0);
}
const baseline = parseFloat(baselineEnvVar);
const current = parseFloat(data.msPerBlock);
const tolerancePct = parseFloat(process.env.PERF_TOLERANCE_PCT || '15');
if(isNaN(baseline) || isNaN(current)){
  console.error('Invalid numeric values. baseline:', baseline, 'current:', current);
  process.exit(1);
}
const allowed = baseline * (1 + tolerancePct/100);
if(current > allowed){
  console.error(`Performance regression: msPerBlock ${current} > allowed ${allowed.toFixed(4)} (baseline ${baseline}, tolerance ${tolerancePct}%)`);
  process.exit(2);
}
console.log(`Performance OK: msPerBlock ${current} ≤ allowed ${allowed.toFixed(4)} (baseline ${baseline}, tolerance ${tolerancePct}%)`);
