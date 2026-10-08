# Escalation summary + escalation-context chat grounded-QA suite

Scores the two claims from security-team#19927 the Escalations feature makes
about linked investigations:

1. the escalation **summary** reflects every linked investigation;
2. the **escalation-context chat** answers from all of them.

Reuses the ClaimGrounding contract introduced in elastic/kibana#295913 for the
FP/TP suite: deterministic labels wherever labels are deterministic, and the
LLM judge (the evaluation connector — configure gemini-3-1-pro) only where
genuine judgment is needed.

## Dataset

Each case is an escalation with 2–5 linked investigations carrying distinct
planted facts. Every case has one fact that exists only in the LAST linked
investigation — the canary for claim 1. Questions have answers derivable from
exactly one investigation (validated in unit tests).

## Metrics

| Evaluator | Kind | What it scores |
| --- | --- | --- |
| `ClaimGrounding` | LLM judge | every summary claim traces to a linked investigation |
| `SummaryPlantedFactRecall` | deterministic | planted facts whose key appears in the summary |
| `ChatAnswerRecall` | deterministic | questions answered with the expected key tokens |
| `HallucinationCount` | deterministic | summary sentences whose specifics appear in no investigation |

## Mutation test

`ESCALATION_MUTATION=drop-last` reruns the suite with each case's LAST linked
investigation dropped from the escalation context. Recall must fall; the
deterministic proof lives in `src/grading.test.ts`.

## Running

Like the other stateful eval suites (Scout + Playwright against a stateful
Kibana with security):

```bash
node scripts/evals_runner \
  --eval x-pack/solutions/security/packages/kbn-evals-suite-escalation-grounding
```

Environment: `ESCALATION_MUTATION=drop-last` for the mutation arm;
`ESCALATION_CASE_LIMIT=n` to run only the first n cases.
