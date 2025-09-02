#!/usr/bin/env node
// Test script to verify badge generation and gist upload (simulation)

import fs from 'node:fs';
import { execSync } from 'node:child_process';

console.log('🧪 Testing Badge Generation Setup...\n');

// Step 1: Run tests to generate coverage data
console.log('1. Running tests to generate coverage data...');
try {
    execSync('npm test', { stdio: 'pipe' });
    console.log('   ✅ Tests completed');
} catch (error) {
    console.log('   ❌ Tests failed');
    process.exit(1);
}

// Step 2: Generate benchmark data
console.log('2. Generating performance benchmark...');
try {
    const benchOutput = execSync('node scripts/bench-normalize.mjs 400', { encoding: 'utf8' });
    fs.mkdirSync('artifacts', { recursive: true });
    fs.writeFileSync('artifacts/benchmark-normalize.json', benchOutput);
    console.log('   ✅ Benchmark data generated');
} catch (error) {
    console.log('   ❌ Benchmark failed:', error.message);
}

// Step 3: Generate badges
console.log('3. Generating badge JSON files...');
try {
    execSync('npm run badges:update', { stdio: 'pipe' });
    console.log('   ✅ Badge files generated');
} catch (error) {
    console.log('   ❌ Badge generation failed:', error.message);
}

// Step 4: Verify badge files
console.log('4. Verifying generated files...');
const badgeDir = 'artifacts/badges';
if (fs.existsSync(badgeDir)) {
    const files = fs.readdirSync(badgeDir).filter(f => f.endsWith('.json'));
    console.log(`   📁 Found ${files.length} badge files:`);
    
    files.forEach(file => {
        const content = JSON.parse(fs.readFileSync(`${badgeDir}/${file}`, 'utf8'));
        console.log(`   - ${file}: ${content.label} = ${content.message} (${content.color})`);
    });
} else {
    console.log('   ❌ No badge directory found');
}

// Step 5: Show next steps
console.log('\n🎯 Next Steps:');
console.log('1. Create a public GitHub Gist at https://gist.github.com');
console.log('2. Add BADGE_GIST_ID secret to your repository');
console.log('3. Replace YOUR_GIST_ID in README.md with your actual gist ID');
console.log('4. Push changes to trigger automated badge updates');

console.log('\n✅ Local test completed successfully!');
