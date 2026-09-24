# Detection Watch Rule Tuning eval suite

Playwright + `@kbn/evals` suite for the managed `system-security-rule-tuning-worker` /
`system-security-rule-tuning-review` workflows. Each example seeds one detection rule plus a cluster
of analyst-dismissed (false-positive) alerts, runs the sweep (which fans out one review per rule),
auto-approves the review's gate, and grades the `diagnose_rule` step's structured proposal against a
golden tuning path.

## What it measures

| Evaluator | Kind | Gate or smoke |
|-----------|------|---------------|
| `ChangeTypeAccuracy` | CODE (binary) | **gate** — predicted tuning path == golden label |
| `TuningQuality` | LLM judge | **gate** — summary grounded in the seeded FP evidence |
| `Tool Routing` | CODE (trace) | **gate** — the agent actually retrieved the alerts (`investigate-rule.get_alerts_by_ids`); N/A when no span is reachable |
| `ValidProposal` | CODE (structural) | **smoke** — schema/apply-gate conformance; expected to saturate |

See [CAPABILITY_PROFILE.md](./CAPABILITY_PROFILE.md) for the gate-vs-smoke contract, the N/A
semantics and the (unratified) pass/kill thresholds.

## Layout

```
kbn-evals-suite-detection-watch-rule-tuning/
├── evals/
│   ├── rule_tuning_decision.spec.ts   # fixtures + experiment runner
│   ├── rule_tuning_approval.spec.ts   # approve/reject arms for the review gate
│   └── seed_fp_cluster.ts             # seeds one rule + its closed-FP alert cluster
├── src/
│   ├── constants.ts                   # workflow ids, four-branch vocabulary, tag literals
│   ├── evaluators.ts                  # ChangeTypeAccuracy, ValidProposal
│   ├── evaluators/tool_routing.ts     # trace-based Tool Routing + setup reachability probe
│   ├── evaluators/run_summary.ts      # per-evaluator mean ± CI95 (n=N), SATURATED flags
│   ├── score_stats.ts                 # CI95 / saturation / paired-delta statistics
│   ├── approval_gate_contract.test.ts # pins the gate the approval spec asserts on
│   └── workflow_task.ts               # drives worker + review, returns the graded verdict
└── playwright.config.ts
```

## Prerequisites

1. A Kibana on the suite's Scout config set (`evals_detection_watch_rule_tuning`), which enables
   `xpack.alertzero.enabled`, `xpack.agenticInvestigations.enabled`, `xpack.inbox.enabled` and the
   workflows UI/AI-agent settings. Without `agenticInvestigations` the managed workflow is never
   installed and every request 404s.
2. A connector configured for the review's `ai.agent` step (space default) and one for the LLM
   judge. `node scripts/evals init` walks through connector discovery.
3. **Agent Builder spans exported to a tracing cluster.** Point the suite at it with the tracing
   Elasticsearch env vars documented in `x-pack/platform/packages/shared/kbn-evals/README.md`
   (the suite falls back to its own ES cluster when they are unset). `Tool Routing` joins on the
   review execution's `trace.id`, then on the diagnose step's `gen_ai.conversation.id`. The spec's
   `beforeAll` probes reachability once and **fails setup** if neither key reaches a TOOL span —
   otherwise every trace score would be N/A and the run would still look green.

## Running

```bash
# Manages Scout + EDOT for you, and picks the suite's serverConfigSet from evals.suites.json.
node scripts/evals start --suite detection-watch-rule-tuning --repetitions 3

# Stack already up (e.g. a Scout server started earlier in this session):
EVAL_REPETITIONS=3 node scripts/evals run --suite detection-watch-rule-tuning

# Iterating on one fixture (noise-tolerant; do not use for a comparison):
node scripts/evals start --suite detection-watch-rule-tuning --repetitions 1 --grep "fp-host-exception"
```

`EVAL_REPETITIONS` overrides the suite's `playwright.config.ts` default; `--repetitions` sets the
same variable.

### Why `EVAL_REPETITIONS=3`

`playwright.config.ts` sets `repetitions: 3` as the CI default, and `evals.suites.json` carries **no**
per-suite `repetitions` key for any suite — CI inherits the config default. Do not add one.

