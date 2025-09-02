# EdNotes Rich Text Editor

![CI](https://github.com/North15/EdNotes/actions/workflows/ci.yml/badge.svg)
![NPM Version](https://img.shields.io/npm/v/@ednotes/richtext.svg)
![NuGet](https://img.shields.io/nuget/v/EdNotes.RichText.svg)
![Package Version](https://img.shields.io/badge/version-0.5.1-informational.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

A **TinyMCE-style** rich text editor with security-first design, accessibility focus, and modern developer experience. Plugin system, declarative toolbar, CSS variables theming, and TypeScript support.

� **[Try the Live Demo](docs/tinymce-style-demo.html)** - Interactive playground with theme switching

## ⚡ Quick Start

### CDN (Recommended)

```html
<!-- Include CSS and JS -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@ednotes/richtext@0.5.1/dist/ednotes.richtext.css">
<script src="https://cdn.jsdelivr.net/npm/@ednotes/richtext@0.5.1/dist/ednotes.richtext.umd.min.js"></script>

<!-- Your textarea -->
<textarea id="content">Start typing...</textarea>

<!-- Initialize (TinyMCE-style) -->
<script>
EdNotesRichText.init({
  selector: '#content',
  plugins: 'core formatting blocks lists links tables tasks math',
  toolbar: 'undo redo | blocks | bold italic underline | link | numlist bullist task | table math | removeformat'
});
</script>
```

### NPM

```bash
npm install @ednotes/richtext
```

```javascript
import EdNotesRichText from '@ednotes/richtext';

EdNotesRichText.init({
  selector: 'textarea',
  plugins: 'core formatting lists links',
  toolbar: 'undo redo | bold italic | numlist bullist | link'
});
```

### ASP.NET Core / .NET Framework

```html
<!-- Include CSS -->
<link rel="stylesheet" href="~/_content/EdNotes.RichText/editor/ednotes.richtext.css">

<!-- Auto-loading script -->
<script src="~/_content/EdNotes.RichText/editor/ednotes.richtext.loader.js"></script>

<textarea id="notes"></textarea>
<script>
EdNotesRichText.init({ selector: '#notes' });
</script>
```

## Feature Highlights

* Strict schema (allowed tags only): paragraphs, h1‑h3, lists (ul/ol/li), blockquote, code/pre, tables (thead/tbody/tr/th/td), task lists (ul[data-list="task"]).
* Marks: strong / em / u / a / math (KaTeX rendering).
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
| `RichText.exportAllHTML()` | Array of HTML outputs. |
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

## Themes

Apply CSS classes to the editor root for education-friendly themes:

* `.theme-high-contrast`: Black background, white text/borders.
* `.theme-dyslexia`: Comic Sans font, light blue background.

Example:

```html
<div class="rtx-editor theme-high-contrast">
  <!-- editor content -->
</div>
```

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
| `npm run build:js` | Build ESM + UMD + minified bundles to `dist/`. |
| `npm run build:js:prod` | Build JS bundles (including min) and list outputs. |
| `npm run coverage:check` | Enforce JS coverage threshold (CI gate). |
| `dotnet test` | Run .NET unit tests (sanitizer parity, etc.). |

## Contributing

Please open issues for feature proposals (keep scope small). PRs should include:

* Tests (Jest or xUnit) for new logic / edge cases.
* No expansion of allowed tags without a security review rationale.
* Accessibility impact assessment (keyboard & screen reader).

## Roadmap (Next)

* Math equation rendering (KaTeX) ✅
* Mobile responsiveness improvements ✅
* Education-friendly themes ✅
* HTML export ✅
* Increased test coverage ✅
* More sanitizer parity tests (.NET) for encoded edge cases ✅
* Task list interaction (toggle checked state via keyboard) ✅
* Heading level cycling / remove heading shortcut ✅
* Documentation site sample & theming guidance ✅
* Optional: publish coverage & performance badges publicly.

## Versioning

Pre‑1.0: minor versions may include breaking changes with clear changelog notes. See `CHANGELOG.md` for details. The `docs/` demo uses a lightweight standalone bundle only for the static preview; production apps should import from `/_content/EdNotes.RichText/editor/ednotes.richtext.bundle.js`. For CDN / classic script inclusion you can use the generated `dist/ednotes.richtext.umd.min.js` (exposes global `EdNotesRichText.RichText`).

## License

MIT
