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

## Proposal gate (approve and dismiss)

`evals/hunt_watch_approval.spec.ts` is an unscored e2e for the human side of the gate. Each test
resets and runs the golden hit report in the default space, decides every pending Proposal it
raised, waits for the Investigation to close, and checks the records:

| Path | Proposal record | Investigation |
|---|---|---|
| approve | `decision: approved`; an actioned Proposal runs its action and ends `succeeded`, an actionless one ends `no_action` | `closed` / `resolved` |
| dismiss | `decision: dismissed`, the `dismissReason` sent, `no_action` for every Proposal (an action that ran would show as `succeeded`) | `closed` / `resolved` |

The gate closes once nothing is pending or executing, whatever was decided, so dismiss ends
`resolved` too. `src/hitl_contract.test.ts` pins where decisions may come from: approve exists
only in `src/proposal_gate.ts`, which only this spec imports, and dismiss exists there and in the
pre-run reset. Scored tasks never decide a Proposal.

## Datasets

- `datasets/golden.ts`: one row per core path (confirmed hit, clean no-hit, blocked index scope).
- `datasets/hard_cases.ts`: multi-candidate fan-out, clean repeat, unknown report id,
  IOC-only difficult hit.
- `datasets/canary.ts`: a suite-authored prose-only report scored only by the inverted evaluator.
- `datasets/holdout.ts`: one hit, one IOC-only hit and one clean row on report ids the iteration
  cohorts never touch. Skipped unless `HUNT_WATCH_HOLDOUT=1`, so day-to-day runs cannot tune
  against it. Compare a holdout run with an iteration run through `evaluation.gap-report`.

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

## Lockdown scan

`src/lockdown.test.ts` fails in Jest if any fixture literal the datasets rely on (decoy IPs,
seeded principals, the actor name, bucket, host, role, account id, report id prefix, canary id
and title) appears in the Worker's prompt or definition surfaces: the `hunt*` managed workflow
definitions, the hunt watch services and the hunt routes. Comments are stripped first, so a doc
comment naming a fixture does not count; a string literal or a prompt line does. The scan list
lives in `LOCKDOWN_SCAN_PATHS` in `src/lockdown.ts`.

## Gate checklist

`gate_checklist.yaml` records, for every NotDaybreak gate family, whether this suite tests the gate
(with the evaluator or spec as evidence) or why it does not apply. D8 is required `tested` because
the Worker declares `hitl-resumed-writes`. The validator (`evaluation.gate-checklist` in `validate`
mode) only reads a file named `gate-checklist.yaml`, which Kibana's file casing check rejects, so
validate a copy:

```bash
d=$(mktemp -d) && cp gate_checklist.yaml "$d/gate-checklist.yaml"
# then: evaluation.gate-checklist { mode: "validate", suite_dir: "$d" }
```

<!-- gate-checklist:begin -->
| Gate | Status | Evidence / reason (short) |
| --- | --- | --- |
| A1 dedup | n/a | one trigger per space; reset clears open Proposals |
| A2 output-validation | tested | `SSE Attachment`, `Outcome Label`, `Hit Consistency` |
| A3 approval-boundary | n/a | `alwaysGate` is fixed by the product |
| B-completeness | n/a | policy matrix not varied; hunt Proposals always gate |
| B-fail-closed-default | n/a | same |
| B-monotonicity | n/a | one autonomy level |
| B-reversibility | n/a | approval unconditional |
| B-audit-fidelity | n/a | only approve and dismiss exercised |
| C-process | n/a | no Pilot claim; thresholds unratified |
| D1 subject-separation | n/a | orchestrator identity not observable |
| D2 authz-scoping | n/a | role scoping not probed |
| D3 investigation-containment | tested | one Investigation per report; space-isolation case |
| D4 hitl-pause-fail-closed | tested | dismiss path in the approval spec |
| D5 allowlist-boundary | n/a | callable surface fixed by managed children |
| D6 open-vs-append-determinism | n/a | append not exercised |
| D7 incident-fork-integrity | n/a | no Incident fork |
| D8 approval-identity-rekey | tested | approve path in the approval spec |
| D9 thread-depth-fork-root-containment | n/a | no threads or forks |
| D10 proposal-gate-exclusivity | tested | `Proposal Presence`, `Canary Inverted`, approval spec |
| D10a watch-tag-grouping | n/a | Worker triggered directly |
| D10b per-worker-settings-scope | n/a | v1 bridge is space-level |
| D10c execute-time-revalidation | n/a | no Defend endpoint actions |
| D10d coverage-handoff-integrity | n/a | out of scope |
<!-- gate-checklist:end -->

## Known Worker behavior pinned by the datasets

- No-hit rows end `completed` with the Investigation `closed` / `close_reason: benign`, and the
  gate's resumed close writes `closed` / `resolved`. Both depend on the Worker's in-process
  `ai.conversation.metadata.patch` being allowed to patch a conversation the service account owns
  (Public conversation access, #297385). Before that landed the clean rows pinned `partial` at
  `packaging` and the gate spec timed out at `waitForInvestigationClosed`; if either comes back,
  that is the first place to look.
- A confirmed hit raises more than one Proposal, so the hit rows use a minimum rather than an
  exact count.
