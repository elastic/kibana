# Attack Discovery worker chain — L3 chain-plumbing suite

## What this is

A deterministic, non-LLM-judged Jest integration suite proving the PLUMBING of
the AlertZero Attack Discovery worker chain:

```
attack_discovery_review.yaml
  --workflow.execute--> attack_discovery_fp_tp_analysis.yaml
  --workflow.execute--> system-create-proposal (shared escalation gate)
                          --workflow.execute (on approval)--> action_handoff_to_forensics.yaml
```

Every workflow YAML driven here is the REAL, UNMODIFIED shipped definition
(`@kbn/workflows/managed`). The only fake is the `handler` on a handful of
step-type definitions — never the YAML, never the step schema. This is L3 in
the 4-layer AlertZero eval model: L2 (`kbn-evals-suite-attack-discovery-fp-tp-*`
packages) already scores the FP/TP analysis's classification *quality* against
a judged dataset. This suite proves the chain's *plumbing*: given a verdict,
does the review take the right lifecycle action, park the right gate, and read
the right decision back — with no LLM judge, no dataset, no scoring.

## Why this package, not `kbn-evals-suite-*`

Named as plain Jest integration tests under the `alertzero` plugin
(`x-pack/solutions/security/plugins/alertzero/integration_tests/...`), NOT
`kbn-evals-suite-attack-discovery-*`, to avoid repeating the #293164 collision:
PR #293133's L2 suite and merged PR #293164 both used
`kbn-evals-suite-attack-discovery-fp-tp` for different things. This suite has
no dataset, no LLM judge, and no `kbn-evals` runner — it is exactly the same
shape as `workflows_execution_engine`'s and `proposals`' own
`integration_tests/*.test.ts` suites (`node scripts/jest_integration.js`), so
it lives in the same style, under the plugin whose chain it exercises. Flag
this name (`attack_discovery_worker_chain`) against other in-flight AlertZero
L3 work before building on top of it.

## How it runs

```
node scripts/jest_integration.js \
  --config x-pack/solutions/security/plugins/alertzero/integration_tests/attack_discovery_worker_chain/jest.integration.config.js \
  --runInBand
```

26/26 passing as of this suite's introduction.

## Files

- `attack_discovery_chain_fixture.ts` — wires the shared
  `WorkflowRunFixture` (`@kbn/workflows-execution-engine/test_helpers`) to a
  real `ProposalsService` + real proposal step definitions (same pattern as
  `proposals/integration_tests/proposal_gate_fixture.ts`), the fake AlertZero
  step registry below, and a fake `workflowsExecutionEngineMock.executeWorkflow`
  that inserts each `workflow.execute` child's PENDING row into the SAME
  shared execution repository the parent reads from — this is what turns the
  isolated single-workflow fixture into a multi-workflow CHAIN harness.
- `chain_step_registry.ts` — fake step definitions for `ai.agent`,
  `ai.conversation.create/metadata.read/metadata.patch`, `ai.attachment.add/
  read/update`, `security.setAttackStatus`, and `context-engine.createKi`.
  Every one of them spreads the REAL `*StepCommonDefinition` (schema, config,
  everything) from the plugin that ships it and fakes only the `handler` — a
  future schema drift between the real step and this fake's assumptions fails
  loudly (a rendered `with:` that no longer validates) instead of silently
  degrading.
- `kibana_request_fake.ts` — mocks `global.fetch`, which is what the built-in
  `kibana.request` step type calls. Answers exactly the two paths the chain's
  `kibana.request` steps ever hit: the journal-note converse call, and the
  review's read-back of the proposal decision (`GET /internal/proposals/:id`),
  routed through the SAME `ProposalsService` instance the escalation gate
  writes through.
- `chain_plumbing_helpers.ts` — managed-YAML/document lookup helpers, and
  `driveChain()`: a driver loop that runs every PENDING execution, then
  resumes a parent once ITS CURRENT `workflow.execute` child (tracked
  out-of-band in a `childToParent` map — see the code comment on why this
  cannot be derived from `execution.context`, which the engine's own
  terminal-state persistence mutates unpredictably across repeated writes) has
  reached a terminal status, until the set of executions stops moving.
- `attack_discovery_worker_chain.test.ts` — the suite itself: all 3 real
  `ai.agent` verdicts (false_positive / true_positive / inconclusive), the
  escalation gate's approve and dismiss branches, the gate's 72h expiry
  branch, and the `failed` execution-state arm (an unknown
  `attack_discovery_id`, which fails `require_attack_discovery` in the fp/tp
  analysis child and reaches the review's `failed` arm).

## Coverage notes

**All 3 real `ai.agent` verdicts**: covered, via `chain_step_registry.
queueAgentVerdict()`. `false_positive` closes the Investigation and the
attack with no escalation. `true_positive` and `inconclusive` both escalate
identically (per `attack_discovery_review.yaml`'s `apply_verdict` switch —
insufficient evidence is a reason to look harder, same handoff as a confirmed
positive).

**The `failed` execution-state arm**: covered. Pointing the review at a
nonexistent `attack_discovery_id` reaches `attack_discovery_fp_tp_analysis.
yaml`'s `require_attack_discovery` failure (an empty search — the AD Worker
never persisted a document for that id), which fails the fp/tp analysis child
run. The review's `resolve_analysis` step degrades the absent child output to
`failed_verdict` — its own documented contract, not a classification — lands
in the `failed` arm of `apply_verdict`, records the lapse on the Investigation
(left open), and takes no lifecycle action. `ai.agent` is never called on this
path (asserted).

**The escalation gate's approve/dismiss branches**: covered, through the REAL
`system-create-proposal` workflow and a REAL `ProposalsService` instance (same
approach `proposals/integration_tests/proposal_gate_fixture.ts` already
proves at the gate-workflow level). Approve writes the forensics-handoff
knowledge indicator via `context-engine.createKi` and leaves the Investigation
and attack open (the handoff report is still to come). Dismiss closes both the
Investigation and the attack with no reason attributed to the analyst's
decline (per the review's own comment: a decline says the escalation isn't
worth taking, not what the attack IS).

**Expiry (the gate's 72h decision window)**: covered as a REAL E2E branch, not
punted to unit tests. The harness DOES support an advanceable clock — the
exact `jest.useFakeTimers({ now: ... })` pattern `proposal_gate_fixture.
timeOutGate()` already proves for the shared gate workflow in isolation. This
suite reuses that same pattern one level up, through the review: `runReview()`
parks the escalation gate, `timeOutEscalationGate()` advances past the 72h
deadline with no `resumeInput`, and asserts the review completes with the
proposal settled `expired`/no decision and both the Investigation and the
attack left open. Nothing here is wall-clock-dependent in real time — the
suite runs in ~4s for this branch — so there was no reason to defer it to the
unit layer.
