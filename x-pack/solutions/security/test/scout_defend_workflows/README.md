# Defend Workflows Scout Tests

Scout/Playwright E2E tests for Defend Workflows (endpoint management, response actions, artifacts, policy, RBAC, tamper protection).

- **Migration reference:** See [DEFEND_WORKFLOWS_SCOUT_MIGRATION.md](../DEFEND_WORKFLOWS_SCOUT_MIGRATION.md) and the generic [SCOUT_MIGRATION_GUIDE](https://github.com/elastic/kibana/blob/main/x-pack/platform/plugins/shared/osquery/test/scout_osquery/SCOUT_MIGRATION_GUIDE.md) for Cypress → Scout patterns.
- **Config:** `ui/parallel.playwright.config.ts` (parallel UI tests with space isolation).
- **Run:** `node scripts/scout.js run-tests --arch stateful --domain classic --config <path-to-this-dir>/ui/parallel.playwright.config.ts` (or use Scout CLI with the appropriate config set).
