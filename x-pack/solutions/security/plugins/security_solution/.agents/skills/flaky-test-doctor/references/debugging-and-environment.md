# Debugging & Environment Guide

## Table of Contents
- [Debugging Techniques](#debugging-techniques)
- [Environment Guide](#environment-guide)
- [MKI-Specific Issues](#mki-specific-issues)
- [Environment Tag Combinations](#environment-tag-combinations)

## Debugging Techniques

Use `.only` + `cy.pause()` + `--headed` for fast iteration:

```typescript
it.only('test name', () => {
  // ... setup ...
  cy.get(SELECTOR).then($el => { cy.log('State:', $el.html()); });
  cy.pause(); // F12 → inspect elements, network, selectors
  // ... assertion ...
});
```

Remove `.only` before committing.

## Environment Guide

| Environment | Key Differences |
|-------------|----------------|
| ESS | Full feature set, traditional deployment |
| Serverless | Stateless, may have different feature flags |
| MKI | Kubernetes-based, different auth, API restrictions, slower infra |

When flaky in only one environment, investigate: feature flag differences, timing/performance, auth flow differences.

## MKI-Specific Issues

**403 Forbidden:** Direct access to internal indices is restricted — use application APIs instead.
```typescript
// Fails on MKI
cy.request('PUT', '/.internal-index/_doc/1', data);
// Use application API
cy.request('POST', '/api/security/some-endpoint', data);
```

**"Log in to your account" page:** Session timeout from slow app performance. Fix the app (reduce API calls, optimize rendering).

**Username assertions:** `system_indices_superuser` doesn't exist in MKI. Use `getDefaultUsername()` from `cypress/tasks/common/users.ts`.

**Feature flags (Cypress only):** Cypress cannot reliably toggle flags on MKI. Do not treat `@skipInServerlessMKI` as the fix — migrate to Scout, which can set flags via Kibana Core APIs on MKI/cloud (see `cypress-to-scout-migration`). `@skipInServerlessMKI` is only a temporary Cypress hold when the spec is `@serverlessQA` and must keep running the QA gate without that MKI path.

**Infrastructure not ready:** Elements disabled, "shards not active" or "index not found" errors. Check server logs. For a non-`@serverlessQA` test: add readiness waits in the destination (Scout / API), or migrate or delete — do not add `@skipInServerlessMKI`. That skip is only a temporary Cypress hold when the spec is already `@serverlessQA` and must keep running the QA gate without that MKI path.

## Environment Tag Combinations

`@ess`, `@serverless`, and `@serverlessQA` opt a test **into** a pipeline. `@skipIn*` opts it **out**. If both are present, the skip wins: `@serverless` + `@skipInServerless` does not run in any serverless suite.

| Tags | Runs in | Does not run in |
|------|---------|-----------------|
| `@ess`, `@serverless` | ESS PR CI, simulated serverless PR CI, periodic (MKI) | Kibana QA gate (needs `@serverlessQA`) |
| `@ess`, `@serverless`, `@serverlessQA` | All of the above + QA gate | — |
| `@ess`, `@serverless`, `@skipInServerless` | ESS PR CI only | Simulated serverless PR CI, periodic, QA |
| `@ess`, `@serverless`, `@skipInServerlessMKI` | ESS PR CI, simulated serverless PR CI | Periodic (MKI), QA (MKI) |
| `@serverless`, `@skipInServerlessMKI` | Simulated serverless PR CI | ESS, periodic, QA |

`@skipInServerless` is not a synonym for `@skipInServerlessMKI`. The first quality gate is simulated serverless, not MKI. Periodic and Kibana QA are MKI.
