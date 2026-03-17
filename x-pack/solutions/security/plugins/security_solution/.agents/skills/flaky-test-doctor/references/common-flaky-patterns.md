# Common Flaky Patterns

## Table of Contents
- [Missing API Wait](#missing-api-wait)
- [Test Data Pollution](#test-data-pollution)
- [Input Field Value Not Entered](#input-field-value-not-entered)
- [React useEffect Timing](#react-useeffect-timing-with-async-data)
- [Feature Flags Expose Race Conditions](#feature-flag-changes-expose-race-conditions)
- [Stale Element with .within()](#stale-element-reference-with-within)
- [localStorage Persistence Race](#localstorage-persistence-race-condition)
- [Visualization Requires Data](#visualization-elements-require-data)
- [API Timeout in CI](#api-timeout-in-ci)
- [Environment-Specific Selectors](#environment-specific-selector-differences)

## Missing API Wait

```typescript
// Flaky
cy.visit('/page');
cy.get('[data-test-subj="data"]').should('contain', 'expected');

// Stable — intercept and wait
cy.intercept('GET', '/api/data').as('getData');
cy.visit('/page');
cy.wait('@getData');
cy.get('[data-test-subj="data"]').should('contain', 'expected');
```

## Test Data Pollution

Passes in isolation, fails with other tests. Fix: cleanup in `beforeEach`/`afterEach`, use unique identifiers.

## Input Field Value Not Entered

Field remains empty because the input re-renders after typing starts. Diagnose: add `cy.wait(500)` before typing — if it passes, re-rendering is the cause. Fix: check for `useEffect` dependencies causing re-renders or async data loading resetting form state.

## React useEffect Timing with Async Data

```typescript
// Buggy — useEffect runs AFTER render
useEffect(() => {
  setShowFilter(isBuildingBlock);
}, [isBuildingBlock]);

// Fix — compute derived state directly
const shouldShowFilter = isBuildingBlock || showFilter;
```

When a test fails after a feature flag change but test code is unchanged, the test is likely catching a **real bug**. Fix the app, not the test.

## Feature Flag Changes Expose Race Conditions

Feature flags change loading order and rendering timing. A race condition may have always existed but was hidden. Search for the flag and check recent changes to affected components:
```bash
grep -r "featureFlagName" --include="*.ts" --include="*.tsx"
git log --oneline -20 -- path/to/affected/component.tsx
```

## Stale Element Reference with `.within()`

`.within()` captures a DOM reference once — if the parent re-renders, subsequent commands use a stale reference.

```typescript
// Stale reference after re-render
cy.get(CONTAINER).within(() => {
  cy.get(SELECTOR).should('be.visible');
});

// .find() re-queries on each retry
cy.get(CONTAINER).find(SELECTOR).should('be.visible');
```

## localStorage Persistence Race Condition

UI dismissals persist to `localStorage` asynchronously. Reloading before persistence completes loses state.

```typescript
// Flaky
cy.get(DISMISS_BUTTON).click();
cy.get(CALLOUT).should('not.exist');
cy.reload();

// Stable — wait for persistence
cy.get(DISMISS_BUTTON).click();
cy.get(CALLOUT).should('not.exist');
const storageKey = 'kibana.securitySolution.detections.callouts.dismissed-messages';
cy.window()
  .then((win) => {
    const dismissed: string[] = JSON.parse(win.localStorage.getItem(storageKey) || '[]');
    return dismissed.some((id) => id.startsWith('expected-callout-id'));
  })
  .should('be.true');
cy.reload();
cy.get(CALLOUT).should('not.exist');
```

`useMessagesStorage` appends `-messages` to storage keys. Some IDs include hash suffixes — use `.startsWith()`.

## Visualization Elements Require Data

```typescript
// Flaky — chart has no data yet
createRule(getNewRule());
visitWithTimeRange(ALERTS_URL);
clickAlertsHistogramLegend(); // No legend without data

// Stable — wait for data
createRule(getNewRule());
visitWithTimeRange(ALERTS_URL);
waitForAlertsToPopulate();
clickAlertsHistogramLegend();
```

## API Timeout in CI

Increase timeout for slow calls; also check `responseTimeout` in `cypress_ci.config.ts`:
```typescript
cy.request({ method: 'POST', url: '/api/fleet/epm/packages', timeout: 120000, body: packageData });
```

## Visual/Overlap Tests

Tests checking `getBoundingClientRect()` are inherently fragile. Delete if purely cosmetic.

## Environment-Specific Selector Differences

Attribute values differ between ESS and Serverless (e.g., avatar titles include email in Serverless):
```typescript
// Fails in Serverless
`[title='${username}']`
// Works everywhere
`[title^='${username}']`
```
