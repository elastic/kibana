# Analysis Deep Dive

## Table of Contents
- [Step 0: Common reasons tests become invalid](#step-0-common-reasons-tests-become-invalid)
- [Step 2: Duplicate recommendation formats](#step-2-duplicate-recommendation-formats)
- [Step 3: Layer recommendation format](#step-3-layer-recommendation-format)
- [Step 4: When the test catches a real bug](#step-4-when-the-test-catches-a-real-application-bug)
- [Step 4: Verify against documentation](#step-4-verify-against-documentation)
- [Step 4: Diagnosing "Element Disabled" failures](#step-4-diagnosing-element-disabled-failures)
- [Step 5: Pre-proposal checklist](#step-5-pre-proposal-checklist)

Detailed guidance for Steps 0, 2, and 4 of the analysis framework.

## Step 0: Common reasons tests become invalid

- UI redesign changed component structure
- API endpoints were renamed or deprecated
- Feature was moved to a different page/flow
- Test data format changed
- Feature flag was removed or made permanent

**Don't blindly unskip a test.** A skipped test that fails after unskipping may be catching a real regression OR may simply be outdated. Always verify first.

Useful commands:
```bash
git log --oneline -15 -- path/to/test.cy.ts
git log -p --all -S '.skip' -- path/to/test.cy.ts
```

## Step 2: Duplicate recommendation formats

### Duplicate in another Cypress test

Compare both tests and recommend keeping the better-written one.

**Evaluate based on:**
- Proper use of intercepts and waits (not hardcoded `cy.wait(ms)`)
- Clear, descriptive test names and assertions
- Proper setup/teardown (`beforeEach`/`afterEach`)
- Use of `data-test-subj` selectors (not CSS classes or IDs)
- Test isolation (doesn't depend on other tests)
- Readability and maintainability

**Format:**
- Keep: `[path/to/better-test.cy.ts]` — Reason: [why it's better]
- Delete: `[path/to/duplicate-test.cy.ts]` — Reason: [why it's worse]

### Duplicate in API or Unit tests

- Delete the Cypress test: `[path/to/cypress-test.cy.ts]`
- Existing coverage: `[path/to/api-or-unit-test]`
- Note: Confirm with the team before deletion if the Cypress test covers additional UI behavior

### Duplicate in Scout tests

Scout now runs on MKI via the [Appex QA Serverless Scout pipeline](https://buildkite.com/elastic/appex-qa-serverless-kibana-scout-tests). Scout tests can replace Cypress tests for MKI coverage.

**Check the test tags:**
- Cypress test: Does it have `@serverless` tag?
- Scout test: Does it have a tag that contains `serverless-security` in its value?

**Decision logic:**

| Cypress Tags | Scout Tags | Recommendation |
|--------------|------------|----------------|
| `@serverless` | `@*-serverless-security_*` | Delete Cypress — Scout covers MKI |
| `@ess` only | `@*-stateful-*` | Delete Cypress — Scout covers ESS |
| `@ess` only | `@*-serverless-security_*` | Keep Cypress for ESS, Scout for Serverless |

**Format:**
- Delete Cypress: `[path]` — Reason: Scout covers this environment (including MKI)
- Or keep Cypress: `[path]` — Reason: ESS-only, no Scout stateful coverage yet

## Step 3: Layer recommendation format

> **Layer Analysis**
> - Current: E2E (Cypress)
> - Tests: [what the test actually validates]
> - Recommendation: [keep at E2E / move to API / move to unit]
> - Reason: [why this layer is appropriate or not]

**Real Example:** [#246754](https://github.com/elastic/kibana/pull/246754) — Flaky Cypress test using CSS class selector was deleted and coverage moved to a more appropriate layer. The test "opens alerts page when alerts count is clicked" was testing navigation logic that doesn't require E2E testing.

## Step 4: When the test catches a real application bug

Sometimes a "flaky" test is correctly identifying a bug in the application. Signs that the application needs fixing (not the test):

1. **Race condition in React render cycle**
   - State computed from async data but UI renders before data is ready
   - `useEffect` sets state but child components already rendered with wrong values
   - Feature flag change altered timing, exposing a latent bug

2. **Incorrect conditional rendering**
   - Component renders when it shouldn't (data not ready)
   - Missing loading gates on async operations

3. **Filter/state not applied on first render**
   - Default values used instead of computed values
   - State initialization happens too late

**When to fix the application (not the test):**
- The test accurately describes expected user behavior
- Manual testing shows the same problem
- The feature flag change didn't break the feature — it exposed a pre-existing bug
- The test worked before because slower code paths hid the race condition

**Real Example:** `building_block_alerts.cy.ts` was marked as failing after enabling `newDataViewPickerEnabled`. Investigation revealed:
- The alerts table rendered before the building block filter was applied
- The `useEffect` that set the filter ran AFTER the table's first render
- The new data view picker loaded faster, exposing this race condition
- **Fix was in the application:** Changed filter computation to use rule data directly instead of waiting for `useEffect`

```typescript
// Before (buggy — useEffect runs after render)
useEffect(() => {
  setShowBuildingBlockAlerts(isBuildingBlockRule);
}, [isBuildingBlockRule]);
// Table renders with showBuildingBlockAlerts = false

// After (fixed — compute directly)
const shouldShowBuildingBlockAlerts = isBuildingBlockRule || showBuildingBlockAlerts;
// Table renders with correct filter immediately
```

## Step 4: Verify against documentation

Check the [Elastic Security Documentation](https://www.elastic.co/docs/solutions/security) to verify expected behavior:

**1. Find the relevant feature documentation:**
- Detection rules, alerts, cases, timeline
- Entity Analytics (risk scoring, anomaly detection, privileged user monitoring)
- Cloud Security (CSPM, KSPM, CNVM)
- Endpoint protection (Elastic Defend)
- Investigation tools (Osquery, Session View)
- AI-powered features (AI Assistant, Attack Discovery)

**2. Compare documented vs actual behavior:**
- Does the UI match what's documented?
- Do the features work as described?
- Are there documented limitations being violated?

**3. If behavior differs from documentation:**

> **Potential Bug Detected**
>
> Feature: [feature name]
> Expected (per docs): [documented behavior]
> Actual: [observed behavior]
> Doc reference: [link to documentation]
>
> **Recommendation:** File a bug report, not a test fix

**Note:** If documentation is outdated but feature works correctly, file a docs issue instead.

## Step 4: Diagnosing "Element Disabled" failures

When a test fails because an element is disabled (`pointer-events: none`, `disabled` attribute):

**1. Ask "Why is it disabled?"**
- Trace through the UI code to find the condition that disables it
- Look for state dependencies (loading states, validation, feature flags)

**2. Check for caching layers**
- React Query caches (`staleTime`, `cacheTime`)
- Redux/state caches
- API response caching
- Example: A 5-minute cache might serve stale "not ready" status

**3. Check server logs (especially MKI)**
- Look for "primary shards not active", "index not found", "timeout waiting for", "no node found to start"

**4. Classify correctly:**

| Finding | Classification | Action |
|---------|---------------|--------|
| Test setup didn't wait for readiness | Test issue | Fix the wait logic |
| UI has race condition with cache | App bug | Needs code fix, file issue |
| Infrastructure wasn't ready (shards, nodes) | Environment issue | May need infra fix |

**Real Example:** ML rule suppression test failed because `forceStartDatafeeds()` returned before jobs actually started. Server logs showed: "index does not have all primary shards active yet" — this was an infrastructure issue, not a test bug.

## Step 4: Classification format

> **Classification**
> - Type: [Bug / Flakiness / Environment Issue / Needs Investigation]
> - Confidence: [High / Medium / Low]
> - Evidence: [what led to this conclusion]

## Step 5: Pre-proposal checklist

Before proposing ANY fix, verify:

| Check | Status | Action if Not Done |
|-------|--------|-------------------|
| **Step 0: Functionality Valid?** | [ ] | Go back and verify the feature still exists and works |
| **Step 1: Environment Context?** | [ ] | Ask user which environment(s) are failing |
| **Step 2: Duplicate Coverage?** | [ ] | Search for API/unit tests covering same functionality |

Do NOT skip these steps. Proposing a fix for an invalid or redundant test wastes time.
