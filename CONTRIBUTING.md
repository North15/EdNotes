# Contributing

## Development Setup

1. Clone repo & install Node + .NET 8 SDK.
2. `npm ci`
3. `dotnet restore EdNotes.sln`
4. Run JS tests: `npm test`; .NET tests: `dotnet test`.

## Pull Request Guidelines

- Write tests (Jest / xUnit) for new behavior & security edge cases.
- Keep editor payload small; avoid large dependencies.
- Do not add new allowed HTML tags without a security rationale.
- Ensure accessibility: keyboard navigation & ARIA states.
- Run lint & tests before submitting.

## Commit Messages

Use conventional style (feat:, fix:, chore:, docs:, test:, perf:, refactor:). Example:
`feat: add blockquote normalization`

## Release Process

1. Update `CHANGELOG.md`.
2. Bump `package.json` and `src/EdNotes.RichText/EdNotes.RichText.csproj` to the same version.
3. Ensure you are signed in to npm and set `NUGET_API_KEY` in your shell.
4. Preview the release with `npm run publish:all -- -WhatIf`.
5. Publish with `npm run publish:all`.
6. Tag: `git tag vX.Y.Z`.
7. Push tag; GitHub Actions will build the tagged release, and NuGet publish remains safe because the workflow uses `--skip-duplicate`.

The `scripts/publish-packages.ps1` flow validates version parity, runs the package build/test steps by default, publishes npm, and pushes the NuGet package. Pass PowerShell flags after `--`, for example `npm run publish:all -- -SkipTests`.

## Security

See `SECURITY.md`. Report vulnerabilities privately.

## Code Style

- JS: modern ES modules, no transpilation required.
- C#: nullable enabled, latest language version.
- Prefer small pure helpers and explicit normalization steps.
