# Capability Profile: Detection Coverage Review v0.1-draft

**Owner:** unassigned
**Reviewer:** unassigned

---

## What we're betting on

The Detection Coverage Review reads a detection gap and finds the cheapest fix: an installed rule
that already covers it (enabled or disabled), a prebuilt rule to install, or no rule. The bet is
that the review picks the right verdict and the right rule often enough that analysts accept its
proposals, and that it never proposes an action on a rule other than the one it names.

## Signals

| Signal | Where it is scored | Status |
|--------|--------------------|--------|
| The verdict is the expected one | `Verdict` (code) | tested |
| `rule_id` points to the expected rule or an accepted alternate | `Rule Match` (code) | tested |
| `rule_id` and `rule_name` name the same rule | `Rule Match` metadata `nameMatchesId` (code) | tested |
| A `prebuilt_available` answer names a catalog rule that is not installed, at its catalog version | `Installable` (code) | tested |
| The rationale names a behavior from the gap, agrees with the rule, and agrees with the verdict | `Rationale` (LLM judge) | tested |
| The judge fails bad answers and passes correct ones | `Judge Calibration` (LLM judge) | tested |

## Pass / kill thresholds

| Signal | Threshold | Status |
|--------|-----------|--------|
| `Verdict` mean on each dataset | ≥ 0.8 | unratified, gated |
| `Rule Match` mean on each dataset | ≥ 0.8 | unratified, gated |
| `Rationale` mean | none | reported only |
| `Judge Calibration` mean | none | reported only |
| Kill: `rule_id` of one rule with the `rule_name` of another | any instance | hard rule, gated |
| Kill: `rule_id` that points to no installed or prebuilt rule | any instance | hard rule, gated |
| Kill: a `prebuilt_available` answer that the proposal cannot install | any instance | hard rule, gated |

`src/score_gate.ts` applies the gated rows after each workflow dataset, and fails the test with a
list of the problems. A check that returned no answer scores 0 and counts in the mean. LLM judge
scores are reported, never gated.

Baseline of 2026-11-12 (Claude Sonnet 5, judge Claude Opus 4.7, 3 repetitions, no failed checks):

- prebuilt suggestion: Verdict 0.98, Rule Match 0.97, Installable 0.98, Rationale 0.99.
- verdicts: Verdict 0.86, Rule Match 0.80, Rationale 1. VD-02 suggested a prebuilt rule in all 3
  repetitions, because `find_rules` did not find the installed rule.
- judge calibration: 1.
- The gate failed the prebuilt test once: in one RS-14 answer, `rule_id` belonged to another rule
  than `rule_name`.

## Threshold tradeoffs

The code scores of this suite measure a model choice, so they change from run to run. A gate that
needs every code score to be 1 would fail on one inference timeout, or on the known `find_rules`
problem (VD-02 or VD-03 misses in most runs). Such a gate is red on most runs and stops being read.
So the means have a floor, and only an answer that would act on the wrong rule fails at once.

With 20 examples and 3 repetitions, one example that is wrong in every repetition moves the
prebuilt mean by 0.05. The floor of 0.8 allows about 12 misses of 60 on that dataset, and 4 of 21
verdicts. It catches a broad drop. It does not catch one example that starts to fail. Compare runs
with `node scripts/evals compare` for that.

## Open questions before Pilot

- **Counterfactual.** How often does an analyst pick the same rule from the same gap? The answer
  key comes from one product manager.
- **Dataset breadth.** The prebuilt gaps are all Linux. Windows, cloud and identity gaps are not
  in the dataset.
- **Judge family.** The judge (Claude Opus) and the task model (Claude Sonnet) are the same family.
  A judge from another family would tell whether the Rationale scores hold.
- **Holdout.** The suite has no holdout dataset yet. Add one before the answer key is used to tune
  the review prompt.

## Out of scope

- The steps after the check: proposals, rule install, rule enable and rule creation. They need a
  service account (see the README). Approve and dismiss are fixed workflow logic, so a Jest
  integration test with a fake agent is the better place for them.
- The Detection Watch sweep that starts the reviews.
