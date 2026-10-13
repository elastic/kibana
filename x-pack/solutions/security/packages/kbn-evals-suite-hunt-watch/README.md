# Hunt Watch Worker Evaluation Suite

Evaluates the Hunt Watch Worker (the managed per-space workflow
`system-security-hunt-continuous-threat-hunt-{spaceId}`) end to end: it triggers the real
Worker with named threat report ids, then scores what the Worker left behind (step outputs,
the Investigation conversation, its Proposals, and the report doc).

## Evaluators

All CODE evaluators are gates: 1 means the expectation was met. `score: null` is never a pass.
`label: 'N/A'` means the check does not apply to the row; `label: 'MISSING'` means the
artifact it needed was absent, which the golden gate treats as a failure.

| Name | Kind | What it checks |
|---|---|---|
| Outcome Label | CODE | `resolve_run_outcome` is one of the accepted labels, plus `incomplete_stage` when pinned |
| Index Scope Gate | CODE | `index_scope_blocked` matches, and a blocked run opens no Investigation |
| Candidate Selection | CODE | named reports were selected; expected skip reasons (`not_found`) reported |
| Stage Progression | CODE | find-or-create, hunt, package, conclusion all completed, in order |
| Hit Consistency | CODE | hunt `hit`, SSE `has_confirmed_hit`, and `hit_sources` agree with the expectation |
| Tier 1 Status | CODE | SSE `hunt_result.tier1.status`, falling back to the hunt headline |
| Tier 2 Execution | CODE | whether any behavior query executed |
| SSE Attachment | CODE | a `security.significant_security_event` attachment with a `hunt_result` exists iff expected |
| Evidence Honesty | CODE | report `evidence[]` written iff the hunt completed (`hunt.output.status === 'success'`) |
| Proposal Presence | CODE | pending Proposals on the Investigation match the exact count or minimum |
| Investigation Status | CODE | conversation `metadata.status`, or no conversation at all |
| Canary Inverted | CODE | 1 iff a prose-only report produced no hit, no Tier 2 execution, no Proposal, no SSE |
| Narrative Rubric | LLM | per-row criteria over the messages the Worker posted to the Investigation; reported, not gated |
| Factuality | LLM | narrative claims against a ground truth synthesized from the row's pinned expectations; reported, not gated |
| Relevance | LLM | share of narrative claims that answer the hunt question; reported, not gated |
| Groundedness | LLM | narrative claims against the hunt facts (hunt output, SSE `hunt_result`, packaging, Proposals, evidence); reported, not gated |

The LLM evaluators judge the narrative the Worker posted to the Investigation, so they are
`N/A` on rows that expect no Investigation and `MISSING` when a narrative was expected but the
judge produced nothing. Factuality, Relevance and Groundedness reuse the `@kbn/evals`
correctness and groundedness judges; `src/evaluators/judge_analysis.ts` maps a hunt run onto
the chat shape those judges expect (question, final message, tool-call history, ground truth)
and runs both analyses once per row inside the task. Sequence Accuracy is left out because a
hunt narrative is a verdict, not a procedure. The canary cohort runs CODE only: an LLM score
cannot rescue it.

Read the LLM scores against their ceilings. The ground truth is synthesized from the row's
pinned expectations, so Factuality docks the narrative's peripheral detail (publish date,
indicator values, search window) as "not in ground truth"; about 0.9 is a healthy row, and a
drop below that points at a central claim the judge contradicted. Counts a row leaves unpinned
(no `tier1Status`, no `tier2Executed`, `pendingProposals: { min: 0 }`) are stated to the judge
as open, so the narrative is not docked for reporting them. Groundedness judges the same
narrative against the collected hunt facts (report doc, hunt output, coordinator result, SSE,
packaging, Proposals, evidence, plus every pending Proposal in the space because convergence
notes cite other Investigations), so a dip there is a claim the Worker made that none of its
own data supports.

## Datasets

- `datasets/golden.ts`: one row per core path (confirmed hit, clean no-hit, blocked index scope).
- `datasets/hard_cases.ts`: multi-candidate fan-out, partial clean probe, unknown report id,
  IOC-only difficult hit.
- `datasets/canary.ts`: a suite-authored prose-only report scored only by the inverted evaluator.

Report ids bind to the Demo C+ aws-iam scenarios from the Security Solution data generator
(`security_solution/scripts/data/generate_cli.js`). `src/seed_contract.test.ts` reads the
generator source so an id, slug, or Investigation-id drift fails in Jest before it fails live.

## Seeding and reset

The `huntWatchSeed` worker fixture runs the generator once per worker, copies one report into
each non-default eval space (`hunt-a`, `hunt-b`, `hunt-blocked`), writes the canary, and
verifies every bound id exists. Teardown deletes the seeded reports. The eval spaces themselves
are created once and left in place: deleting and recreating them between runs races the
per-space Worker install and its service-account binding on a long-lived stack.

Before each row, `resetHuntReport` dismisses pending Proposals on the report's Investigation,
waits for them to settle (dismiss only resumes the gate workflow; the status flips a few
seconds later, and the Worker skips a report whose Investigation still has an open Proposal),
deletes the Investigation, and clears `evidence` on the report doc.

## Running

```bash
# One-time: EIS CCM. The Worker-enable gate checks that an EIS inference endpoint resolves,
# so this must run before `evals start` on a fresh stack.
node scripts/eis

# Start the stack and run every cohort
node scripts/evals start --suite hunt-watch --profile local \
  --judge eis-google-gemini-3-1-pro --model eis-google-gemini-3-1-pro

# Reuse a running stack, one cohort
node scripts/evals start --suite hunt-watch --profile local --skip-server --grep golden \
  --judge eis-google-gemini-3-1-pro --model eis-google-gemini-3-1-pro
```

A full run of all three cohorts takes about 18 minutes with `workers: 1`. The suite is pinned
to one worker and `concurrency: 1` because the Worker's per-space
`concurrency: { strategy: drop, max: 1 }` silently drops a trigger that races another sweep.

The `local` profile's `evaluationsKbn.url` defaults to `localhost:5601/dev`. When the Scout
stack is the only Kibana running, point it at `localhost:5620` in
`x-pack/platform/packages/shared/kbn-evals/scripts/vault/config.local.json`.

In CI the `Evals: Hunt Watch` step in `.buildkite/pipelines/evals/llm_evals.yml` runs weekly
over `weekly_eis_core_models` with `EVAL_SERVER_CONFIG_SET: 'evals_hunt_watch'`, and sets
`FTR_EIS_CCM: '1'`, which does the same provisioning as `node scripts/eis`. The judge comes from
the `models:judge:<id>` PR label, resolved by `normalizeEvaluationConnectorId`.

## Known Worker behavior pinned by the datasets

- The clean path's benign close currently fails with `Conversation <id> not found`, so no-hit
  rows end `partial` with `incomplete_stage: packaging` and the Investigation stays open.
  When the close works those rows flip to `completed` and `closed`.
- A confirmed hit raises more than one Proposal, so the hit rows use a minimum rather than an
  exact count.
