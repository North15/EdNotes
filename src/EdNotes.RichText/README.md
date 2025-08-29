# EdNotes.RichText

Secure, JavaScript-only rich text editor for ASP.NET Core + MVC5 (Razor). No media handling; strict HTML schema; server-side sanitization authoritative. All links open in a new tab with `target="_blank"` and `rel="noopener noreferrer"`.

## Features (V1 scope)

- Headings H1–H3, paragraph
- Bold / italic / underline
- Lists (ul/ol) + checklists (ul[data-list="task"] li[data-checked])
- Blockquote, code block (pre/code), hr
- Tables (structural ops only)
- Links (scheme allowlist: http, https, mailto, tel) — forced target/rel
- Undo/redo (planned), paste cleanup (planned)

## Usage (ASP.NET Core sample)

Reference Static Web Assets:

```html
<link rel="stylesheet" href="/_content/EdNotes.RichText/editor/editor.css" />
<script type="module" src="/_content/EdNotes.RichText/editor/ednotes.richtext.bundle.js"></script>
<script type="module" src="/js/demo-init.js"></script>
```

`demo-init.js` (sample host):

```js
import { RichText } from '/_content/EdNotes.RichText/editor/ednotes.richtext.bundle.js';
RichText.attach('#notes');
```

Textarea markup:

```html
<textarea id="notes" name="notes"></textarea>
```

## Security / Policy

- Server sanitizer is authoritative (strict allowlist). Client mirrors policy.
- All external links: target="_blank" rel="noopener noreferrer".
- Disallowed: inline style attributes, script/event attributes, media tags.

## Licensing

MIT
