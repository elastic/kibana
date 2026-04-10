# Common Mistakes

These are the most frequent ways this skill produces low-quality output. Check against this list before saving any draft.

- **Hallucinating scenarios** — writing test scenarios for features or behaviours not explicitly described in the issue, sub-issues, linked PRs, or Figma designs. If it is not in a source, it does not belong in the test plan.
- **Duplicating sub-issue coverage** — writing scenarios that are already covered in a sub-issue test plan. Always cross-check existing test plans found in Step 1 before writing scenarios.
- **Speculative optional sections** — including RBAC, upgrade, CCS, multi-space, or multi-tenant sections when the issue does not explicitly warrant them. Each optional section has a clear inclusion criterion in the table in `references/optional-scenarios.md` — if the criterion is not met, omit the section entirely.
- **UI-step Gherkin** — writing scenarios that describe clicks and UI interactions instead of user intent and expected behaviour. See `references/optional-scenarios.md` for the correct approach and a valid example.
- **Overlooking sub-issue acceptance criteria** — checking only the high-level acceptance criteria from the parent issue while missing individual criteria buried in sub-issue bodies or comments. The consolidated AC list from Steps 1–2 must be walked item by item during the self-review.
- **Overlooking PR artifacts** — reading PR file lists at summary level without mapping individual new routes, services, schemas, or components to scenarios. Every new API endpoint, saved object type, or UI page in a PR should have at least one scenario — the PR artifacts inventory exists for this purpose.
- **Known Limitations inconsistency** — claiming in Known Limitations that a scenario covers something, or that a gap exists, without verifying against the actual scenario list. Every claim in Known Limitations must match reality.
- **Ignoring the Core rule** — proceeding past a point of uncertainty instead of stopping and asking the user.