The number is a statistical floor, not a preference: judged tuning decisions are stochastic, and the
sibling suite's characterization measured a **run-to-run band of >0.11** on the same model and code.
**A single pass (n=1) sits inside that band and is not evidence** — it cannot distinguish a regression
from sampling noise, and neither can an n=1 comparison between two models. Three passes per example
give the per-evaluator summary a CI95 to compare against; anything that will be read as a
model-quality claim needs at least that.

### Wall time

The workflow's concurrency group is `max: 1, strategy: drop`, so the experiment runs at
`concurrency: 1` and **wall time scales linearly with the fixture count**: measured ~233s per fixture,
i.e. ~6.8h for 35 fixtures × 3 repetitions. `playwright.config.ts` therefore sets `timeout: 8h`; the
previous 30m budget killed every attempt with `Test timeout of 1800000ms exceeded` regardless of
model quality. Re-measure both numbers whenever the fixture count or the workflow's step cost moves.

## Approval gate (approve / reject)

The decision suite grades *what the review proposed*; it never shows that the gate matters,
because the harness in `src/workflow_task.ts` answers every gate with `approved: true`. A gate
that ignored its input would score identically.

`evals/rule_tuning_approval.spec.ts` closes that hole with two deterministic tests over the
`fp-overbroad-query` fixture (a plain `query` rule, so an approval can actually reach
`apply_query_tuning`):

| Arm | Response | Asserted against |
|-----|----------|------------------|
| reject | `approved: false` | rule `query` byte-identical to its pre-run value, `updated_at` untouched, alerts tagged `detection-watch:tuning-dismissed` (and **not** applied/acknowledged) |
| approve | `approved: true` | rule `query` == the persisted `proposed_query`, alerts tagged `detection-watch:tuning-applied` |

Both arms seed and sweep their own rule, so a failed arm cannot leak a fixture into a later run.

```bash
# Approval arms alone. The gate mechanics are deterministic, so n=1 is enough here
# (unlike the judged decision suite, where n=1 sits inside the noise band):
EVAL_REPETITIONS=1 node scripts/evals run --suite detection-watch-rule-tuning \
  --grep "approval gate"
```

Wall time is ~233s per arm per repetition (same worker sweep, preview pair and gate as a decision
fixture), and each test has its own budget — they do **not** share the decision suite's 8h
timeout arithmetic in `src/eval_budget.test.ts`.

`src/approval_gate_contract.test.ts` pins the same arms without a stack: it evaluates the review
workflow's own gate conditions with the engine the workflow runs on. It is the mutation target —
invert `apply_query_tuning.if` in `rule_tuning_review.yaml` and the reject-arm test goes red.

## Reading a run

Each dataset run (i.e. each repetition) ends with one line per evaluator:

```
📊 security: rule-tuning-workflow-decision | ChangeTypeAccuracy: mean 0.667 ±0.365 (n=35)
📊 security: rule-tuning-workflow-decision | ValidProposal: mean 1.000 ±0.000 (n=35) [SATURATED(no signal)]
📊 security: rule-tuning-workflow-decision | Tool Routing: mean 1.000 ±0.000 (n=34) [N/A×1]
```

`n` counts one repetition's examples; the framework's score table aggregates the repetitions for the
final per-model numbers.

- `mean ± ci95 (n=N)` — the resolution limit of the number next to it. Deltas smaller than the
  combined CI95 of two runs are not resolvable at that n.
- `SATURATED(no signal)` — every score identical *and* at an extreme (0 or 1). Report it; never
  average it into a pass/fail claim. `ValidProposal` is expected to saturate.
- `N/A×k` / `UNMEASURED` — measurement gaps. `Tool Routing` returns N/A, not 0, when no TOOL span is
  reachable, and an evaluator with `n=0` measured nothing at all.

## Unit tests

```bash
node scripts/jest --config x-pack/solutions/security/packages/kbn-evals-suite-detection-watch-rule-tuning/jest.config.js --maxWorkers=2
```

These cover the evaluators, the trace join/diagnosis logic, the score statistics, the summary
labelling and the approval gate's conditions (evaluated with the workflow's own Liquid engine);
they need no stack.
