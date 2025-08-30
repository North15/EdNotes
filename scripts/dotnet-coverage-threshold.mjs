import fs from 'node:fs';

// Simple Cobertura line-rate extractor and threshold enforcer for .NET coverage
// Usage: node scripts/dotnet-coverage-threshold.mjs [path] [minPct]
// Env override: DOTNET_COV_MIN

const file = process.argv[2] || 'artifacts/coverage/dotnet.cobertura.xml';
const min = parseFloat(process.env.DOTNET_COV_MIN || process.argv[3] || '70');

if(!fs.existsSync(file)){
  console.error(`Error: coverage file not found: ${file}`);
  process.exit(1);
}
const xml = fs.readFileSync(file,'utf8');
const match = xml.match(/line-rate="([0-9.]+)"/);
if(!match){
  console.error('Error: line-rate attribute not found in cobertura XML');
  process.exit(1);
}
const pct = parseFloat(match[1]) * 100;
if(isNaN(pct)){
  console.error('Error: parsed coverage is NaN');
  process.exit(1);
}
const pctStr = pct.toFixed(2);
if(pct < min){
  console.error(`Coverage ${pctStr}% < min ${min}%`);
  process.exit(2);
}
console.log(`Coverage ${pctStr}% (min ${min}%)`);