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
2. Bump `<Version>` in `EdNotes.RichText.csproj`.
3. Tag: `git tag vX.Y.Z`.
4. Push tag; GitHub Actions will build & publish NuGet package.

## Security

See `SECURITY.md`. Report vulnerabilities privately.

## Code Style

- JS: modern ES modules, no transpilation required.
- C#: nullable enabled, latest language version.
- Prefer small pure helpers and explicit normalization steps.
