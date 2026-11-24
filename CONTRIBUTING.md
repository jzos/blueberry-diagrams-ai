# Contributing

Blueberry is MIT licensed. Contributions welcome.

- Run `npm test` and `npm run pack:check` before opening a pull request.
- Keep the catalog in `docs/MASTER_CATALOG.md`, then regenerate `src/catalog.json` with `npm run catalog:build` (Python 3 needed only to regenerate).
- Add a test for every new renderer or export format.
- Do not claim standards compliance, scientifically correct rendering, or export support without verification.
- Never use user-provided labels as raw HTML. Use `esc` for SVG/XML text.
- For server changes, preserve loopback-only defaults and authorization when binding to non-loopback interfaces.

Consult `SECURITY.md` before proposing public hosting.
