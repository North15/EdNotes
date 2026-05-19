# Fixes And Improvements Checklist

## Required Fixes

- [ ] Fix the Local Test Page launch instructions in [README.md](README.md). The current example serves only `docs`, but [docs/test-page.html](docs/test-page.html) loads editor assets from `../src/EdNotes.RichText/wwwroot/editor`, so the documented command and URL do not work as written.
- [ ] Make Reset restore the original seed HTML even after Destroy in [docs/test-page.html](docs/test-page.html). The current reset path only reattaches the editor when no instance exists, which preserves whatever `destroy()` last synced back into the textarea instead of restoring `defaultValue`.
- [ ] Seed the demo with a real task list in [docs/test-page.html](docs/test-page.html). The sample markup uses `li[data-checked]` inside a plain `ul`, but the editor only treats `ul[data-list="task"]` as a task list.

## Improvements

- [ ] Add automated coverage for the demo lifecycle flow in [docs/test-page.html](docs/test-page.html), especially destroy, reset, and reattach behavior. These regressions are not covered by the current test suite.
- [ ] Preserve the selected theme across destroy and reattach in [docs/test-page.html](docs/test-page.html). The current theme picker only updates editors that already exist.
- [ ] Add a short validation note in [README.md](README.md) explaining that the demo must be served from the repository root, or change the demo asset paths so it can be served directly from `docs`.
- [ ] Expand the demo checklist in [README.md](README.md) or [docs/test-page.html](docs/test-page.html) with a couple of explicit manual verification steps for task toggling, autosave output, and theme switching.
