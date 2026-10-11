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

## Open questions before Pilot

- **Counterfactual** — what's the approval rate for manually-created rules? Sets the bar for whether 70% is good or just acceptable.
- **Volume** — how many proposals per week? 30% dismissal is fine at 5/week, a burden at 100/week.
- **Qualitative** — add a one-question analyst satisfaction check alongside the numeric threshold.

## Out of scope (MVP)

- D1/D2 authz gates — pending Orchestrator identity setup
- Shared Approval Gate — local stub until shared engine lands
- WorkerEvaluationRecord round-trip — API not shipped (issue #18175)
- Rule Tuning Worker — separate eval
---

## Running the evals: repetitions

`playwright.config.ts` sets `repetitions: 3`, and that is the number CI runs. It resolves
in `create_playwright_eval_config.ts` with the priority **env var > config parameter >
default of 1**:

```ts
const experimentRepetitions =
  parseInt(process.env.EVAL_REPETITIONS || '', 10) || repetitions || 1;
```

So `EVAL_REPETITIONS=5` overrides the config for a single run, and dropping the config key
silently falls back to `1` rather than to 3.

`.buildkite/pipelines/evals/evals.suites.json` carries **no** per-suite repetitions key --
its `detection-watch-rule-creation` entry only registers `configPath`, `serverConfigSet`,
tags and CI labels. The suite's own Playwright config is the only place the repetition
count is set, so changing CI's repetition behaviour means editing that file.

### Why n=1 is not evidence

These evaluators are LLM-scored and the workflow is non-deterministic: the same input can
produce a different rule, a different tool sequence, and therefore a different score on
consecutive runs. A single repetition gives one draw from that distribution with no
estimate of its spread, so an n=1 delta cannot distinguish a real regression from
run-to-run variance.

Repetitions are what make a score comparable across runs. Use `>= 3` for any number that
will be quoted, compared against a previous run, or used to argue a change helped -- and
report the spread alongside the mean, not the mean alone.

n=1 remains useful for smoke-checking that the suite boots and the plumbing works, where
the question is "did it run" rather than "did it get better".

> The exact noise band for this suite has not been measured. Until someone runs the suite
> repeatedly against an unchanged build and publishes the observed spread, treat "3" as a
> floor that makes variance visible, not as a figure derived from a known band.
