---
name: flaky-test-doctor
description: >
  Security Solution specific. Use when: (1) a user shares a flaky or skipped Security Solution Cypress test,
  (2) asked to fix a test that intermittently fails, (3) asked to unskip a test, (4) triaging a test
  stability GitHub issue, (5) asked "why is this test flaky/failing", (6) asked to analyze test failures
  in ESS/Serverless/MKI environments, (7) asked whether to fix, delete, or migrate a broken Cypress test.
---

# Security Solution — Flaky Test Doctor

## Overview

Analyze flaky or skipped Security Solution Cypress tests to determine root cause and recommend the right action: migrate to Scout, move to API/unit, delete, or fix the app. Propose a Cypress code fix only when the test is tagged `@serverlessQA`.

**Security Solution Domain:** Detection Engine, Timeline, Cases, Entity Analytics, AI Assistant, Attack Discovery, Endpoint/Defend Workflows, Cloud Security.

**Test locations:**
- Cypress: `x-pack/solutions/security/test/security_solution_cypress/cypress/e2e/`
- Scout: `x-pack/solutions/security/plugins/security_solution/test/scout/`
- API integration: `x-pack/solutions/security/test/security_solution_api_integration/`
- Unit tests: co-located with source (`*.test.ts`, `*.test.tsx`)

## Tools

- **Quick diagnostic:** `bash scripts/check_test_status.sh <cypress-test-file>` — shows skip status, git history, tags, linked issues, and imported helpers. Run this first to gather context before analysis.

Path relative to this skill's directory.

## Required sub-skills

- **ON MIGRATION:** read the general `cypress-to-scout-migration` skill first, then the additive `security-cypress-to-scout-migration` skill co-located in this plugin
- **ON SCOUT PATTERNS:** scout-ui-testing, scout-api-testing

## Boundaries

- Always: Analyze test code, search for duplicates, propose a destination (Scout / API / unit / delete)
- Always: Self-investigate before asking the user questions
- Ask first: Before suggesting major refactors or layer changes
- Never: Delete tests without explicit approval
- Never: Propose a Cypress code fix unless the test is tagged `@serverlessQA`
- Never: Assume the problem is with the test — it might be a real bug

## Analysis framework

**Complete Steps 0-2 before proposing any action.** A destination for an invalid or redundant test wastes time.

### Step 0: Validity check

If the test is skipped (`.skip`, `@skipInServerless`, etc.), verify the feature still exists:

1. Check git history: `git log --oneline -15 -- path/to/test.cy.ts`
2. Search for the feature implementation — has it changed since the skip?
3. Verify test selectors still exist in the codebase
4. Check the tasks/screens files the test uses

| Finding | Action |
|---------|--------|
| Feature unchanged, test valid | Investigate flakiness; recommend migrate / move layer / delete (Cypress fix only if `@serverlessQA`) |
| Feature changed, test outdated | Update destination coverage (Scout / API / unit), not a Cypress rewrite — unless `@serverlessQA` |
| Feature removed / redesigned | Delete the test |
| Skipped for temp infra issue | If the issue is gone: unskip `@ess`-only tests; unskip `@serverlessQA` so the QA gate stays covered; otherwise migrate or delete |

### Step 1: Environment context

Establish which environment(s) the test fails in. Check test tags:

| Tag | Meaning |
|-----|---------|
| `@ess` | Runs in ESS (on-prem) PR CI |
| `@serverless` | Runs in simulated serverless PR CI + periodic pipeline |
| `@serverlessQA` | Kibana QA quality gate. When `KIBANA_MKI_QUALITY_GATE` is set, `parallel_serverless.ts` overrides grep to `@serverlessQA` (not the `@serverless` default in `cypress_ci_serverless_qa.config.ts`) |
| `@skipInEss` | Skipped for ESS |
| `@skipInServerless` | Skipped from **all** serverless (simulated PR CI + periodic + QA), even if `@serverless` is present |
| `@skipInServerlessMKI` | Skipped from MKI only (periodic + QA). Still runs simulated serverless PR CI if `@serverless` is present |

A test can be flaky in one environment but stable in another.

