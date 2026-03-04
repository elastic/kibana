---
name: security-scout-best-practices-reviewer
description: >
  Security Solution specific extensions for Scout test review. Adds Security-specific checklist items
  on top of the general scout-best-practices-reviewer skill: page objects, data cleanup, package imports,
  auth roles, Kibana component interaction patterns, and lint compliance. Use when: (1) reviewing a Scout
  test in x-pack/solutions/security/, (2) reviewing a migrated Security Solution test, (3) asked to review
  Security Scout tests for best practices, (4) running a pre-PR review on Security Solution Scout code.
---

# Security Solution — Scout Best Practices Reviewer (Additive)

**This skill extends `scout-best-practices-reviewer`.** Run the general skill first for the full review workflow and output format. This skill only adds Security Solution specific checks.

## Priority

When guidance conflicts:

1. **Security Solution conventions** (this skill) — highest weight
2. **General reviewer** (scout-best-practices-reviewer)
3. **Scout framework docs** (docs/extend/scout/)

## Security-specific checklist

Apply these checks **in addition to** the general skill's checklist. Use the same output format (blocker → major → minor → nit).

### Page objects — required for UI tests

UI tests must encapsulate **all UI interactions in page objects** — flag raw `page.testSubj.locator()` calls in spec files as missing page object methods. Specs should only contain assertions (`expect`), test flow (`test.step`), and page object method calls.

Page object rules:

- Extract **all locators as `readonly` properties** in the constructor — no inline locator creation in methods
- Assertions stay in specs, never in page objects
- New page objects belong in `kbn-scout-security/src/playwright/fixtures/test/page_objects/`
- Register via the `pageObjects` fixture so specs access them as `pageObjects.myPage`

```typescript
class TimelinePage {
  readonly panel: Locator;
  readonly saveButton: Locator;

  constructor(private readonly page: ScoutPage) {
    this.panel = this.page.testSubj.locator('timeline-panel');
    this.saveButton = this.page.testSubj.locator('timeline-save-btn');
  }

  async goto() {
    await this.page.gotoApp('securitySolution:timelines');
  }
}
```

### Data cleanup — all created resources must be cleaned

Flag missing cleanup as **blocker** — leaked state breaks parallel tests.

Security Solution tests commonly create resources that require explicit cleanup in `afterAll`/`afterEach`:

- Detection rules and alerts (`apiServices.detectionRule.deleteAll()`, `apiServices.detectionAlerts.deleteAll()`)
- Timelines and timeline templates (`apiServices.timeline.deleteAll()`)
- Cases and case comments
- Risk Engine and Entity Store state
- Asset Criticality assignments
- Exception lists and items
- Endpoint policies and fleet agents

In addition to domain-specific cleanup, call `scoutSpace.savedObjects.cleanStandardList()` in `afterAll` as a defensive catch-all. Domain-specific methods only cover known resource types — `cleanStandardList()` removes everything else.

```typescript
spaceTest.afterAll(async ({ apiServices, scoutSpace }) => {
  await apiServices.timeline.deleteAll();
  await apiServices.detectionRule.deleteAll();
  await scoutSpace.savedObjects.cleanStandardList();
});
```

Add **defensive cleanup in `beforeAll`** to handle leftover data from a previous failed run — call the same cleanup methods before setting up test data.

### Package imports

- Import `spaceTest`, `test`, `tags`, `expect` from `@kbn/scout-security` — not from `@kbn/scout`
- Import `expect` from `@kbn/scout-security/ui` (not the main entry point)
- Import page objects and API services from `@kbn/scout-security` when they exist there

```typescript
// Correct
import { spaceTest, tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';

// Wrong — bypasses Security Solution fixtures
import { spaceTest, tags, expect } from '@kbn/scout/ui';
```

### Auth and roles

The general skill already requires minimal permissions. For Security Solution, use these specific methods:

| Role | Method | When to use |
|------|--------|-------------|
| Platform engineer | `browserAuth.loginAsPlatformEngineer()` | Default — standard CRUD privileges |
| T1 analyst | `browserAuth.loginAsT1Analyst()` | Read-only analyst, RBAC testing |
| Any security role | `browserAuth.loginAsSecurityRole('role_name')` | Generic — any role in `roles.yml` |
| Custom role | `browserAuth.loginWithCustomRole(roleDescriptor)` | Ad-hoc RBAC with inline descriptors |

