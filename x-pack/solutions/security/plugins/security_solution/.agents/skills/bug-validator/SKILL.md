---
name: bug-validator
description: >
  Validates whether open Security Solution GitHub bugs are still valid through
  static code analysis, git history, and PR cross-referencing — without running
  the application. Use when the user shares a GitHub issue URL, an issue list URL,
  an issue number (#NNN), or asks to triage, validate, or check if a Security
  Solution bug is still reproducible.
---

# Bug Validator

Senior QA + Security Solution domain expert. Validate open GitHub bugs via codebase analysis, git history, and PR cross-referencing — no running app needed.

**Security Solution domain:** Detection Engine, Timeline, Case Management, Entity Analytics, Asset Management, AI Assistant / Attack Discovery.

## Boundaries

- Always: Fetch issue data, search code, check git history, propose a verdict
- Always: Self-investigate before asking the user
- Always: Reference specific files, commits, or PRs as evidence
- Ask first: Before recommending closing an issue
- Never: Close or modify issues without explicit user approval
- Never: Assume fixed without evidence

---

## Input Handling

**Single issue URL or `#NNN`:**
```bash
gh issue view 12345 --repo elastic/kibana --json number,title,body,labels,assignees,createdAt,state,comments
```

**Issue list URL** — parse query params to `gh` flags:
```bash
gh issue list --repo elastic/kibana --label "Team:Entity Analytics" --label bug \
  --state open --json number,title,createdAt,labels --limit 15
# For complex queries:
gh api search/issues --method GET \
  -f q='repo:elastic/kibana is:issue is:open label:"Team:Entity Analytics" label:bug' \
  --jq '.items[] | {number, title, created_at}'
```
Batch limit: 15 issues. Ask user to continue if list is larger.

---

## Analysis Framework

**MANDATORY: Complete Steps 0–4 before rendering a verdict. Never skip.**

### Parallelization

Step 0 must finish first. Then Steps 1–4 run in parallel:
```
Step 0: Fetch & Parse  (sequential)
  ├─ Step 1 + 1b: Code Path + Source Analysis  ─┐
  ├─ Step 2: Change History                      ├─ parallel
  ├─ Step 3: PR Cross-Reference                  │
  └─ Step 4: Test Coverage                      ─┘
Step 5: Verdict  (sequential, after all above)
```

### Step 0: Fetch and Parse the Bug

Parse each section for investigation signals:

| Bug Section | Extract | Guides |
|-------------|---------|--------|
| Describe the bug | Component, error type, UI element | Which code area to search |
| Stack version | Version number | Age vs current code; older → higher silent-fix chance |
| Preconditions | Roles, permissions, prior state | RBAC checks, privilege constants |
| Steps to reproduce | Page routes, UI elements, action sequence | Routes, components, event handlers |
| Current behavior | Error messages, broken UI states | Strings to grep; if still in code, path is reachable |
| Expected behavior | What should happen | Verify against current implementation |

When sections are missing: infer from free-form text, check [Elastic Security docs](https://www.elastic.co/docs/solutions/security), assume default user, use issue date as version proxy.

### Step 1: Code Path Existence Check

1. Map "Steps to reproduce" navigation to routes and page components
2. Search for role/permission checks from "Preconditions"
3. Grep error messages from "Current behavior" — if present, path is still reachable
4. Check for feature flag gating (`common/experimental_features.ts`, `useIsExperimentalFeatureEnabled`)
5. Verify feature still documented (see `references/domain-knowledge.md` → Documentation Reference)
6. **Space-awareness** (if bug mentions spaces): check saved object `namespaceType`, raw `esClient` usage, index naming

**Flag graduation check:**
```bash
git log --oneline -20 -- '**/experimental_features.ts'
git log -p --all -S '<flagName>' -- '**/experimental_features.ts'
```

| Finding | Implication |
|---------|-------------|
| Code paths unchanged | Likely still valid; continue to Step 1b |
| Paths exist but modified | Proceed to Step 1b |
| Feature removed entirely | Verdict: OBSOLETE |
| Feature completely redesigned | Verdict: likely OBSOLETE |

### Step 1b: Source Code Analysis

**This step is critical — file existence is not enough. Read and reason about the implementation.**

1. Read the page component, API route, or service function the bug leads to
2. Trace the "Steps to reproduce" through the code: button click → function → API → data
3. Find where the described failure could occur in the chain
4. Determine if the specific defect (missing check, race condition, stale data, etc.) still exists
5. Check related operations for the same pattern (e.g., if one route checks privileges but a parallel one doesn't)

Report: files read, key logic, whether defect still exists with code evidence, root cause if identified.

### Step 1c: Team Ownership Check *(run in parallel with 1/1b)*

1. Check `owner` in the nearest `kibana.jsonc` to affected files; fallback to `.github/CODEOWNERS`
2. Map to issue labels using Team Ownership tables in `references/domain-knowledge.md`
3. Flag mismatches: no label, wrong team, multi-team, or root cause in a platform plugin (Table B)

### Step 2: Change History Analysis

```bash
git log --oneline --since="<bug_created_date>" -- <relevant_paths>
git log --oneline --all --grep="#<issue_number>"
git show <commit_hash> -- <relevant_paths>
```

Signals: commit referencing issue number (strong), error-handling changes in code path (medium), general refactor (weak), no changes (bug likely still valid).

### Step 3: PR Cross-Reference

```bash
gh pr list --repo elastic/kibana --search "<issue_number>" --state merged \
  --json number,title,mergedAt,body --limit 10
gh pr list --repo elastic/kibana --search "<keywords from bug title>" \
  --state merged --json number,title,mergedAt --limit 10
```

| PR Signal | Confidence |
|-----------|------------|
| `Closes #N` / `Fixes #N` | High — FIXED |
| Title/body mentions same symptoms | Medium — likely FIXED, verify diff |
| Modifies exact code path, no issue ref | Low — INCONCLUSIVE |

### Step 4: Test Coverage Check

Search Cypress (`test/security_solution_cypress/cypress/e2e/`), Scout (`plugins/security_solution/test/scout/`), API integration (`x-pack/test/security_solution_api_integration/` and `x-pack/solutions/security/test/security_solution_api_integration/`), and unit tests (co-located `*.test.ts`).

Evaluate: same preconditions? same steps? assertions matching expected behavior? added *after* bug filing?

| Finding | Implication |
|---------|-------------|
| Test with same preconditions + steps, passes | Strong — FIXED |
| Test added after filing, covers exact scenario | Strong — FIXED |
| Test exists but different preconditions | Weak signal |
| No tests | No signal; base verdict on other evidence |

### Step 5: Render Verdict

Combine Steps 0–4. Then assess `impact:*` label (see Impact Assessment below).

---

## Verdict Taxonomy

Every verdict MUST include: **classification**, **confidence** (High/Medium/Low), **evidence summary**.

### FIXED
Code changes resolved the bug.
- **High**: PR explicitly closes issue AND diff addresses root cause
- **Medium**: Code addresses root cause but no explicit reference; OR tests cover the exact scenario
- **Low**: Area refactored in ways that likely fix it; connection indirect

### OBSOLETE
Bug no longer applicable — feature, component, or code path removed or completely redesigned.
- **High**: Feature confirmed removed
- **Medium**: Feature significantly redesigned; specific scenario may not apply
- **Low**: Feature flag removed but unclear if feature was removed or made permanent

### STILL VALID
Bug likely still reproducible. Code path unchanged, no fixing PRs, no test coverage for the specific scenario.
- **High**: Completely unchanged since filing; no PRs; no tests
- **Medium**: Minor changes that don't address root cause
- **Low**: Tangential changes exist

### STILL VALID — by design (UX issue)
Code behaves as intended, but behavior doesn't match user expectations. Not a code defect — may warrant UX improvement or product decision.

### INCONCLUSIVE
Cannot determine from static analysis: changes exist but unclear if they fix the root cause; visual/rendering bug; runtime-dependent behavior; description too vague; screenshots/videos are primary evidence.
- Always N/A confidence
- Include: what was investigated, why inconclusive, what would resolve it

**Never use "LIKELY FIXED"** — either confirm with evidence (FIXED) or acknowledge uncertainty (INCONCLUSIVE).

---

## Impact Assessment

After verdict, assess the `impact:*` label. Highest matching level wins.

| Level | Criteria |
|-------|----------|
| **Critical** | Unusable feature; user blocked; data loss; security vulnerability; >60% users affected; no workaround |
| **High** | Main functionality affected with non-obvious workaround; >30% users; strong usability impact |
| **Medium** | Minor functionality; non-critical data; reasonable workaround |
| **Low** | No functionality or data impact; cosmetic |

**Common over-rating patterns** — watch for these:
- Error in secondary feature (Inspect, "Open in Lens") labeled High → usually Low/Medium
- Cosmetic issue with dramatic screenshot labeled High → Low
- Bug only with experimental flags or rare configs → Medium
- Stale data that self-corrects on refresh → Medium
- Missing dropdown labels/tooltips → Low
- Action works from one location, fails from another (workaround exists) → Medium

---

## Output Format

### Single Issue Report

```
## Bug Validation Report

**Issue:** #<number> - <title>
**Filed:** <date> | **Version:** <version>
**Labels:** <relevant labels>
**Verdict:** <FIXED|OBSOLETE|STILL_VALID|INCONCLUSIVE> (<confidence> confidence)

### Parsed Bug Summary
- **Bug:** <one-line summary>
- **Preconditions:** <roles, permissions, state>
- **Trigger:** <specific action>
- **Current behavior:** <the bug>
- **Expected behavior:** <what should happen>

### Analysis

#### Step 1: Code Path Check
- <component>: [exists/removed/redesigned] in `<path>`
- Route "<nav path>": [exists/changed/removed]
- Permission checks for <privilege>: [found at `<path>` / not found]
- Documentation: [feature documented at <url> / not found / describes different behavior]

#### Step 1b: Source Code Analysis
- Files read: `<list>`
- Action sequence traced: <component> → <API route> → <service>
- Defect analysis: <description of specific code deficiency>
- Defect still present: [yes/no + evidence]
- Root cause: <if identified>

#### Step 2: Change History
- <N> commits to affected paths since <date>
- Commits referencing issue: [list or none]
- Key diffs: [summary of relevant changes]

#### Step 3: PR Cross-Reference
- PRs referencing #<number>: [list or none]
- Related PRs by keyword: [list or none]

#### Step 4: Test Coverage
- Tests covering <feature>: [list paths or none]
- Tests with same preconditions: [list or none]
- Assertions matching expected behavior: [yes/no]

### Recommendation
<What the user should do next>

### Impact Assessment
- **Current label:** impact:<level> (or "none")
- **Suggested label:** impact:<level> (or "correct")
- **Reasoning:** <1-2 sentences>

### Team Label Check
- **Current label:** <Team label or "none">
- **Code owner(s):** <@elastic/team-slug (from path/)>
- **Suggested label:** <correct / suggested change with reasoning>
```

### Bulk Triage Table

See `references/bulk-mode.md` for the two-pass bulk strategy and duplicate detection.

Summary table format:
```
| # | Title | Filed | Version | Verdict | Confidence | Impact | Team | Key Evidence |
```

---

## Information Gathering

**Self-investigate before asking the user.** Things you can always find yourself:
- Feature still exists → search codebase
- Code changed → `git log --since`
- Related PRs → `gh pr list --search`
- What bug describes → `gh issue view`
- Team ownership → issue labels + `kibana.jsonc`
- Test coverage → search test directories
- Expected behavior → [Elastic Security docs](https://www.elastic.co/docs/solutions/security)

**Ask the user only for:** recent manual reproduction attempts, what screenshots/videos show, internal Slack discussions, operational workarounds, approval to close.

---

## Continuous Learning

When you identify a recurring pattern not yet documented, tell the user:
> "I noticed a pattern not yet in the bug-validator skill: **[description]**. Want me to add it?"

Add to: Domain Knowledge (new paths/teams), Analysis Framework (new shortcuts), or Defect Patterns (new pattern type).

---

## Reference Files

- **`references/domain-knowledge.md`** — Security Solution codebase paths, team label → code path mapping, ownership tables, common page routes, platform plugin boundaries, test locations, documentation reference, feature flags, permission patterns
- **`references/defect-patterns.md`** — 8 common recurring defect patterns with investigation shortcuts
- **`references/bulk-mode.md`** — Two-pass bulk triage strategy, duplicate detection, quick vs full analysis comparison
