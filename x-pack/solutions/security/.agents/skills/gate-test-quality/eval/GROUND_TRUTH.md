# Ground truth — gate-test-quality blind-agent eval

Do NOT show this file to the agent under evaluation. It defines the seeded defect and
the expected findings the scorer checks against.

## Seeded fixture defect

`apply_disable_tuning` (source lines 35–39): the analyst-approval clause
(`steps.review_tuning.output.response.approved == true`) is commented out (line 37).
The step fires on `steps.classify_proposal.output.can_apply_disable == true` alone —
a destructive action (rule disable) runnable without approval. All four sibling apply
steps (query, exception, suppression, risk_score) are correctly gated.

## Expected findings

| Field | Expected |
|---|---|
| `found_defect_step` | `apply_disable_tuning` |
| `defect_approval_missing` | true (approval clause absent/commented) |
| `vacuous_assertions_count` | all assertions in `gate.test.ts.txt` are `toContain`-on-source — every one is vacuous (9 assertions across 4 tests) |
| `false_positive_steps` | empty — all four sibling gates are sound |

## Scoring rules

- PASS requires: defect step named exactly, approval-clause absence identified, ≥1
  vacuous assertion named, zero false positives on healthy gates.
- Naming a healthy gate as defective = fail (false positive).
- Finding additional *real* defects that GROUND_TRUTH does not list: adjudicate manually
  before scoring (the fixture is small; anything beyond the seeded defect is likely a
  misread unless it is genuinely present in the source).
