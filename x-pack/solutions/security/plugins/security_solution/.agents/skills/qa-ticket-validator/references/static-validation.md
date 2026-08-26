# Static Validation (Phase 1)

Verify implementation and test **existence** before running automation or live checks.

Run checks **in parallel per AC** when paths are independent.

---

## Per-AC static checks

For each AC in `plan-#N.json`:

### 1. Merged PR evidence

- At least one linked PR is **merged** and references the issue (`Closes`, `Fixes`, or body mention)
- PR diff touches paths expected by playbook pattern (see [`playbooks/cloud_security.md`](playbooks/cloud_security.md))

```bash
git log --oneline --since="<issue_created>" -- <paths_from_playbook>
gh pr diff <number> --repo elastic/kibana
```

### 2. Code path existence

- Routes, API handlers, or components mentioned in AC exist in current tree
- Feature flags referenced in AC are present in `experimental_features` if applicable

### 3. Test catalog mapping

Search owned test trees (from playbook):

- Scout: `**/test/scout*/**/*.spec.ts`
- Cypress: `**/security_solution_cypress/**/*.cy.ts`
- FTR/API: `**/test/**/apis/**`, `**/test/**/test_suites/**`

Record matching file paths and test/describe names — not pass/fail yet.

Use [`../test-plan-generator/references/security-test-directories.md`](../test-plan-generator/references/security-test-directories.md) for directory roots.

### 4. Documentation / config sanity

If AC mentions docs or config keys, grep for presence. Missing docs → note in evidence; does not auto-FAIL unless AC requires docs.

---

## Static status rules

| Finding | Status |
|---------|--------|
| Merged PR touches expected paths + tests mapped | `PASS` |
| No merged PR or wrong paths | `FAIL` |
| Cannot determine (no PR, vague AC) | `BLOCKED` |
| AC tagged `manual_blocked` only | `SKIPPED` |

Record:

```json
"static": {
  "status": "PASS",
  "evidence": [
    "PR #123 merged — touches cloud_security_posture/public/...",
    "Scout spec: .../create_cloud_connector.spec.ts"
  ]
}
```

Update `plan-#N.json` after each AC. Append git/gh commands to `commands_run`.

---

## Do not

- Treat static PASS as overall AC PASS if `automated` or `live_required` tags apply
- Run Scout or browser in this phase
