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
| Serverless boot: `--domain security` is invalid | Use `security_complete`, `security_essentials`, or `security_ease`; the bare `security` token is not a valid `--domain` value |
| Serverless ES returns 401 on API calls | Use `elastic_serverless` / `changeme` (not `elastic`); check `kb_user` in `.bug-fixer-session/analysis.json` |
| Serverless custom role creation (`POST /api/security/role/`) fails | Use predefined Security project roles: `viewer`, `editor`, `soc_manager`, `detections_admin`, `rule_author`, `threat_intelligence_analyst`, `platform_engineer`, `endpoint_operations_analyst`, `endpoint_policy_manager`, `admin` |
| Serverless native user creation (`POST /internal/security/users/`) fails | Not supported in serverless — switch to a predefined project role instead |
