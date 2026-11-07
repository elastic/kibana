# Prototype source validation

Review snapshot: 6 November 2026, source base `9ba3addf71d08136b64634baa97d4af6fa1e00e8`, Node 24.21.0. Validation used the isolated review worktree and the existing installed dependency set, with local workspace-package links and generated package/project maps. This is not a fresh dependency bootstrap or production certification.

## Focused Jest checks

| Area | Suites passed | Tests passed |
| --- | ---: | ---: |
| Prototype UI, graph, findings and policy UI | 112 | 1338 |
| Collectors, parsers, policy monitor and controlled exercises | 15 | 239 |
| Shared policy schema | 1 | 17 |
| Policy API and hunt-history persistence | 3 | 29 |
| Native Agent Builder execution attribution | 6 | 178 |
| Native Entity Store metadata preservation | 1 | 9 |
| Shared Entity Analytics hooks | 2 | 22 |
| **Total** | **140** | **1832** |

All listed suites passed with no skipped tests. The handoff also updates old provider-count/copy assertions, fixes inventory test mocks for provider isolation, and addresses the scoped accessibility lint errors.

## Other source-only checks

- 8 ordinary Claude Desktop MCP tests passed with real in-memory SDK transports and temporary synthetic files. The native Node test runner is used explicitly (`node --test .../demos/claude_desktop/bridge_test.mjs`); these are not Jest tests. A stdio initialization/graceful-SIGTERM smoke check also passed without executing a tool or creating audit records.
- 138 Google support tests passed offline: configuration/sync/verification (28), infrastructure (14), native response (64), ADK application (32). Cloud calls are mocked and SDK tests use an offline model. No fresh package installation, container build or cloud deployment was performed.
- Scoped lint completed with no ESLint errors across 392 JS/TS/MJS files. Existing callout-migration and dynamic-path warnings remain.
- `git diff --check` passed. Selected credential-pattern scans found only intentional synthetic redaction-test strings; no known session credential, private source captures, journals, database, cloud state or config was selected. This is a limited scan, not a universal DLP guarantee.

## Broader validation limits

The repository's `node scripts/check.js --scope=staged` was attempted with the pinned Node on PATH. Project-reference checks and Moon regeneration passed; Oxlint and ESLint stages completed with existing warnings. The broader affected-project test/type run was stopped to relieve local resource pressure after the focused feature checks completed. It is not a clean full-check result. The standalone Security Solution type build encountered TS2883 portability errors involving linked `@testing-library/dom` declaration paths and subsequent TS2724 missing generated exports in monorepo dependencies. It did not establish a clean feature typecheck; a fully bootstrapped independent checkout remains required.

A full Kibana build, current-main rebase/compatibility validation, full i18n validation, fresh recipient bootstrap, non-superuser end-to-end UI checks, live model generation, new Claude Desktop invocation, fresh Google provisioning and actual IAM containment/denial were not rerun for this source handoff. The engineering reference distinguishes historical working examples from source-only checks.

No real collectors/monitors, fixture ingestion, rule execution, cloud resource/IAM actions or service restarts were initiated by these checks. Existing author runtime state is not part of the branch.
