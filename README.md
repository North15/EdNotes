# EdNotes Rich Text Editor

![CI](https://github.com/North15/EdNotes/actions/workflows/ci.yml/badge.svg)
![NuGet](https://img.shields.io/nuget/v/EdNotes.RichText.svg)
![Package Version](https://img.shields.io/badge/version-0.2.5-informational.svg)
![NuGet Downloads](https://img.shields.io/nuget/dt/EdNotes.RichText.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

Coverage & performance badges are emitted as CI artifacts (not committed) while publishing options are evaluated.

A security‑first, lightweight rich‑text editor packaged as a Razor Class Library targeting `net8.0` and `net472`. No media embedding, strict allowlist schema, client + server sanitization parity, accessible toolbar & shortcuts, undo/redo history, autosave, and export helpers.

Bundle filename is `ednotes.richtext.bundle.js` (legacy `yourorg.richtext.bundle.js` removed starting 0.2.0; see CHANGELOG for migration details).

> Performance benchmark (normalization cost) runs in CI; a regression gate compares ms/block to a baseline (0.60 ms, 20% tolerance) and fails on excess.

## Installation

NuGet (current version 0.2.5):

```bash
dotnet add package EdNotes.RichText --version 0.2.5
```

Add static script reference:

### ASP.NET Core (`_Layout.cshtml`)

`_content` path is automatically mapped for static web assets from Razor Class Libraries.

```html
<script src="~/_content/EdNotes.RichText/editor/ednotes.richtext.bundle.js"></script>
```

### Classic MVC 5 / .NET Framework 4.7.2

The package drops files under `contentFiles/any/any/Scripts/EdNotes.RichText/`.
Reference (e.g. inside a layout view):

```html
<script src="~/Scripts/EdNotes.RichText/editor/ednotes.richtext.bundle.js"></script>
```

Ensure the package `IncludeAssets` brings `contentFiles` (default). If you use a custom packaging pipeline, verify the script copied to your web application's Scripts folder.

## Quick Start

```html
<textarea id="notes"></textarea>
<script src="~/_content/EdNotes.RichText/editor/ednotes.richtext.bundle.js"></script>
<script>
	RichText.attach('#notes', {
		historyLimit: 100,
		onChange: html => console.log('changed', html),
		autosaveIntervalMs: 5000,
		onAutosave: html => saveDraft(html),
		promptLink: () => window.prompt('Enter URL','https://')
	});
	// Later
	RichText.undo();
	RichText.redo();
	const [plain] = RichText.exportAllPlain();
	const [md] = RichText.exportAllMarkdown();
</script>
```

## Feature Highlights

* Strict schema (allowed tags only): paragraphs, h1‑h3, lists (ul/ol/li), blockquote, code/pre, tables (thead/tbody/tr/th/td), task lists (ul[data-list="task"]).
* Marks: strong / em / u / a.
* Sanitization: client normalization + server `HtmlPolicySanitizer` (allowlist attributes, link protocol enforcement, removal of scripts/iframes/styles, whitespace & encoded `javascript:` defense).
* Undo/redo history with idle typing batching & size cap.
* List indent/outdent via Tab / Shift+Tab.
* Task list toggle, ensures default `data-checked` flags.
* Table structural repair (moves stray `tr` into `tbody`, strips disallowed descendants).
* Link add/remove with protocol allowlist (`https:`, `http:`, `mailto:`, `tel:`) and automatic `target="_blank" rel="noopener noreferrer"`.
* Autosave hook (interval + change detection) for persistence.
* Exports: plain text (block separated) and minimal Markdown mapping.
* Accessibility: toolbar `role=toolbar` + roving tabindex, ARIA pressed state reflection, live region announcements (`Applied bold`, `Applied heading h2`), keyboard shortcuts (Ctrl+B/I/U, Ctrl+Alt+1/2/3, Tab indent), polite updates.
* Headless/test resilience: graceful fallback when `document.execCommand` not present (jsdom) and safe custom event dispatch.

## JavaScript API

| Method | Description |
| ------ | ----------- |
| `RichText.attach(selector, options)` | Enhance all matching `<textarea>` elements. |
| `RichText.undo()` / `redo()` | Global undo/redo across instances. |
| `RichText.triggerSave()` | Sync underlying textarea values. |
| `RichText.exportAllPlain()` | Array of plain text for each instance. |
| `RichText.exportAllMarkdown()` | Array of Markdown outputs. |
| `RichText._all()` | (Internal) array of editor instances (useful for tests). |

### Options

| Option | Type | Purpose |
| ------ | ---- | ------- |
| `historyLimit` | number | Max history entries (default 100). |
| `onChange` | `(html)=>void` | Called after each transactional change. |
| `autosaveIntervalMs` | number | Start autosave timer if provided. |
| `onAutosave` | `(html)=>void` | Receives html only when changed since last autosave tick. |
| `promptLink` | function | Override link input acquisition (testable). |

## Security Model

1. Textarea remains the authoritative source; DOM mutations are normalized before syncing.
2. Normalizer enforces allowlist: strips disallowed elements & attributes, removes nested scripts/iframes/styles, repairs table layout, ensures task list defaults.
3. Link policy: protocol allowlist (https/http/mailto/tel). Leading/trailing whitespace trimmed; percent‑decoding applied; `javascript:` (any casing or simple encoding) removed.
4. Server `HtmlPolicySanitizer` repeats the allowlist to avoid trusting client. Treat server sanitizer as authoritative before persisting / rendering.
5. No dynamic script execution APIs are used; inline event handlers and style attributes are removed during normalization.

## Accessibility (WCAG 2.2 AA Intent)

* Toolbar: roving tabindex with arrow key navigation; each button has `aria-label`.
* Live region (polite) announces successful command application.
* Keyboard shortcuts documented above; headings via Ctrl+Alt+1/2/3 for quick structure.
* Focus stays in editor; undo/redo notifies via updated content (consider adding optional audible notifications later).

## Performance

`scripts/bench-normalize.mjs` benchmarks normalization over synthetic documents. CI captures the JSON and invokes `scripts/perf-regression-check.mjs` with:

* PERF_BASELINE_MS_PER_BLOCK=0.60
* PERF_TOLERANCE_PCT=20

If average ms/block > baseline * (1 + tolerance/100) the build fails. After intentional performance-affecting changes capture a fresh benchmark and update env values in `.github/workflows/ci.yml`.

## Development Scripts

| Command | Action |
| ------- | ------ |
| `npm run test` | JS tests + coverage output under `artifacts/coverage/js`. |
| `npm run lint` | ESLint over editor sources. |
| `npm run bench:normalize` | Run normalization benchmark locally. |
| `npm run coverage:check` | Enforce JS coverage threshold (CI gate). |
| `dotnet test` | Run .NET unit tests (sanitizer parity, etc.). |

## Contributing

Please open issues for feature proposals (keep scope small). PRs should include:

* Tests (Jest or xUnit) for new logic / edge cases.
* No expansion of allowed tags without a security review rationale.
* Accessibility impact assessment (keyboard & screen reader).

## Roadmap (Next)

* More sanitizer parity tests (.NET) for encoded edge cases. ⏳
* Task list interaction (toggle checked state via keyboard). ⏳
* Heading level cycling / remove heading shortcut. ⏳
* Documentation site sample & theming guidance. ⏳
* Optional: publish coverage & performance badges publicly.

## Versioning

Pre‑1.0: minor versions may include breaking changes with clear changelog notes.

## License

MIT
