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

**Feature flags:** No easy way to enable/disable in MKI. Skip with `@skipInServerlessMKI`.

**Infrastructure not ready:** Elements disabled, "shards not active" or "index not found" errors. Check server logs; add readiness waits or skip with `@skipInServerlessMKI`.

## Environment Tag Combinations

| Tags | Behavior |
|------|----------|
| `@ess`, `@serverless` | Both ESS and Serverless PR CI |
| `@ess`, `@serverless`, `@skipInServerless` | ESS PR CI + Serverless PR CI, skips MKI |
| `@serverless`, `@skipInServerlessMKI` | Serverless PR CI, skips only MKI |

The periodic pipeline and Kibana QA quality gate are MKI environments.
