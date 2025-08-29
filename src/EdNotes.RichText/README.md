# EdNotes.RichText

For complete documentation see the root repository `README.md`.

## Summary

Security‑first, no‑media rich text editor with:

* Strict allowlist schema (headings, lists, task lists, tables, core blocks, minimal inline marks)
* Dual sanitization (client normalizer + server `HtmlPolicySanitizer`)
* Link protocol allowlist (`https`, `http`, `mailto`, `tel`) + enforced target/rel
* Undo/redo with batching, autosave hooks, plain + markdown export
* Accessible toolbar (ARIA, roving tabindex, live announcements)
* CI performance regression gate

Usage examples and API details are in the root README.

License: MIT
