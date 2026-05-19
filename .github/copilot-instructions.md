# Project Guidelines

## Architecture
- EdNotes has two connected ownership areas: the browser editor under `src/EdNotes.RichText/wwwroot/editor/` and the .NET package under `src/EdNotes.RichText/`.
- Treat `src/EdNotes.RichText/HtmlPolicySanitizer.cs` as the authoritative server-side safety boundary.
- Keep client normalization and server sanitization in parity unless a task explicitly requires a deliberate difference.

## Build And Test
- Install with `npm ci` and restore .NET with `dotnet restore EdNotes.sln` when needed.
- Prefer focused validation first, then wider checks.
- Main validation commands are `npm test`, `npm run lint`, `npm run build:js`, and `dotnet test`.
- When adjusting repository tooling or scripts, keep commands Windows-compatible.

## Security And Accessibility
- Preserve the allowlist-based security model described in `README.md` and `SECURITY.md`.
- Do not add new allowed tags, attributes, URL schemes, or scriptable surfaces without explicit rationale and matching regression tests.
- Preserve keyboard navigation, ARIA behavior, focus handling, and live announcements.

## Conventions
- Prefer minimal root-cause fixes over broad rewrites or unrelated cleanup.
- Add or update Jest or xUnit coverage for behavior changes, especially for sanitizer, normalization, keyboard, and link-policy logic.
- When public behavior changes, check whether `README.md`, `CHANGELOG.md`, `types/index.d.ts`, or docs under `docs/` also need updates.
- Follow the contributor guidance in `CONTRIBUTING.md` for release-related and test-related work.