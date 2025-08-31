# Changelog

## [0.2.6] - 2025-08-31

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

### Added (initial)

- Initial `CHANGELOG.md`.

### Changed

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

### Added

- Initial release: secure, lightweight rich-text editor RCL targeting net8.0 & net472 with strict schema, client/server sanitization, accessibility, undo/redo, autosave, exports, list & task list support, link policy enforcement, table normalization, benchmarks, coverage & CI pipeline.