**Self-investigate first** — check tags, git history, GitHub issue, and any CI links in the issue. If a CI URL needs login, open it in the browser and ask the user to sign in or grant permissions. Only ask them to paste logs/screenshots if the browser session cannot reach CI.

### Step 2: Duplicate coverage check

Search for existing coverage of the same behavior:

1. **Other Cypress tests** covering the same feature/flow
2. **Scout tests** in `test/scout/`
3. **API tests** in `test/security_solution_api_integration/`
4. **Unit tests** co-located with source

Don't rely on test names — check what the test actually asserts.

**If duplicate in API/unit:** Recommend deleting Cypress — lower layers are faster and more reliable. Exception: do not delete `@serverlessQA` Cypress until Scout is in the Kibana QA gate.

**If duplicate in Scout:**
- Compare Cypress `@ess` / `@serverless` to the Scout spec's `tags.stateful.*` / `tags.serverless.security.*` (see `references/analysis-deep-dive.md`; apply the first matching row — `@serverlessQA` wins)
- Do not grep for `@local-stateful-classic` or `@*-serverless-security_*` in source — those are runtime tags
- Cypress `@serverlessQA` is not covered by Scout yet — do not delete for that tag alone
- Do not edit an existing Scout spec's tags to add MKI coverage

**If duplicate in another Cypress test:** Compare quality, keep the better-written one.

### Step 3: Layer analysis

Decide the destination layer from what the test asserts. Cypress is not a destination.

| What the test validates | Destination |
|-------------------------|-------------|
| Data / API / rule CRUD / engine setup | API test |
| Component in isolation | Unit/integration test |
| User workflow, RBAC, alert table, Timeline UI | Scout UI |
| Navigation / page-loads-without-error | Delete |

Full domain map: `security-cypress-to-scout-migration` Gate 2.

If the test is already Cypress and the destination is Scout UI: recommend migration, not a Cypress patch — unless it is tagged `@serverlessQA`.

### Step 4: Bug vs flakiness classification

| Type | Signs |
|------|-------|
| Real bug | Consistent in one env, incorrect behavior, recent code changes, differs from docs |
| Flakiness | Intermittent, timing errors, passes on retry |
| Environment issue | MKI-only, shards not ready, infra warnings |
| App bug exposed by test | Race condition, useEffect timing, feature flag change exposed latent bug |

When a test fails after a feature flag change but test code is unchanged, investigate the **application code** — the test may be catching a real bug.

