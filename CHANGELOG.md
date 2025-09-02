# Changelog

## [0.5.1] - 2025-09-02

### Changed (0.5.1)

- **NPM Package Optimization**: Enhanced package.json with homepage, bugs tracking, and Node.js engine requirements.
- **Improved Discoverability**: Added comprehensive keywords for better NPM search results (wysiwyg, contenteditable, html-editor, blazor, asp-net-core).
- **Package Size Optimization**: Added .npmignore to exclude development files, reducing package size and install time.
- **Publishing Pipeline**: Validated package structure with npm pack, ensuring reliable distribution.

### Internal (0.5.1)

- Package contents optimized to 428.2 kB compressed (21 files) excluding tests and build artifacts.
- Node.js >= 16.0.0 requirement specified for modern JavaScript features.
- prepublishOnly script ensures build and test validation before publishing.

### Migration Notes (0.5.1)

No breaking changes. All existing integrations continue to work unchanged. This is purely a packaging and metadata improvement for NPM distribution.

## [0.5.0] - 2025-09-02

### Added (0.5.0)

- **Improved Development API**: New industry-standard `EdNotesRichText.init()` method with declarative configuration.
- **Plugin System**: Modular plugin registry with official plugins (core, formatting, blocks, lists, links, tables, tasks, math).
- **Toolbar DSL**: String-based toolbar configuration with pipe-separated groups (e.g., `'undo redo | bold italic | link'`).
- **CSS Variables Theming**: Professional theming system with CSS custom properties for colors, fonts, spacing.
- **TypeScript Support**: Complete TypeScript declarations for improved developer experience.
- **NPM Package**: Published as `ednotes-richtext` with CDN support via jsDelivr.
- **Enhanced Loader**: Auto-injecting CSS loader with fallback support for modern and legacy browsers.
- **Framework Ready**: Structured for future React/Blazor wrapper components.

### Changed (0.5.0)

- **Modern Package Structure**: Added `main`, `module`, and `types` fields to `package.json`.
- **Professional Themes**: Added `professional`, `high-contrast`, and `dyslexia` themes with CSS variables.
- **Enhanced Documentation**: New comprehensive demo page showcasing the improved API.
- **Build System**: Rollup configuration now produces ESM, UMD, and minified UMD bundles.

### Backward Compatibility (0.5.0)

- Existing `RichText.attach()` method continues to work unchanged.
- All current integrations remain functional without modification.
- Legacy bundle paths and initialization patterns supported.

### Migration Guide (0.5.0)

**New Recommended Approach:**

```html
<!-- CDN -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/ednotes-richtext@0.5.1/dist/ednotes.richtext.css">
<script src="https://cdn.jsdelivr.net/npm/ednotes-richtext@0.5.1/dist/ednotes.richtext.umd.min.js"></script>
<script>
EdNotesRichText.init({
  selector: 'textarea',
  plugins: 'core formatting lists links',
  toolbar: 'undo redo | bold italic | numlist bullist | link'
});
</script>
```

**Legacy Approach (Still Supported):**

```html
<script type="module">
import { RichText } from '/_content/EdNotes.RichText/editor/ednotes.richtext.bundle.js';
RichText.attach('#notes', { historyLimit: 100 });
</script>
```

## [0.4.1] - 2025-09-02

### Fixed (0.4.1)

- Documentation demo now loads without ES module errors: replaced copied ESM bundle + relative core imports with a self‑contained IIFE (`docs/ednotes.richtext.bundle.js`) safe for direct `<script>` inclusion.
- Removed duplicate initialization scripts in `docs/index.html` preventing double attach / confusing console noise.
- Added explicit demo textarea (`#demo-editor`) inside theme demo section so `RichText.attach` finds a target consistently.

### Changed (0.4.1)

- Bumped `RichText.version` to `0.4.1`.
- Simplified demo initialization script (single guarded bootstrap + theme button wiring).

### Internal (0.4.1)

- Demo bundle contains trimmed inline implementations (command bus subset, normalization-lite) to avoid requiring a build step for docs preview.
- Updated tests to assert new version constant.

### Migration Notes (0.4.1)

No action for consumers using the packaged library. The standalone docs bundle is ONLY for the static demo page—continue using the distributed build under `wwwroot/editor/` for production.

## [0.4.0] - 2025-09-02

### Fixed (0.4.0)

- Documentation demo page (`docs/index.html`) updated so the rich text editor initializes reliably when opened directly from the filesystem (copied bundle & CSS locally instead of using relative up-level path).
- Theme switching logic now applies classes at `document.body` level for predictable CSS variable cascade; added defensive logging to aid future troubleshooting.
- Simplified demo seed content to valid HTML (removed pseudo‑markdown markers) ensuring parser / normalizer starts from clean DOM and toolbar renders expected state.

### Changed (0.4.0)

- Bumped version to `0.4.0` (exposed via `RichText.version`).
- Minor script hardening in demo: error guards when `RichText` is not yet defined.

### Internal (0.4.0)

- No runtime functional changes to core editor commands besides version constant.
- Maintains high JS test coverage (≈84% statements / ≈76% branches) validated after demo adjustments.

### Migration Notes (0.4.0)

No action required for integrators. If referencing the demo as a template, ensure you copy the built `editor.css` and `ednotes.richtext.bundle.js` into your served assets and call `RichText.attach('#your-textarea-id')` after `DOMContentLoaded`.

