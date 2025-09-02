# Badge Automation Setup

This repository includes automated badge generation for coverage, performance, and test metrics.

## Automation Options

### Option 1: Simple Static Badges (Current)
Current badges use static values that need manual updates.

### Option 2: Dynamic Shields.io Endpoint Badges (Recommended)
Uses JSON files hosted on GitHub Gist to automatically update badges.

### Option 3: GitHub Actions Badge Service
Uses GitHub Actions cache or artifacts to serve badge data.

## Setup Instructions for Dynamic Badges

### 1. Create a Public GitHub Gist
1. Go to https://gist.github.com
2. Create a new **public** gist with any filename (e.g., `badges.md`)
3. Note the Gist ID from the URL (e.g., `https://gist.github.com/username/GIST_ID_HERE`)

### 2. Update Repository Secrets
Add these secrets to your GitHub repository:
- `BADGE_GIST_ID`: Your gist ID from step 1

### 3. Update README.md Badges
Replace the current badge URLs with endpoint URLs:

```markdown
[![JS Test Coverage](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/North15/8e05a23df61bc45321336edc41f1bc96/raw/js-coverage.json)](https://github.com/North15/EdNotes/actions/workflows/ci.yml)
[![Performance](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/North15/8e05a23df61bc45321336edc41f1bc96/raw/performance.json)](https://github.com/North15/EdNotes/actions/workflows/ci.yml)
```

### 4. Manual Badge Update Script
Run locally to generate badge files:
```bash
npm test                    # Generate coverage data
npm run bench:normalize     # Generate performance data
npm run badges:update       # Generate badge JSON files
```

Then manually upload the JSON files from `artifacts/badges/` to your gist.

### 5. Full Automation (Advanced)
To fully automate badge uploads, you can:

1. Use a GitHub Action like `exuanbo/actions-deploy-gist`
2. Add the following to your CI workflow:

```yaml
- name: Deploy badges to gist
  uses: exuanbo/actions-deploy-gist@v1
  with:
    token: ${{ secrets.GIST_TOKEN }}
    gist_id: ${{ secrets.BADGE_GIST_ID }}
    file_path: artifacts/badges/*.json
```

## Local Development

Test badge generation locally:
```bash
npm run badges:update
```

Generated files will be in `artifacts/badges/`:
- `js-coverage.json` - JavaScript test coverage percentage
- `dotnet-coverage.json` - .NET test coverage percentage  
- `performance.json` - Performance benchmark (ms per block)
- `test-count.json` - Number of test suites

## Badge Colors

Badges automatically use appropriate colors:
- **Coverage**: 90%+ (bright green), 80%+ (green), 70%+ (yellow green), 60%+ (yellow), <60% (orange)
- **Performance**: ≤0.15ms (bright green), ≤0.30ms (green), ≤0.50ms (yellow), >0.50ms (orange)
- **Tests**: Always bright green for passing tests
