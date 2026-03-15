# Defend Workflows Cypress → Scout Migration

This worktree (`feature/defend-workflows-osquery-scout-migration`) is for migrating **Defend Workflows Cypress tests** to Scout/Playwright, following the same approach used for Osquery.

## Reference: Osquery migration

Use the **Osquery Scout migration guide** (SCOUT_MIGRATION_GUIDE) as the primary reference for patterns, mappings, and pitfalls:

- **Path:** `/Users/patrykkopycinski/Projects/kibana.worktrees/feature/osquery-scout-cypress-migration/x-pack/platform/plugins/shared/osquery/test/scout_osquery/SCOUT_MIGRATION_GUIDE.md`
- Covers: Cypress → Scout/Playwright mappings, fixtures, page objects, Docker/Fleet setup, selectors, assertions, CI, and hard-won lessons.

## Defend Workflows Cypress scope

| Item | Location |
|------|----------|
| **FTR / CLI config** | `x-pack/solutions/security/test/defend_workflows_cypress/` |
| **Cypress specs** | `x-pack/solutions/security/plugins/security_solution/public/management/cypress/` |
| **Cypress config** | `security_solution/public/management/cypress/cypress.config.ts` (and serverless variant) |
| **CI** | `.buildkite/scripts/steps/functional/defend_workflows.sh`, `defend_workflows_serverless.sh` |
| **Pipeline** | `.buildkite/pipelines/pull_request/security_solution/defend_workflows.yml` |

Defend Workflows Cypress covers endpoint management, response actions, artifacts, policy, RBAC, tamper protection, and related E2E. Migrate specs to Scout under a new test directory (e.g. `test/scout_defend_workflows/`) with a single Playwright/Scout config and shared fixtures, reusing patterns from the Osquery guide.

## Next steps

1. **Scaffold Scout test layout** (e.g. `scout_defend_workflows/ui/` with `parallel.playwright.config.ts`, `tsconfig.json`, `fixtures/`, `tests/`, optional `common/`).
2. **Reuse Scout config sets** where applicable (e.g. security solution / endpoint configs in `kbn-scout`).
3. **Migrate specs incrementally** (e.g. start with a small subset like response_actions or policy), following the [Step-by-Step Migration Checklist](/Users/patrykkopycinski/Projects/kibana.worktrees/feature/osquery-scout-cypress-migration/x-pack/platform/plugins/shared/osquery/test/scout_osquery/SCOUT_MIGRATION_GUIDE.md#step-by-step-migration-checklist) in the Osquery guide.
4. **Wire CI** once a first batch is green (new Buildkite steps and pipeline entries for Scout Defend Workflows).

## Worktree setup

- **Branch:** `feature/defend-workflows-osquery-scout-migration`
- **Base:** `upstream/main`
- **Path:** `kibana.worktrees/feature/defend-workflows-osquery-scout-migration`
- `.cursor` and `openspec` are symlinked to the main Kibana repo for rules/skills and OpenSpec.

Run bootstrap in this worktree before developing:

```bash
cd /path/to/kibana.worktrees/feature/defend-workflows-osquery-scout-migration
yarn kbn bootstrap
```

## Note on SCOUT_MIGRATION_GUIDE

SCOUT_MIGRATION_GUIDE (linked above) should be treated as **generic** guidance for migrating **any** Cypress tests to Scout/Playwright in Kibana. Although it lives in the Osquery test tree and uses Osquery as the reference migration, its patterns (Cypress → Scout mappings, fixtures, page objects, selectors, assertions, CI) apply to other areas—including Defend Workflows. Use it as the canonical Cypress-to-Scout migration reference across the repo.