Check [Elastic Security docs](https://www.elastic.co/docs/solutions/security) to verify expected behavior.

### Step 5: Fix proposal

**Do not propose a Cypress code fix** unless the test is tagged `@serverlessQA`.

**Sequence:** Diagnose first (Step 4). Then implement in the destination (Scout / API / unit) or in the app.
Do not stabilize the Cypress spec and then migrate. Cypress-specific waits do not travel to Playwright.

If the root cause is an app bug, fix the app before writing Scout. If it is a Cypress-only race (stale `.within()`, missing intercept), encode the wait in the Scout rewrite — do not patch `.cy.ts` first.

| Destination (Step 3) | Recommendation |
|----------------------|----------------|
| API / unit | Move coverage there; delete Cypress |
| Delete | Delete Cypress (ask first) |
| Scout UI | Migrate — read `cypress-to-scout-migration` then `security-cypress-to-scout-migration` |
| Scout UI **and** `@serverlessQA` | Cypress fix allowed so the QA gate stays green. Also recommend migrating when Scout QA exists. |

`@serverlessQA` Cypress fixes must follow team conventions (see `references/conventions-and-deletion.md`):
- No hardcoded waits (`cy.wait(ms)`)
- No forced actions (`{ force: true }`) without justification
- No index-based selectors (`.eq(0)`)
- Use intercepts and waits for API calls
- Use `.should()` for retry-able checks
- Use `.find()` over `.within()` when elements may re-render
- Ensure proper cleanup in `beforeEach`/`afterEach`

**Before any Cypress (`@serverlessQA`) or Scout rewrite, audit data & cleanup:**
- Identify all resources the test creates/modifies
- Verify every resource has explicit cleanup (API-based, not UI-based)
- Ensure setup handles crashed previous runs

**For flakiness:** Fill Root Cause, then recommend migrate / move / delete. The Scout (or API) rewrite must address that cause. Do not emit a Cypress before/after unless `@serverlessQA`.
**For bugs:** Describe the bug, affected environments, next steps — do not paper over with a Cypress wait.
**For migration:** Read the general `cypress-to-scout-migration` skill at the repository root first, then the additive `security-cypress-to-scout-migration` skill co-located in this plugin's `.agents/skills/`.

## Information gathering strategy

**Self-investigate** (don't ask the user):

| Information | How to Find It |
|-------------|----------------|
| Feature still valid? | Search codebase, check recent commits |
| Duplicate tests? | Search API/unit/Scout tests |
| When was test skipped? | `git log` on test file |
| What does test do? | Read test code + tasks/screens |
| What utilities exist? | Search `tasks/` folder, grep for common patterns |
| Linked GitHub issue? | Look at the FLAKY comment in the test file |
| Test tags/environments | Read the test file |
| Test file structure/imports | Read the file and related tasks/screens |

**Try the browser before asking** (CI is reachable if the user logs in or grants permissions):

| Information | How |
|-------------|-----|
| Which environment failed? | Open the CI / Buildkite link from the GitHub issue |
| Error message, screenshots, videos | Same CI job artifacts |
| Failure frequency | CI history / failed-test issue comments |
| Server logs | Job artifacts once the browser session is authenticated |

**Ask the user** only if the browser cannot open CI (no link, login failed, no permission):

| Information | Why |
|-------------|-----|
| CI URL or pasted logs/screenshots | Browser session could not reach the job |
| What they saw locally | Not in CI |

**Guidelines:**
1. Self-investigate first — code, git, GitHub issue, then CI in the browser
2. If CI asks for login or permissions, prompt the user there — do not treat the link as unreachable. Buildkite may use Okta SSO; if the agent browser cannot finish login, ask for pasted logs/screenshots instead of retrying the login page.
3. Ask efficiently — combine leftover questions into one message
4. Don't ask for logs you can open yourself
5. Frame questions clearly — when you do ask, be specific about what you need and why

## Response format

```
## Analysis Summary

**Environment:** [ESS / Serverless / MKI / Multiple]
**Classification:** [Bug / Flakiness / Environment Issue]
**Confidence:** [High / Medium / Low]

## Findings

### Duplicate Coverage
[Found / Not Found - details]

### Layer Analysis
[Appropriate / Should Move - details]

### Root Cause
[What's causing the failure]

## Recommendation

[Primary: migrate to Scout / move to API or unit / delete / fix the app]

### Option A: [Migrate to Scout / Move to API / Delete]
[How and why]

### Option B: [Cypress fix] (only if `@serverlessQA`)
[Code and explanation. Also note: migrate when Scout QA exists.]

## Related Files
[List of files to check or modify]
```

## After completing a fix

Always verify fixes with the Flaky Test Runner before merging.

When the fix is verified or the PR is ready, end the conversation by requesting feedback:

> "If you have a moment, please share your feedback on the Flaky Test Doctor to help us improve:
> **[Take the 1-minute feedback survey](https://docs.google.com/forms/d/e/1FAIpQLSc5pg7XxvKl0y8rmKoFCcs851nyQLgG5ndxOJCK6FsMRKcDfA/viewform)**"

## Continuous learning

When you identify a root cause or fix not documented in this skill, tell the user and offer to add it.

**Signs you've discovered something new:**
- The root cause doesn't match any existing pattern in this skill
- You had to investigate a unique combination of factors
- The fix required a technique not mentioned here
- Environment-specific behavior that wasn't documented

## References

Open only what you need:

- Cypress flake *symptoms* (missing API wait, stale `.within()`, localStorage, useEffect): `references/common-flaky-patterns.md`
  Use this to classify the root cause. Do not copy its Cypress before/after into the recommendation unless `@serverlessQA`.
- Analysis deep dive (Step 0/2/4 details: app bugs, documentation verification, element disabled diagnosis, duplicate formats, pre-proposal checklist): `references/analysis-deep-dive.md`
- Debugging techniques and environment-specific issues (MKI, ESS, Serverless): `references/debugging-and-environment.md`
- Team conventions, cleanup audit, and test deletion guidelines: `references/conventions-and-deletion.md`
