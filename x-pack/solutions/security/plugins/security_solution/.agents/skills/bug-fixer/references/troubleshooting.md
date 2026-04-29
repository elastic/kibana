# Troubleshooting

| Problem | Solution |
|---------|----------|
| ES fails to start | Check `node scripts/es snapshot` output; ensure no other ES instance is running on port 9200 |
| Kibana fails to start | Check console output; ensure `yarn kbn bootstrap` completed and port 5601 is free |
| Kibana slow to start | Can take 5+ min on first run; poll `/api/status` rather than assuming a fixed wait time |
| ES returns 401 | Default credentials are `elastic` / `changeme` |
| Config not taking effect | Pass config via `--xpack.*` CLI args, not `kibana.dev.yml` — CLI args are session-scoped |
| `red_rejected` — test passes | Test must assert correct behavior that is currently broken |
| Jest test not found | Verify path is correct and relative to repo root |
| `gh api` errors | `gh auth status` and `gh auth refresh` |
| "Please upgrade your browser" on login | Transient — call `browser_snapshot` again; using `browser_wait_for` here can block indefinitely |
| Browser can't find element | Take fresh `browser_snapshot` after navigation/waits |