Flag `loginAsAdmin()` as **blocker** — use the least-privileged role from the table above. Prefer named convenience methods (`loginAsPlatformEngineer`, `loginAsT1Analyst`) over `loginAsSecurityRole('platform_engineer')` for commonly used roles.

### Tags

Verify tags include both stateful and serverless:

```typescript
{ tag: [...tags.stateful.classic, ...tags.serverless.security.complete] }
```

Available Security serverless tiers: `security.complete`, `security.essentials`, `security.ease`, `security.all`.

### API services reuse

Check for existing services in `@kbn/scout-security` before creating new ones:

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

### Locator quality

In order of preference:

1. `page.testSubj.locator('...')` — `data-test-subj`, most stable
2. `getByRole('row')`, `getByRole('button', { name: '...' })` — ARIA roles
3. CSS `:has()` for parent selection — `page.locator('span:has([data-test-subj="..."])')` over XPath
4. Scoped locators — `parent.locator('[data-test-subj="child"]')` to avoid strict mode violations

Flag these as **major**:
- EUI CSS class selectors (`.euiTableRow`, `.euiToolTipAnchor`) — internal, can change between EUI versions
- XPath selectors — prefer CSS `:has()` for parent selection
- Unscoped locators when the same `data-test-subj` appears in multiple DOM locations

### Kibana component interaction patterns

Flag incorrect usage of these components:

**Kibana query bar (`QueryStringInput`)**: `fill()` races with React prop sync — use `pressSequentially()`:

```typescript
// Wrong — submits stale props.query
await textarea.fill('host.name: *');
await textarea.press('Enter');

// Correct
await textarea.pressSequentially('host.name: *');
await textarea.press('Enter');
```

**EuiBasicTable empty state**: Always renders a row for "no items found" — assert the message text, not row count:

```typescript
// Wrong — always finds at least 1 row
await expect(table.locator('.euiTableRow')).toHaveCount(0);

// Correct
await expect(table).toContainText('No items found');
```

**EUI disabled button tooltip**: Hover the tooltip anchor wrapper, not the button:

```typescript
const tooltipAnchor = page.locator('span:has([data-test-subj="save-button"])');
await tooltipAnchor.hover();
```

**DOM instability from app bugs**: Use `dispatchEvent('click')` instead of `force: true`. Document the app bug location.

### Lint compliance

Flag violations of these Playwright lint rules:

- **`playwright/no-nth-methods`**: No `.first()`, `.last()`, `.nth()`. Use `filter({ hasText })`, scoped locators, or `toContainText([...])` for ordered assertions.
- **`playwright/no-force-option`**: No `{ force: true }`. Fix the underlying issue or use `dispatchEvent('click')` for documented app bugs.

### Test placement

- Timeline UI tests belong in `security_solution/test/scout/` — the `timelines` plugin only has server-side saved object definitions and APIs
- Parallel specs go in `test/scout/ui/parallel_tests/<domain>/`
- Sequential specs go in `test/scout/ui/tests/<domain>/`

## Migration parity (Security-specific additions)

When reviewing a Cypress-to-Scout migration, check these in addition to the general migration parity analysis:

- Cypress `{ force: true }` replaced with proper waits or `dispatchEvent('click')` (not silently removed)
- `cy.task('esArchiverLoad')` for system indices replaced with `kbnClient` or `apiServices` (not `esArchiver`)
- `@serverless` / `@ess` Cypress tags mapped to Scout deployment tags
- Cleanup added for all resources the Cypress test created (Cypress relied on clean env per spec)

## Skill improvement

After every review, check for new learnings worth capturing. Suggest updates if:

- **New review checklist item** — found a Security-specific pattern worth verifying
- **New Kibana component pattern** — a component required a non-obvious Playwright approach
- **New lint workaround** — a lint rule required a non-obvious alternative
- **New API service or page object** — reusable infrastructure was added to `@kbn/scout-security`

Prompt the user: _"During this review I learned [X]. Want me to add it to the skill so future reviews benefit?"_
