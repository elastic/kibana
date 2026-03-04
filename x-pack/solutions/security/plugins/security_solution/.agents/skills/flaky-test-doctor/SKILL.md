---
name: flaky-test-doctor
description: >
  Security Solution specific. Analyzes flaky, failing, or skipped Security Solution Cypress tests to
  determine root cause and recommend fixes. Use when: (1) a user shares a flaky or skipped Cypress test,
  (2) asked to fix a test that intermittently fails, (3) asked to unskip a test, (4) triaging a test
  stability GitHub issue, (5) asked "why is this test flaky/failing", (6) asked to analyze test failures
  in ESS/Serverless/MKI environments, (7) asked whether to fix, delete, or migrate a broken Cypress test.
---

# Security Solution — Flaky Test Doctor

## Overview

Analyze flaky or skipped Security Solution Cypress tests to determine root cause and recommend the right action: fix the test, fix the app, delete the test, or migrate to Scout.

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

- **ON MIGRATION:** cypress-to-scout-migration (Security Solution additive skill, when recommending Scout migration)
- **ON SCOUT PATTERNS:** scout-ui-testing, scout-api-testing

## Boundaries

- Always: Analyze test code, search for duplicates, propose fixes
- Always: Self-investigate before asking the user questions
- Ask first: Before suggesting major refactors or layer changes
- Never: Delete tests without explicit approval
- Never: Assume the problem is with the test — it might be a real bug

## Analysis framework

**Complete Steps 0-2 before proposing any fix.** A fix for an invalid or redundant test wastes time.

### Step 0: Validity check

If the test is skipped (`.skip`, `@skipInServerless`, etc.), verify the feature still exists:

1. Check git history: `git log --oneline -15 -- path/to/test.cy.ts`
2. Search for the feature implementation — has it changed since the skip?
3. Verify test selectors still exist in the codebase
4. Check the tasks/screens files the test uses

| Finding | Action |
|---------|--------|
| Feature unchanged, test valid | Investigate flakiness and fix |
| Feature changed, test outdated | Update test to match new implementation |
| Feature removed / redesigned | Delete the test |
| Skipped for temp infra issue | Check if resolved, unskip if so |

### Step 1: Environment context

Establish which environment(s) the test fails in. Check test tags:

| Tag | Meaning |
|-----|---------|
| `@ess` | Runs in ESS (on-prem) PR CI |
| `@serverless` | Runs in simulated serverless PR CI + periodic pipeline |
| `@serverlessQA` | Runs in Kibana QA quality gate |
| `@skipInEss` | Skipped for ESS |
| `@skipInServerless` | Skipped for all serverless quality gates + periodic pipeline |
| `@skipInServerlessMKI` | Skipped from MKI environments only |

A test can be flaky in one environment but stable in another.

**Self-investigate first** — check tags, git history, GitHub issue. Only ask the user for information you cannot find (which specific environment failed, error messages from CI, screenshots, failure frequency).

### Step 2: Duplicate coverage check

Search for existing coverage of the same behavior:

1. **Other Cypress tests** covering the same feature/flow
2. **Scout tests** in `test/scout/`
3. **API tests** in `test/security_solution_api_integration/`
4. **Unit tests** co-located with source

Don't rely on test names — check what the test actually asserts.

**If duplicate in API/unit:** Recommend deleting Cypress — lower layers are faster and more reliable.

**If duplicate in Scout:**
- Scout now runs on MKI ([pipeline](https://buildkite.com/elastic/appex-qa-serverless-kibana-scout-tests))
- Cypress has `@serverless` and Scout covers serverless → delete Cypress
- Cypress is ESS-only and Scout covers ESS → delete Cypress

**If duplicate in another Cypress test:** Compare quality, keep the better-written one.

### Step 3: Layer analysis

| Current Layer | Question | Consider Moving To |
|---------------|----------|-------------------|
| E2E (Cypress) | Tests UI-specific behavior? | Keep at E2E |
| E2E (Cypress) | Flakiness from network/timing? | API test |
| E2E (Cypress) | Testing a component in isolation? | Unit/integration test |

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

All fixes must follow team conventions:
- No hardcoded waits (`cy.wait(ms)`)
- No forced actions (`{ force: true }`) without justification
- No index-based selectors (`.eq(0)`)
- Use intercepts and waits for API calls
- Use `.should()` for retry-able checks
- Use `.find()` over `.within()` when elements may re-render
- Ensure proper cleanup in `beforeEach`/`afterEach`

**Before fixing, audit data & cleanup:**
- Identify all resources the test creates/modifies
- Verify every resource has explicit cleanup (API-based, not UI-based)
- Ensure `beforeEach` handles crashed previous runs

**For flakiness:** Provide root cause, before/after code, why the fix works.
**For bugs:** Describe the bug, affected environments, next steps.
**For migration candidates:** Read the `cypress-to-scout-migration` skill (the one co-located in this plugin's `.agents/skills/`).

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

**Ask the user** (can't self-determine):

| Information | Why |
|-------------|-----|
| Which environment failed? | CI links are private |
| Error message | From CI logs, not in code |
| Screenshots/videos | Visual info not in code |
| Consistent or intermittent? | Requires multiple runs |
| Additional CI context | Private infrastructure |

**Guidelines:**
1. Self-investigate first — exhaust what you can learn from code and git before asking
2. Ask efficiently — combine related questions into one message, don't ask one at a time
3. Don't ask the obvious — if it's in the code or searchable, find it yourself
4. CI links are private — never assume you can access CI dashboards, build logs, or screenshots
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

[Primary recommendation]

### Option A: [Fix in Cypress]
[Code and explanation]

### Option B: [Migrate to Scout] (if applicable)
[Migration guide]

## Related Files
[List of files to check or modify]
```

## After completing a fix

Always run the [Flaky Test Runner](https://ci-stats.kibana.dev/trigger_flaky_test_runner) to verify fixes before merging.

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

- Common flaky patterns (Missing API Wait, Stale Elements, localStorage, useEffect timing, etc.): `references/common-flaky-patterns.md`
- Analysis deep dive (Step 0/2/4 details: app bugs, documentation verification, element disabled diagnosis, duplicate formats, pre-proposal checklist): `references/analysis-deep-dive.md`
- Debugging techniques and environment-specific issues (MKI, ESS, Serverless): `references/debugging-and-environment.md`
- Team conventions, cleanup audit, and test deletion guidelines: `references/conventions-and-deletion.md`
