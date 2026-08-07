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

## Open questions before Pilot

- **Counterfactual** — what's the approval rate for manually-created rules? Sets the bar for whether 70% is good or just acceptable.
- **Volume** — how many proposals per week? 30% dismissal is fine at 5/week, a burden at 100/week.
- **Qualitative** — add a one-question analyst satisfaction check alongside the numeric threshold.

## Out of scope (MVP)

- D1/D2 authz gates — pending Orchestrator identity setup
- Shared Approval Gate — local stub until shared engine lands
- WorkerEvaluationRecord round-trip — API not shipped (issue #18175)
- Rule Tuning Worker — separate eval
