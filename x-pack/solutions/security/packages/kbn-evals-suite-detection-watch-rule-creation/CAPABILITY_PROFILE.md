# Capability Profile: Rule Creation Worker v0.1-draft

**Owner:** Hannah Brooks  
**Reviewer:** Vitalii

---

## What we're betting on

AI generates valid ES|QL detection rules for coverage gaps, with a low enough false-positive rate to not overwhelm the approval queue.

## Pass / kill thresholds

| Signal | Threshold | Status |
|--------|-----------|--------|
| Analyst approval rate at Pilot | ≥70% | unratified |
| Kill: rejection rate | >50% | unratified |
| Kill: auto-execution without approval | any instance | hard rule |

## Threshold tradeoffs

**Ratify early** — clear pass/fail line before Pilot, easier stakeholder buy-in. Risk: committing to a number before knowing if it's achievable creates pressure to massage the eval rather than improve the worker.

**Leave unratified** — run honest evals first, negotiate the threshold against real data. Risk: without a pre-agreed number, goalposts can shift after results come in. The playbook allows unratified for MVP slice but requires sign-off before a Pilot promotion claim.

## Eval methodology: repetitions and resolution limits

Every number this suite produces is an average over a small sample, so the run has to state its own
resolution limit. Two rules follow, and both are enforced in the code rather than by convention.

**1. The suite runs each example 3× — an `n=1` result is not evidence.**

`playwright.config.ts` sets `repetitions: 3`. The repetition count resolves as
`EVAL_REPETITIONS` env → `repetitions` in the config → `1`, at
`x-pack/platform/packages/shared/kbn-evals/src/config/create_playwright_eval_config.ts:75`; the
`--repetitions <n>` CLI flag feeds that env var
(`x-pack/platform/packages/shared/kbn-evals/src/cli/run_helpers.ts:379`,
`x-pack/platform/packages/shared/kbn-evals/src/cli/commands/run.ts:92`), and it is listed among the
eval env vars in `scripts/evals.js:234` and
`x-pack/platform/packages/shared/kbn-evals/src/cli/commands/env.ts:23`.

Why 3: three runs of **identical code, the same model and the same judge** spread 0.11–0.12 on
this suite's discriminating evaluators — Tool Routing 1.00 / 1.00 / 0.88, MITRE Accuracy
0.61 / 0.65 / 0.54. A single-repetition delta of that size (or smaller) is sampling, not signal,
so a run at `n=1` may only be read as "the suite booted and the contracts held". Never report a
score, and never compare models, from an `n=1` run.

`.buildkite/pipelines/evals/evals.suites.json` deliberately has **no** `repetitions` key for any
suite — CI inherits this config default, so the default is the single source of truth. Do not add
a per-suite key there to change the repetition count; override it locally instead:

```bash
EVAL_REPETITIONS=1 node scripts/evals run --suite detection-watch-rule-creation
```

**2. Every mean is reported with its CI95, and saturated evaluators are flagged, not averaged.**

`src/score_stats.ts` computes `ci95` and `saturated`; `logRunSummary`
(`src/evaluators/dataset_evaluator.ts:354`) prints one line per evaluator at the end of each
dataset execution:

```
📊 <dataset> | <evaluator>: mean <m> ±<ci95> (n=<N>) [SATURATED(no signal) N/A×<k> UNMEASURED]
```

Read it as follows:

- `n` is the number of examples scored **in that execution**, so at `repetitions: 3` there are
  three summaries per dataset. The spread *between* them is the run-to-run noise above; `ci95` is
  the resolution limit *within* one of them (`areDistinguishable` requires the two arms' CI bands
  not to overlap before a difference may be called real).
- `SATURATED(no signal)` means every score was identical and at an extreme: that evaluator
  discriminated nothing in this run, so it cannot show improvement. Write "saturated" — never
  "+0.0".
- `N/A×k` and `UNMEASURED` are measurement gaps, not passes. A suite that scores `N/A` everywhere
  is green and measures nothing.

## Open questions before Pilot

- **Counterfactual** — what's the approval rate for manually-created rules? Sets the bar for whether 70% is good or just acceptable.
- **Volume** — how many proposals per week? 30% dismissal is fine at 5/week, a burden at 100/week.
- **Qualitative** — add a one-question analyst satisfaction check alongside the numeric threshold.

## Out of scope (MVP)

- D1/D2 authz gates — pending Orchestrator identity setup
- Shared Approval Gate — local stub until shared engine lands
- WorkerEvaluationRecord round-trip — API not shipped (issue #18175)
- Rule Tuning Worker — separate eval