## [0.3.0] - 2025-08-31

### Added

- **Math Equation Support**: Integrated KaTeX for LaTeX rendering in `<span class="math">` elements. Added `math:add` command with toolbar button (∑).
- **Mobile Responsiveness**: Improved CSS for tablets/phones with larger buttons, wrapped toolbar, and 16px font to prevent zoom.
- **Education-Friendly Themes**: Added `.theme-high-contrast` and `.theme-dyslexia` CSS classes for accessibility.
- **HTML Export**: New `exportHTML()` method and `RichText.exportAllHTML()` API for full HTML output.
- **Test Coverage**: Added tests for loader script dynamic import logic.

### Changed

- Extended schema to allow `span` with `class` attribute for math elements.
- Updated Normalizer to sanitize math content and prevent XSS in LaTeX input.

### Internal

- Bumped version to 0.3.0.
- Maintained security-first approach with math content sanitization.

### Removed (0.2.6)

- Entire `samples/` directory (legacy MVC5 & ASP.NET Core sample apps) removed from repo & solution to streamline `dotnet test` (eliminates non-test project VSTest target errors).

### Added / Tests

- New JS test suites: link add/remove & task list toggle, block/list command toggle, table & task list normalization scenarios.
- Enhanced shared `selectAll` test helper to handle element nodes without direct text child (prevents `IndexSizeError`).

### Fixed

- Stabilized link removal test by ensuring selection anchored inside `<a>` element before `link:remove` execution.
- Adjusted list/task toggle tests to reflect history design (block/list conversions not currently undo-tracked unless wrapped in transaction).

### Internal (0.2.6)

- Version bump only; no runtime editor command logic changes besides test helper.
- Maintains ~78% JS statement coverage; groundwork laid for future loader & CommandBus branch coverage.


All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog and this project adheres to Semantic Versioning.

## [0.2.5] - 2025-08-29

### CI Fixes

- Release workflow YAML indentation for `.NET Tests` step (syntax error at line 46 resolved).
- Converted publish one-liner to readable heredoc script section for clarity/maintainability.

### Documentation

- Added explicit version badge and updated README install snippet to latest version.

### Internal Notes

- No library code changes; packaging & workflow polish only.

## [0.2.4] - 2025-08-29

### Fixed (CI)

- Converted inline PowerShell-problematic .NET coverage threshold one-liner into script (`dotnet-coverage-threshold.mjs`) to eliminate regex escaping/parser error.
- Corrected indentation of `.NET Coverage Threshold` step after script migration.
- Added OS-specific suffixes to artifact names to avoid 409 conflicts across matrix jobs.
- Finalized JS Tests step indentation and structure for YAML validity.
- Release workflow: ensured tests run in Release configuration & removed bash conditional for publish gating (now Node-based logic).

### Internal (0.2.4)

- Stability-focused maintenance release; no runtime library code changes.

## [0.2.1] - 2025-08-29

### Added (0.2.1)

- Implemented server `HtmlPolicySanitizer` (allowlist enforcement + link protocol policy parity with client normalizer).
- Performance regression gate step in CI (baseline 0.60 ms/block @ 20% tolerance).
- Sanitizer edge-case tests (encoded / obfuscated javascript: schemes, attribute stripping, tag allowlist validation).
- Extensive JavaScript test coverage expansion: toolbar command execution (block/list/link/task), paste normalization & link policy enforcement, history trimming & limit, autosave + export behaviors, accessibility shortcuts & live region announcements, task list defaults, list indent/outdent mechanics.
- Shared JS test utilities and TextEncoder/TextDecoder polyfill setup for stable jsdom execution.

### Fixed (0.2.1)

- .NET Framework 4.7.2 compatibility: removed usage of `AsSpan`, range/index (`[^1]`) operators in sanitizer implementation.

### Internal (0.2.1)

- Hardened CI artifact upload steps (conditional uploads, directory prep, xplat coverage extract).
- Unified test harness refactor replacing ad-hoc jsdom bootstrapping with helper (`tests/js/test-utils.mjs`), raising JS coverage to ~80% statements / ~72% branches.
- Removed unstable synthetic history batching micro-test (logic already covered by higher-level history tests); added selection bookmark invalidation and deep style/script stripping edge tests instead.

## [0.2.0] - 2025-08-29

### Removed (0.2.0)

- Legacy `yourorg.richtext.bundle.js` file (use `ednotes.richtext.bundle.js`).

### Added (0.2.0)

- Initial `CHANGELOG.md`.

### Changed (0.2.0)

- Sample app updated to reference new bundle and static asset path `_content/EdNotes.RichText/...`.

### Migration Notes

If you previously referenced:

```html
<script src="~/_content/YourOrg.RichText/editor/yourorg.richtext.bundle.js"></script>
```

Replace with:

```html
<script src="~/_content/EdNotes.RichText/editor/ednotes.richtext.bundle.js"></script>
```

No other API changes in this release.

## [0.1.0] - 2025-08-29

### Initial Features

- Initial release: secure, lightweight rich-text editor RCL targeting net8.0 & net472 with strict schema, client/server sanitization, accessibility, undo/redo, autosave, exports, list & task list support, link policy enforcement, table normalization, benchmarks, coverage & CI pipeline.
