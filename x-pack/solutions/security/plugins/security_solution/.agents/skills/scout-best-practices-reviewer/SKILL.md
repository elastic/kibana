---
name: security-scout-best-practices-reviewer
description: >
  Use when reviewing Scout tests in x-pack/solutions/security/, running a pre-PR check on Security
  Solution Scout code, or reviewing a Cypress-to-Scout migration in that area.
---

# Security Solution — Scout Best Practices Reviewer (Additive)

**Additive checks for Security Solution Scout tests.**

## Security-specific checklist

### Page objects — Security-specific placement

New page objects belong in `kbn-scout-security/src/playwright/fixtures/test/page_objects/`. Register via the `pageObjects` fixture so specs access them as `pageObjects.myPage`.

### Data cleanup — Security Solution resources

Flag missing cleanup — leaked state breaks parallel tests.

Security Solution tests commonly create resources that require explicit cleanup in `afterAll`/`afterEach`:

- Detection rules and alerts (`apiServices.detectionRule.deleteAll()`, `apiServices.detectionAlerts.deleteAll()`)
- Timelines and timeline templates (`apiServices.timeline.deleteAll()`)
- Cases and case comments
- Risk Engine and Entity Store state
- Asset Criticality assignments
- Exception lists and items
- Endpoint policies and fleet agents

### Package imports

- Import `spaceTest`, `test`, `tags`, `expect` from `@kbn/scout-security` — not from `@kbn/scout`
- Import `expect` from `@kbn/scout-security/ui` (not the main entry point)
- Import page objects and API services from `@kbn/scout-security` when they exist there

### Auth and roles

Use Security Solution-specific auth methods rather than `loginAsAdmin()`:

| Role | Method | When to use |
|------|--------|-------------|
| Platform engineer | `browserAuth.loginAsPlatformEngineer()` | Default — standard CRUD privileges |
| T1 analyst | `browserAuth.loginAsT1Analyst()` | Read-only analyst, RBAC testing |
| Any security role | `browserAuth.loginAsSecurityRole('role_name')` | Generic — any role in `roles.yml` |
| Custom role | `browserAuth.loginWithCustomRole(roleDescriptor)` | Ad-hoc RBAC with inline descriptors |

Flag `loginAsAdmin()` — prefer the least-privileged role from the table above that still exercises the behaviour under test, since admin masks RBAC regressions and doesn't reflect real usage. Admin is acceptable only when the test genuinely requires it.

Prefer named convenience methods (`loginAsPlatformEngineer`, `loginAsT1Analyst`) over `loginAsSecurityRole('platform_engineer')` for commonly used roles.

### Tags

Verify the test is tagged for the correct deployment targets. Tags must reflect what the test actually covers — stateful-only, serverless-only, or both. Flag missing tags or tags that don't match the test's actual scope. Available stateful: `tags.stateful.classic`. Available serverless tiers: `security.complete`, `security.essentials`, `security.ease`, `security.all`.

**Choosing serverless tiers.** Default to `security.complete` for functionality that is available across tiers — the common case. Use `security.essentials` or `security.ease` only when the test covers behaviour specific to that tier: a feature that is or isn't available there, or that behaves differently. Don't blanket-tag every tier "to be safe" — pick the narrowest set that's still correct, since each extra tier tag spins up another CI run. (See `docs/extend/testing/deployment-tags.md`.)

### API services reuse

Available services in `@kbn/scout-security`:

| Service | Methods |
|---------|---------|
| `detectionRule` | `createCustomQueryRule()`, `deleteAll()` |
| `detectionAlerts` | `deleteAll()` |
| `entityAnalytics` | `deleteEntityStoreEngines()`, `deleteRiskEngineConfiguration()`, `getRiskEngineStatus()`, `waitForEntityStoreStatus()` |
| `cloudConnectorApi` | Cloud connector operations |
| `timeline` | `createTimeline()`, `createTimelineTemplate()`, `deleteAll()` |

If a new API service is added, verify it:
1. Lives in `kbn-scout-security/src/playwright/fixtures/worker/apis/`
2. Exports from the `apis/index.ts` barrel
3. Registers in `SecurityApiServicesFixture` (types), `parallel_run_fixtures.ts`, and `single_thread_fixtures.ts`

### Test placement

Security Solution Scout tests use a namespace sub-directory structure. Each feature area has its own directory under `test/scout/`:

| Namespace | Path |
|-----------|------|
| `agent_builder` | `test/scout/agent_builder/ui/` |
| `entity_analytics` | `test/scout/entity_analytics/{ui,api}/` |
| `exceptions` | `test/scout/exceptions/ui/` |
| `flyout` | `test/scout/flyout/ui/` |
| `reports` | `test/scout/reports/ui/` |
| `timelines` | `test/scout/timelines/ui/` |
| `workflows` | `test/scout/workflows/ui/` |

- Timeline UI tests belong in `security_solution/test/scout/timelines/ui/` — the `timelines` plugin only has server-side saved object definitions and APIs
- Parallel specs go in `test/scout/<namespace>/ui/parallel_tests/`
- Sequential specs go in `test/scout/<namespace>/ui/tests/`
- There is no root-level `test/scout/ui/` or `test/scout/api/` in `security_solution` — all test specs live under namespace sub-dirs
- If a test is placed in a namespace that doesn't match its source scope (e.g., a flyout test landed in `entity_analytics/`), flag it — see the **Namespace selection** section of `security-cypress-to-scout-migration` for the source-scope table and creation criteria

## Migration parity (Security-specific additions)

When reviewing a Cypress-to-Scout migration, check these in addition to the migration parity analysis:

- Cypress `{ force: true }` replaced with proper waits or `dispatchEvent('click')` (not silently removed)
- `cy.task('esArchiverLoad')` for system indices replaced with `kbnClient` or `apiServices` (not `esArchiver`)
- `@serverless` / `@ess` Cypress tags mapped to Scout deployment tags
- Cleanup added for all resources the Cypress test created (Cypress relied on clean env per spec)

## Skill improvement

After every review, check for new learnings worth capturing. Suggest updates if:

- **New review checklist item** — found a Security-specific pattern worth verifying
- **New API service or page object** — reusable infrastructure was added to `@kbn/scout-security`

Prompt the user: _"During this review I learned [X]. Want me to add it to the skill so future reviews benefit?"_
