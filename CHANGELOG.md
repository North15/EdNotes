# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog and this project adheres to Semantic Versioning.

## [0.2.1] - 2025-08-29

### Added (0.2.1)

- Implemented server `HtmlPolicySanitizer` (allowlist enforcement + link protocol policy parity with client normalizer).
- Performance regression gate step in CI (baseline 0.60 ms/block @ 20% tolerance).
- Sanitizer edge-case tests (encoded / obfuscated javascript: schemes, attribute stripping, tag allowlist validation).

### Fixed (0.2.1)

- .NET Framework 4.7.2 compatibility: removed usage of `AsSpan`, range/index (`[^1]`) operators in sanitizer implementation.

### Internal (0.2.1)

- Hardened CI artifact upload steps (conditional uploads, directory prep, xplat coverage extract).

## [0.2.0] - 2025-08-29

### Removed

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
