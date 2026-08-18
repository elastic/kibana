# Troubleshooting

| Problem | Solution |
|---------|----------|
| Scout server fails to start | Check `node scripts/scout.js start-server` output; ensure port 5620 is free and `yarn kbn bootstrap` completed |
| Scout server slow to start | Can take 5+ min on first run; poll `http://localhost:5620/api/status` rather than assuming a fixed wait time |
| ES returns 401 | Default credentials are `elastic` / `changeme` |
| Feature flags not taking effect | Verify `config_sets/bug_fixer/kibana.yml` was written before starting the server; restart with `--serverConfigSet bug_fixer` |
| `auth_provider_hint=cloud-basic` redirect fails | Only works with Scout server (port 5620) — not the plain dev server |
| `red_rejected` — test passes | Test must assert correct behavior that is currently broken |
| Jest test not found | Verify path is correct and relative to repo root |
| `gh api` errors | `gh auth status` and `gh auth refresh` |
| "Please upgrade your browser" on login | Transient — call `browser_snapshot` again; using `browser_wait_for` here can block indefinitely |
| Browser can't find element | Take fresh `browser_snapshot` after navigation/waits |
| After server restart, browser redirects to SAML mock IDP | Expected condition — always navigate explicitly to `http://localhost:5620/login?auth_provider_hint=cloud-basic`; never rely on the default redirect after a restart |
| "AI Agent" modal intercepts Playwright clicks | Expected condition — take a `browser_snapshot` to find the modal's selector, then close it with `browser_evaluate('document.querySelector(\'[selector]\')?.remove()')` |
