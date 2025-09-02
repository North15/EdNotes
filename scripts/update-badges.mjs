#!/usr/bin/env node
// Script to generate badge JSON files for shields.io endpoint badges

import fs from 'node:fs';
import path from 'node:path';

const GIST_ID = process.env.BADGE_GIST_ID || 'YOUR_GIST_ID';
const OUTPUT_DIR = 'artifacts/badges';

// Ensure output directory exists
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

function createBadge(label, message, color) {
    return {
        schemaVersion: 1,
        label,
        message,
        color
    };
}

function getColorForCoverage(pct) {
    if (pct >= 90) return 'brightgreen';
    if (pct >= 80) return 'green';
    if (pct >= 70) return 'yellowgreen';
    if (pct >= 60) return 'yellow';
    return 'orange';
}

function getColorForPerformance(msPerBlock) {
    if (msPerBlock <= 0.15) return 'brightgreen';
    if (msPerBlock <= 0.30) return 'green';
    if (msPerBlock <= 0.50) return 'yellow';
    return 'orange';
}

// Generate JS Coverage Badge (with fallbacks)
try {
    let lineCoverage = null;
    if (fs.existsSync('artifacts/coverage/js/coverage-summary.json')) {
        const coverageData = JSON.parse(fs.readFileSync('artifacts/coverage/js/coverage-summary.json', 'utf8'));
        lineCoverage = coverageData.total.lines.pct;
        console.log('ℹ️ JS coverage from coverage-summary.json');
    } else if (fs.existsSync('artifacts/coverage/js/coverage-final.json')) {
        const finalData = JSON.parse(fs.readFileSync('artifacts/coverage/js/coverage-final.json', 'utf8'));
        // Some Istanbul outputs (with json reporter only) omit the aggregated lines info per file.
        let hasLinesData = false;
        let covered = 0, total = 0;
        for (const f of Object.values(finalData)) {
            if (f && f.lines && typeof f.lines.total === 'number' && typeof f.lines.covered === 'number') {
                hasLinesData = true;
                covered += f.lines.covered;
                total += f.lines.total;
            }
        }
        if (hasLinesData && total > 0) {
            lineCoverage = +(covered / total * 100).toFixed(2);
            console.log('ℹ️ JS coverage from coverage-final.json (lines)');
        } else {
            // No lines section: fall back immediately to lcov parsing if present
            if (fs.existsSync('artifacts/coverage/js/lcov.info')) {
                const lcov = fs.readFileSync('artifacts/coverage/js/lcov.info', 'utf8');
                let lcCovered = 0, lcTotal = 0;
                for (const line of lcov.split(/\r?\n/)) {
                    if (line.startsWith('DA:')) {
                        const [, execCount] = line.substring(3).split(',');
                        lcTotal++; if (parseInt(execCount, 10) > 0) lcCovered++;
                    }
                }
                if (lcTotal > 0) {
                    lineCoverage = +(lcCovered / lcTotal * 100).toFixed(2);
                    console.log('ℹ️ JS coverage from lcov.info (fallback after coverage-final lacked lines data)');
                }
            } else {
                console.log('ℹ️ coverage-final.json present but lacks lines data; no lcov.info fallback found');
            }
        }
    } else if (fs.existsSync('artifacts/coverage/js/lcov.info')) {
        const lcov = fs.readFileSync('artifacts/coverage/js/lcov.info', 'utf8');
        let covered = 0, total = 0;
        for (const line of lcov.split(/\r?\n/)) {
            if (line.startsWith('DA:')) {
                const [, execCount] = line.substring(3).split(',');
                total++; if (parseInt(execCount, 10) > 0) covered++;
            }
        }
        if (total > 0) lineCoverage = +(covered / total * 100).toFixed(2);
        console.log('ℹ️ JS coverage from lcov.info');
    }
    if (lineCoverage != null) {
        const badge = createBadge('js coverage', `${lineCoverage}%`, getColorForCoverage(lineCoverage));
        fs.writeFileSync(path.join(OUTPUT_DIR, 'js-coverage.json'), JSON.stringify(badge, null, 2));
        console.log(`✅ JS Coverage badge: ${lineCoverage}%`);
    } else {
        console.log('⚠️ JS coverage data not found in any known file');
    }
} catch (error) {
    console.error('❌ Error generating JS coverage badge:', error.message);
}

// Generate .NET Coverage Badge (scan for cobertura xml if not copied yet)
try {
    let coberturaPath = null;
    if (fs.existsSync('artifacts/coverage/dotnet.cobertura.xml')) {
        coberturaPath = 'artifacts/coverage/dotnet.cobertura.xml';
    } else if (fs.existsSync('artifacts/test-results/dotnet')) {
        const walk = d => fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>{
            const p = d + '/' + e.name; return e.isDirectory()? walk(p):(p.endsWith('.cobertura.xml')?[p]:[]);
        });
        const candidates = walk('artifacts/test-results/dotnet');
        if (candidates.length) coberturaPath = candidates[0];
    }
    if (coberturaPath) {
        const xml = fs.readFileSync(coberturaPath, 'utf8');
        const match = xml.match(/line-rate="([0-9.]+)"/);
        if (match) {
            const coverage = (parseFloat(match[1]) * 100).toFixed(2);
            const badge = createBadge('dotnet coverage', `${coverage}%`, getColorForCoverage(coverage));
            fs.writeFileSync(path.join(OUTPUT_DIR, 'dotnet-coverage.json'), JSON.stringify(badge, null, 2));
            console.log(`✅ .NET Coverage badge: ${coverage}% (from ${coberturaPath})`);
        } else {
            console.log('⚠️ Could not parse line-rate in cobertura file');
        }
    } else {
        console.log('⚠️ No .NET coverage file located');
    }
} catch (error) {
    console.error('❌ Error generating .NET coverage badge:', error.message);
}

// Generate Performance Badge
try {
    if (fs.existsSync('artifacts/benchmark-normalize.json')) {
        const perfData = JSON.parse(fs.readFileSync('artifacts/benchmark-normalize.json', 'utf8'));
        const msPerBlock = parseFloat(perfData.msPerBlock);
        const badge = createBadge('performance', `${msPerBlock}ms/block`, getColorForPerformance(msPerBlock));
        fs.writeFileSync(path.join(OUTPUT_DIR, 'performance.json'), JSON.stringify(badge, null, 2));
        console.log(`✅ Performance badge: ${msPerBlock}ms/block`);
    } else {
        console.log('⚠️ No performance benchmark data found');
    }
} catch (error) {
    console.error('❌ Error generating performance badge:', error.message);
}

// Generate Test Count Badge
try {
    // Count from test output or use a simple approach
    const testFiles = fs.readdirSync('tests/js').filter(f => f.endsWith('.spec.mjs')).length;
    const badge = createBadge('test suites', `${testFiles} suites`, 'brightgreen');
    fs.writeFileSync(path.join(OUTPUT_DIR, 'test-count.json'), JSON.stringify(badge, null, 2));
    console.log(`✅ Test count badge: ${testFiles} suites`);
} catch (error) {
    console.error('❌ Error generating test count badge:', error.message);
}

console.log(`\n📁 Badge files generated in ${OUTPUT_DIR}/`);
console.log('🔗 To use these badges, upload the JSON files to a GitHub Gist and use:');
console.log(`![Badge](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/YOUR_USERNAME/${GIST_ID}/raw/FILENAME.json)`);
