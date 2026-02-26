---
name: cypress-to-scout-migration
description: >
  Security Solution specific extensions for Cypress-to-Scout migration. Adds Security Solution
  conventions, paths, packages, roles, and API services on top of the general cypress-to-scout-migration
  skill. Use when: (1) migrating a Security Solution Cypress test (.cy.ts) to Scout, (2) working in
  x-pack/solutions/security/ and asked about Cypress-to-Scout migration, (3) need Security-specific
  Scout tags, roles, or API services for a migration, (4) asked about MKI pipelines for Security Solution.
---

# Security Solution — Cypress to Scout Migration (Additive)

**This skill extends `cypress-to-scout-migration`.** Read the general skill first for the full triage and migration workflow. This skill only adds Security Solution specific conventions.

## Best practices priority

When guidance from different sources conflicts:

1. **Security Solution conventions** (this skill) — highest weight
2. **General migration skill** (cypress-to-scout-migration)
3. **Scout framework skills** (scout-ui-testing, scout-api-testing, scout-best-practices-reviewer)
4. **General Kibana conventions** (AGENTS.md)

## Additional sub-skills

- **ON FLAKY TESTS:** flaky-test-doctor (co-located in this plugin's `.agents/skills/`, when source test is flaky/skipped)

## Triage: flakiness risk assessment (Gate 4)

The general skill's Gate 4 has two parts — use the flaky-test-doctor for deeper analysis:

- **Gate 4a (current status):** If the test is skipped or known-flaky, read the `flaky-test-doctor` skill and follow its analysis framework (Steps 0-5) to determine root cause before deciding whether to migrate, fix, or delete.
- **Gate 4b (risk scan):** Use the general skill's `references/flakiness-risk-patterns.md` for the pattern catalog. Additionally, check the flaky-test-doctor's `references/common-flaky-patterns.md` for Cypress-specific anti-patterns — if any are present in the source test, they indicate app-level timing issues that should be fixed before migration, not papered over in the Scout rewrite.

## Security Solution paths and packages

| What | Path / Package |
|------|---------------|
| Cypress tests | `x-pack/solutions/security/test/security_solution_cypress/cypress/e2e/` |
| Scout tests | `x-pack/solutions/security/plugins/security_solution/test/scout/` |
| Scout package | `@kbn/scout-security` (imports: `spaceTest`, `test`, `tags`, `expect`) |
| API integration | `x-pack/solutions/security/test/security_solution_api_integration/` |
| Unit tests | Co-located with source (`*.test.ts`, `*.test.tsx`) |

## Triage: where to search for duplicates (Gate 1)

Search these locations by domain:

| Domain | API integration test path |
|--------|--------------------------|
| Detection rules / alerts | `test/security_solution_api_integration/test_suites/detections_response/` |
| Entity Analytics | `test/security_solution_api_integration/test_suites/entity_analytics/` |
| Endpoint / EDR | `test/security_solution_api_integration/test_suites/edr_workflows/` |
| Timeline / Saved Objects | `test/security_solution_api_integration/test_suites/investigation/` |
| Lists / Exceptions | `test/security_solution_api_integration/test_suites/lists_and_exception_lists/` |
| GenAI / AI Assistant | `test/security_solution_api_integration/test_suites/genai/` |
| AI4DSOC | `test/security_solution_api_integration/test_suites/ai4dsoc/` |
| SIEM Migrations | `test/security_solution_api_integration/test_suites/siem_migrations/` |
| Explore (hosts, network, users) | `test/security_solution_api_integration/test_suites/explore/` |
| Cases | Separate `x-pack/platform/test/cases_api_integration/` suite |

All paths relative to `x-pack/solutions/security/`. Also check unit tests co-located with the source component.

## Triage: layer guidance by domain (Gate 2)

| Domain / Feature | Typical right layer | Rationale |
|-----------------|-------------------|-----------|
| Detection rules CRUD | API test | Comprehensive API integration coverage exists |
| Rule execution + alert generation | API test | Validated by detections_response API tests |
| Alert table interactions (filter, sort, bulk) | Scout UI | User workflow, requires browser |
| RBAC on UI elements (disabled buttons, tooltips) | Scout UI | Permission-gated UI behavior |
| Timeline creation / editing | Scout UI | UI-heavy, limited API test coverage |
| Entity store / risk engine setup | API test | API tests exist; UI only for dashboard verification |
| Exception list CRUD | API test | Full API coverage exists |
| Exception list management page | Scout UI | User workflow on management UI |
| Cases CRUD | API test | Cases API tests cover CRUD |
| Cases UI workflows (attach alert, add comment) | Scout UI | User workflow |
| Navigation / page loading | Consider deletion | Low value — usually covered implicitly |

When in doubt: if the Cypress test primarily calls `cy.request()` for setup and only clicks one button to verify, it likely belongs at the API layer.

## Scaffold shortcut

Use the general skill's scaffold with Security Solution defaults:

```bash
bash .agents/skills/cypress-to-scout-migration/scripts/scaffold_scout_spec.sh \
  --name <spec_name> --domain <domain_path> \
  --plugin-test-dir x-pack/solutions/security/plugins/security_solution/test/scout/ui \
  --type parallel --scout-package @kbn/scout-security
```

## Security Solution tags

```typescript
{ tag: [...tags.stateful.classic, ...tags.serverless.security.complete] }
```

Available Security serverless tiers:
- `tags.serverless.security.complete`
- `tags.serverless.security.essentials`
- `tags.serverless.security.ease`
- `tags.serverless.security.all`

## Security Solution roles and auth

| Role | Method | Use |
|------|--------|-----|
| Admin | `browserAuth.loginAsAdmin()` | Full privileges |
| Platform engineer | `browserAuth.loginAsPlatformEngineer()` | Standard analyst role |
| Custom role | `browserAuth.loginWithCustomRole(roleDescriptor)` | RBAC testing |
| Serverless role | `browserAuth.loginAs('roleName')` | Serverless-only roles (e.g., `t1_analyst`) |

For stateful environments, custom roles are set via `samlAuth.setCustomRole()` using descriptors from `SERVERLESS_ROLES_ROOT_PATH/security/roles.yml`.

## Security Solution API services

Available in `apiServices` fixture:

| Service | Methods |
|---------|---------|
| `detectionRule` | `createCustomQueryRule()`, `deleteAll()` |
| `detectionAlerts` | `deleteAll()` |
| `entityAnalytics` | `deleteEntityStoreEngines()`, `deleteRiskEngineConfiguration()`, `getRiskEngineStatus()`, `waitForEntityStoreStatus()` |
| `cloudConnectorApi` | Cloud connector operations |

If the API service you need doesn't exist, create one using the template from the general skill (`assets/api_service_template.ts`) and wire it into `@kbn/scout-security`:
1. Add to `kbn-scout-security/src/playwright/fixtures/worker/apis/`
2. Export from `kbn-scout-security/src/playwright/fixtures/worker/apis/index.ts`
3. Add to `SecurityApiServicesFixture` in `kbn-scout-security/src/playwright/fixtures/types.ts`
4. Wire into `parallel_run_fixtures.ts` and `single_thread_fixtures.ts`

## Data cleanup — Security-specific resources

In addition to the general cleanup audit, Security Solution tests commonly create:
- Detection rules and alerts
- Timelines and timeline templates
- Cases and case comments
- Risk Engine and Entity Store state
- Privileged User Monitoring configuration
- Asset Criticality assignments
- Exception lists and items
- Endpoint policies and fleet agents

Ensure ALL of these are cleaned in `afterAll`/`afterEach`.

## MKI pipeline specifics

| Aspect | Current State |
|--------|--------------|
| Periodic pipeline | Active for Cypress, managed by Security Engineering Productivity |
| Scout periodic pipeline | Under development, will be managed by Appex QA |
| Kibana QA quality gate | Active for Cypress; Scout version under development |

**Keep Cypress tests with `@serverless` tag until Scout MKI pipelines are ready** — they provide MKI coverage Scout cannot replace yet.

## Common mistakes (Security-specific)

- Using `@kbn/scout` instead of `@kbn/scout-security` for Security Solution tests
- Missing `loginAsPlatformEngineer()` — don't default to `loginAsAdmin()` when platform_engineer suffices
- Not cleaning Security-specific resources (Risk Engine, Entity Store, detection rules)
- Following general Scout conventions over Security Solution conventions when they conflict
- Migrating a flaky/skipped test without running the flaky-test-doctor analysis first — you may port an app bug into Scout
- Ignoring Gate 4b risk patterns in Cypress tasks/screens — flakiness hides in shared helpers, not just the test file
