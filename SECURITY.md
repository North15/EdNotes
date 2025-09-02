# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 0.2.x   | ✅ Security fixes |
| < 0.2.0 | ❌ Update to latest |

## Reporting a Vulnerability

Please email or open a *private* security advisory in GitHub (Security > Advisories) with:

- Affected version(s)
- Reproduction steps / PoC HTML if relevant
- Impact assessment (e.g., XSS vector, privilege escalation)

You'll receive an acknowledgement within 3 business days.

## Disclosure Process

1. Triage & confirm.
2. Fix & add regression tests.
3. Publish patched release with `SECURITY.md` update if needed.
4. Credit reporter (optional) in CHANGELOG.

## Hardening Notes

- Strict allowlist schema & dual client/server sanitization.
- Link protocol enforcement with trimming & percent-decoding.
- No media embedding or script injection surfaces intentionally exposed.
