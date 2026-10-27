# Capability Profile: Hunt Watch Worker v0.1-draft

**Owner:** Steph Milovic
**Reviewer:** unassigned

---

## What we're betting on

The Hunt Watch Worker turns a threat intel report into a reviewable hunt outcome: a schema-valid
`hunt_result`, an Investigation that says what was searched and what was found, and gated
Proposals only when there is a confirmed hit in the environment. The bet is that it does this with
a low enough false mint rate (Proposals on clean or prose-only reports) that the approval queue
stays trustworthy.

## Signals

| Signal | Where it is scored | Status |
|--------|--------------------|--------|
| Outcome label and incomplete stage match the pinned expectation | `Outcome Label` (code) | tested |
| `hunt_result` validates against `huntResultSchema` | `SSE Attachment` (code) | tested |
| Hit, `has_confirmed_hit` and `hit_sources` agree | `Hit Consistency` (code) | tested |
| Proposals raised only on confirmed hits, never on canary or clean reports | `Proposal Presence`, `Canary Inverted` (code) | tested |
| Shared principals across reports mint one actioned Proposal and record convergence | `Proposal Convergence` (code) on multi-candidate | tested |
| Investigation stays in the triggering space | space-isolation case in `evals/hunt_watch.spec.ts` | tested |
| Approve executes the action, dismiss does not, and the Investigation closes either way | `evals/hunt_watch_approval.spec.ts` | tested |
| Report, queries and findings are grounded in the Worker's own tool calls | `Groundedness Analysis` (LLM judge) | tested |
| Hunt narrative is correct against the pinned expectation | `Correctness Analysis`, `Factuality`, `Relevance` (LLM judge) | tested |
| Prompt and definition surfaces contain no fixture literal | `src/lockdown.test.ts` (Jest) | tested |

## Pass / kill thresholds

| Signal | Threshold | Status |
|--------|-----------|--------|
| Golden cohort code-score pass rate | 100% | unratified |
| Hard cohort code-score pass rate | ≥ 80% | unratified |
| Judge Groundedness mean (golden and hard) | ≥ 0.90 | unratified |
| Judge Factuality mean (golden and hard) | ≥ 0.80 | unratified |
| Holdout cohort within 10 points of the iteration cohort on every code score | gap report | unratified |
| Kill: Proposal minted on a canary or clean report | any instance | hard rule |
| Kill: action executed without an approve decision | any instance | hard rule |
| Kill: fixture literal in a prompt or definition surface | any instance | hard rule |

The numbers above come from the baseline run on main of 2026-10-14 (golden 1.000 / 0.921 / 0.917 and
hard 1.000 / 0.959 / 0.952 for Groundedness / Factuality / Relevance). They are a starting point
for review, not a promise: a golden rerun the same day scored Relevance 0.800, so with two or
three judged rows per cohort a single run moves by about ±0.1. Code scores are gated in the suite
(any 0 or MISSING fails the cohort); judge scores are compared against the rolling `main` history
with `node scripts/evals compare` rather than against these fixed numbers. The playbook allows
unratified thresholds for the MVP slice but requires sign-off before any Pilot claim.

## Threshold tradeoffs

**Ratify early.** A clear pass or fail line before Pilot makes stakeholder review simple. Risk:
committing before the iteration dataset settles creates pressure to tune the dataset to the number
rather than improve the Worker.

**Leave unratified.** Run the suite weekly, run the holdout cohort once the iteration cohort
stabilizes, then negotiate thresholds against real gap reports. Risk: goalposts can move after the
results arrive. This profile takes the second path and records the numbers it would ratify today.

## Open questions before Pilot

- **Counterfactual.** How often does an analyst hunting the same report by hand reach the same
  verdict? Without that baseline a 100% golden pass rate says the pins are right, not that the
  Worker is good.
- **Volume.** How many reports per week per space? The gate drops a racing trigger per space, so
  throughput shapes whether `drop` is acceptable or needs a queue.
- **Judge drift.** The judge is Gemini 3.1 Pro and the task model is the same family in local runs.
  A second judge on the holdout cohort would tell us whether the groundedness numbers hold.
- **Qualitative.** Add a one-question analyst read of the Investigation summary alongside the
  numeric thresholds.

## Out of scope (MVP)

- Correlation across reports, and any claim about Entity Store scoring. The Worker does not do
  these and the suite does not score them.
- A chat skill or conversational surface for hunts.
- Fault rows beyond the two in `hard_cases.ts` (IOC bound overflow for `partial`, locked
  Investigation for `failed`). Retryable gaps such as `search_partial` or `index_unavailable` are
  not staged; the suite removes the one race that produced them live (see "Seeding and reset").
- D1 and D2 authorization gates. The suite has no view of the orchestrator identity.
- Modify, defer and expire decisions on Proposals; only approve and dismiss are exercised.
- Coverage handoff to the Detection Watch.
