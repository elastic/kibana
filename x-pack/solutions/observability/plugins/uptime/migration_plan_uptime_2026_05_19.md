# FTR to Scout Migration Plan

| Field | Value |
|-------|-------|
| Source | `x-pack/solutions/observability/test/api_integration/apis/uptime/` |
| Target module root | `x-pack/solutions/observability/plugins/uptime` |
| Generated | `2026-05-19` |
| Deployment targets | `stateful` only (uptime is legacy, no serverless support) |
| FTR config chain | `apis/uptime/config.ts` → `test/api_integration/config.ts` → `@kbn/test-suites-xpack-platform/api_integration/config` |
| Scout config set | `uptime_legacy` (enables `observability:enableLegacyUptimeApp=true`) |
| Scout test directory | `test/scout_uptime_legacy/api/` (alongside existing `ui/`) |

---

## Key decisions

- **All 13 test files → Scout API tests** (the entire suite is pure REST, no browser interaction)
- **Stateful only** (`@local-stateful-classic`) — uptime is a legacy feature with no serverless counterpart
- **Sequential execution** — tests mutate shared `heartbeat*` ES indices
- **Reuse existing helpers** — `make_checks.ts`, `make_ping.ts`, `make_tls.ts` already exist at `test/scout_uptime_legacy/ui/fixtures/helpers/` (already adapted for Scout's `EsClient`)
- **Target**: `test/scout_uptime_legacy/api/` — shares the same `uptime_legacy` server config set as the UI tests

## Migration batches — all `autopilot`

### Batch 1: Simple REST + archive data (7 specs)
`index_status`, `monitor_latest_status`, `monitor_duration`, `ping_histogram`, `get_all_pings`, `ping_list`, `dynamic_settings`

### Batch 2: Programmatic data generation (4 specs)
`certs`, `snapshot`, `monitor_states_generated`, `monitor_states_real_data`

### Batch 3: RBAC + Fleet (2 specs)
`feature_controls`, `uptime_integration_deprecation`
