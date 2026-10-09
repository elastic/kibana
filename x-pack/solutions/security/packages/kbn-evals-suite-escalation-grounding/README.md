# Escalation summary + escalation-context chat grounded-QA suite

Scores the two claims from security-team#19927 the Escalations feature makes
about linked investigations:

1. the escalation **summary** reflects every linked investigation;
2. the **escalation-context chat** answers from all of them.

Follows the ClaimGrounding contract introduced in elastic/kibana#295913 for the
FP/TP suite: deterministic labels wherever labels are deterministic, and the
LLM judge only where genuine judgment is needed.

## Dataset

16 cases. Each is an escalation with 2–5 linked investigations carrying
distinct planted facts. Every case has one fact that exists only in the LAST
linked investigation — the canary for claim 1. Questions have answers derivable
from exactly one investigation. Unit tests (`validateCases`) enforce that:

- every investigation hosts at least one planted fact (no decoys);
- every case asks at least one question on the last investigation;
- every fact key appears, at a token boundary, in its own investigation.

## Metrics

| Evaluator | Kind | What it scores |
| --- | --- | --- |
| `ClaimGrounding` | LLM judge | every summary claim traces to a linked investigation. **The grounding gate.** |
| `SummaryKeyMentionRecall` | deterministic | planted facts whose key is mentioned in the summary |
| `ChatKeyMentionRecall` | deterministic | questions whose answer mentions the expected key tokens |
| `UnsupportedNumericSpecifics` | deterministic | summary sentences asserting a digit-bearing token (address, id, count, version) found in no investigation the product saw |

Limits, stated plainly:

- **Key-mention recall measures mentions, not grounding.** A bare list of keys,
  or a real key attached to the wrong claim, scores the same as a faithful
  answer. Only `ClaimGrounding` catches that.
- **`UnsupportedNumericSpecifics` is blind to non-numeric inventions**
  ("dumped LSASS with pypykatz"). `ClaimGrounding` covers those.
- Matching is token-boundary, case-insensitive: `203.0.113.4` does not match
  `203.0.113.44`. These four probes (key dump, misattributed sentence,
  `.4` vs `.44`, non-numeric invention) are pinned in `src/grading.test.ts`.
- `ClaimGrounding` scores 0, not 1, for a missing summary or a judge that
  parses no claims (an empty summary must not read as grounded).

## Models: who runs what

| Role | Connector |
| --- | --- |
| Chat answers | the model under test (`connector`) |
| Summary | the `alertzero_reasoning` inference feature, which `beforeAll` routes to the model under test and `afterAll` restores — summary metrics are per-model, as in the FP/TP suite |
| `ClaimGrounding` judge | the evaluation connector, which must be `gemini-3-1-pro` |

Judge isolation is enforced, not documented: the run throws if the evaluation
connector is the connector under test or is not `gemini-3-1-pro`, and logs the
judge and the model under test.

## Mutation test

`ESCALATION_MUTATION=drop-last` reruns the suite with each case's LAST linked
investigation never linked to the escalation, so the product never sees it.
Cases with only two investigations are skipped in this arm. Grading:

- key-mention recall stays graded on the FULL labels, so it must fall;
- `ClaimGrounding` and `UnsupportedNumericSpecifics` are graded against the
  corpus WITHOUT the dropped investigation (`droppedInvestigation` on the task
  output) — the corpus the product actually saw.

## Running

Like the other stateful eval suites (Scout + Playwright against a stateful
Kibana with security):

```bash
node scripts/evals_runner \
  --eval x-pack/solutions/security/packages/kbn-evals-suite-escalation-grounding
```

Environment:

- `ESCALATION_MUTATION=drop-last` — the mutation arm.
- `ESCALATION_SPACE_ID=<id>` — run every request under `/s/<id>` (G20 hook).
  Unset or `default` uses the default space.
