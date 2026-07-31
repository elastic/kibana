/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Family D — Orchestrator & Execution-Identity Gates
 *
 * Per PR #35 gate-test-plan §5: Family D gates are deterministic safety checks
 * for the Watch Orchestrator's execution identity, allowlist boundary, and
 * investigation containment. These are object-model invariants (PR #46), not
 * quality evals.
 *
 * D3, D6 and D7 exercise real code paths shipped in the PND plugin
 * (`InvestigationStore.createInvestigationIfMissing`, the `investigationId`
 * derivation in `emit_proposal.ts`, and `IncidentForkStore.forkToIncident`
 * behind `_promote_to_incident`) and are asserted for real against a live
 * Kibana + ES.
 *
 * D1, D2 and D5 remain honest skip-stubs. They are NOT missing code — each is
 * blocked on a platform primitive or an architecture decision that has not been
 * made yet (run-as/UIAM #17942 for D1/D2; the still-open `orchestration.workers`
 * vs. graph-as-allowlist decision for D5). Substituting an assertion against
 * some adjacent endpoint would produce a green checkmark that does not test the
 * invariant the gate names, which is worse than an acknowledged gap.
 *
 * NOTE on D4: an earlier skip comment claimed "no waitForApproval/waitForInput
 * step exists in kbn-workflows". That was WRONG (based on a grep that timed
 * out): the step type ships in `kbn-workflows` (spec/schema.ts) with a full
 * reject/timeout/resume state machine. D4 is implemented for real below.
 */

import { v4 as uuidv4 } from 'uuid';
import type { KbnClient } from '@kbn/kbn-client';
import { tags, evaluate } from '@kbn/evals';
import {
  PND_EMIT_PROPOSAL_PATH,
  PND_API_VERSION,
  PND_INVESTIGATIONS_INDEX,
  PND_CANONICAL_PROPOSALS_INDEX,
  PND_INCIDENTS_INDEX,
  WORKFLOWS_API_VERSION,
  pndPromoteToIncidentPath,
} from '../src/constants';

interface EmitProposalResponse {
  proposalId: string;
  evidenceId: string;
  workerEvalId: string;
  status: string;
  written: string[];
}

interface PromoteToIncidentResponse {
  outcome: 'forked' | 'already_forked';
  incidentId: string;
  forkedFromInvestigationId: string;
  carriedEventCount: number;
  message: string;
}

const emitProposal = async (
  kbnClient: KbnClient,
  body: Record<string, unknown>
): Promise<EmitProposalResponse> =>
  (
    await kbnClient.request<EmitProposalResponse>({
      path: PND_EMIT_PROPOSAL_PATH,
      method: 'POST',
      headers: { 'elastic-api-version': PND_API_VERSION },
      body,
    })
  ).data;

const workerRun = (overrides: Record<string, unknown> = {}) => ({
  classification: 'true_positive',
  confidence: 0.9,
  rationale: 'Family D orchestrator-identity gate test run',
  ...overrides,
});

evaluate.describe(
  'Deep Watch Forensics — Family D Gate Stubs',
  { tag: tags.stateful.classic },
  () => {
    evaluate.skip('D1 — Subject separation: execution identity ≠ approval identity', async () => {
      // BLOCKED: platform run-as / UIAM readiness (#17942)
      // Assert execution.subject (Orchestrator Service Account) ≠ hil.subject
      // (human approver) on every run.
      // TEMPORARY SUBSTITUTE: spike-local identity stub once run-as lands.
    });

    evaluate.skip('D2 — Authz scoping: Worker cannot read/act beyond run-as role', async () => {
      // BLOCKED: platform run-as / UIAM readiness (#17942)
      // Grant Service Account narrow role → attempt out-of-scope index read →
      // request denied, run surfaces visible blocked/degraded.
    });

    evaluate(
      'D3 — Investigation containment: exactly one Investigation per Watch run',
      async ({ kbnClient, esClient, log }) => {
        // A multi-Worker run against the SAME alert (Floor -> Dark -> Deep, the real
        // escalation chain) must land on exactly one Investigation document, with each
        // worker's proposal threaded onto it via investigationId — not one Investigation
        // per worker call.
        const alertId = `d3-containment-${uuidv4()}`;
        const investigationId = `inv-watch-floor-${alertId}`;

        const calls = [
          { sourceWatch: 'watch-floor', workerRun: workerRun({ alertId, investigationId }) },
          { sourceWatch: 'watch-dark', workerRun: workerRun({ alertId, investigationId }) },
          { sourceWatch: 'watch-deep', workerRun: workerRun({ alertId, investigationId }) },
        ];

        const responses: EmitProposalResponse[] = [];
        for (const call of calls) {
          responses.push(await emitProposal(kbnClient, call));
        }

        const allWritesSucceeded = responses.every((r) => r.written.includes('proposal'));
        log.info(`[D3] all 3 worker calls wrote a proposal: ${allWritesSucceeded}`);

        // Exactly one Investigation document for this alert — not one per worker call.
        let investigationCount = 0;
        try {
          const searchRes = await esClient.count({
            index: PND_INVESTIGATIONS_INDEX,
            query: { term: { id: investigationId } },
          });
          investigationCount = searchRes.count;
        } catch (e) {
          log.warning(`[D3] investigation count search failed: ${(e as Error).message}`);
        }

        // All 3 proposals threaded onto the same investigationId (Workers "threaded in",
        // not spawning their own top-level case per the gate's assertion).
        let threadedProposalCount = 0;
        try {
          const searchRes = await esClient.count({
            index: PND_CANONICAL_PROPOSALS_INDEX,
            query: { term: { investigationId } },
          });
          threadedProposalCount = searchRes.count;
        } catch (e) {
          log.warning(`[D3] proposal count search failed: ${(e as Error).message}`);
        }

        log.info(
          `[D3] investigationCount=${investigationCount} threadedProposalCount=${threadedProposalCount}`
        );

        const success =
          allWritesSucceeded && investigationCount === 1 && threadedProposalCount === 3;

        return {
          success,
          explanation:
            `3 worker calls (Floor, Dark, Deep) against the same alert produced ` +
            `${investigationCount} Investigation doc(s) (want exactly 1) and ` +
            `${threadedProposalCount} threaded proposal(s) (want 3).`,
          scorecard: {
            allWritesSucceeded: allWritesSucceeded ? 1 : 0,
            exactlyOneInvestigation: investigationCount === 1 ? 1 : 0,
            allProposalsThreaded: threadedProposalCount === 3 ? 1 : 0,
          },
        };
      }
    );

    evaluate(
      'D4 — HIL-pause fail-closed: rejected/expired pause does not proceed',
      async ({ kbnClient, esClient, log }) => {
        // Drives a REAL workflow run into a waitForApproval HIL pause, REJECTS it,
        // and asserts the consequential step (the Elasticsearch-indexing "write"
        // after the gate) never executes. This exercises the engine's actual
        // fail-closed path, not a substitute: the HIL primitive ships in
        // `kbn-workflows` (spec/schema.ts waitForApproval), driven via
        // POST /api/workflows/executions/{id}/resume with { approved: false }.
        const tag = `d4-${uuidv4().slice(0, 8)}`;
        const workflowName = `d4-hil-gate-${tag}`;
        const markerIndex = `d4-consequential-${tag}`;

        // A two-step workflow: the HIL gate, then a "consequential" write step
        // that indexes a marker document. If the gate is fail-closed, a rejected
        // approval means the marker is never written.
        const yaml = [
          `version: '1'`,
          `name: ${workflowName}`,
          `description: D4 gate — reject a HIL pause, assert downstream write never runs`,
          `enabled: true`,
          `triggers:`,
          `  - type: manual`,
          `steps:`,
          `  - name: approval_gate`,
          `    type: waitForApproval`,
          `    with:`,
          `      message: 'D4 gate: approve to proceed to the consequential write'`,
          `  - name: consequential_write`,
          `    type: elasticsearch.index`,
          `    with:`,
          `      index: ${markerIndex}`,
          `      document:`,
          `        gate: d4`,
          `        tag: ${tag}`,
          `        ran: true`,
        ].join('\n');

        const cleanup = async (workflowId?: string) => {
          // Remove the throwaway workflow + marker index regardless of outcome.
          if (workflowId) {
            await kbnClient
              .request({
                path: `/api/workflows/workflow/${encodeURIComponent(workflowId)}`,
                method: 'DELETE',
                headers: { 'elastic-api-version': WORKFLOWS_API_VERSION },
              })
              .catch(() => undefined);
          }
          await esClient.indices
            .delete({ index: markerIndex }, { ignore: [404] })
            .catch(() => undefined);
        };

        let workflowId: string | undefined;
        try {
          // 1. Register the throwaway workflow.
          const created = (
            await kbnClient.request<{ id?: string; workflowId?: string }>({
              path: '/api/workflows/workflow',
              method: 'POST',
              headers: { 'elastic-api-version': WORKFLOWS_API_VERSION },
              body: { yaml },
            })
          ).data;
          workflowId = created.id ?? created.workflowId;
          if (!workflowId) {
            return {
              success: false,
              explanation: 'workflow create returned no id',
              scorecard: { setup: 0 },
            };
          }

          // 2. Trigger a run; it should park at the waitForApproval gate.
          const run = (
            await kbnClient.request<{ workflowExecutionId: string }>({
              path: `/api/workflows/workflow/${encodeURIComponent(workflowId)}/run`,
              method: 'POST',
              headers: { 'elastic-api-version': WORKFLOWS_API_VERSION },
              body: { inputs: {} },
            })
          ).data;
          const executionId = run.workflowExecutionId;

          // 3. Wait for the run to reach the paused (waiting_for_input) state.
          const pollExecution = async () =>
            (
              await kbnClient.request<{
                status?: string;
                stepExecutions?: Array<{ status?: string; stepType?: string }>;
              }>({
                path: `/api/workflows/executions/${encodeURIComponent(executionId)}`,
                method: 'GET',
                headers: { 'elastic-api-version': WORKFLOWS_API_VERSION },
              })
            ).data;

          let status: string | undefined;
          const deadline = Date.now() + 60_000;
          while (Date.now() < deadline) {
            const ex = await pollExecution();
            status = ex.status;
            if (status === 'waiting_for_input' || status === 'waiting') break;
            if (status === 'failed' || status === 'completed' || status === 'cancelled') break;
            await new Promise((r) => setTimeout(r, 1500));
          }
          log.info(`[D4] run ${executionId} pre-reject status=${status}`);
          const reachedPause = status === 'waiting_for_input' || status === 'waiting';

          // 4. REJECT the approval.
          await kbnClient.request({
            path: `/api/workflows/executions/${encodeURIComponent(executionId)}/resume`,
            method: 'POST',
            headers: { 'elastic-api-version': WORKFLOWS_API_VERSION },
            body: { input: { approved: false } },
          });

          // 5. Let the engine settle, then assert the consequential write NEVER ran.
          await new Promise((r) => setTimeout(r, 8000));
          const postReject = await pollExecution();
          const finalStatus = postReject.status;

          let markerDocs = 0;
          try {
            markerDocs = (
              await esClient.count({
                index: markerIndex,
                query: { term: { tag } },
              })
            ).count;
          } catch {
            markerDocs = 0; // index never created == step never ran
          }

          log.info(`[D4] post-reject status=${finalStatus} markerDocs=${markerDocs}`);

          // Fail-closed = the consequential step did not run. The DOCUMENT count is
          // the invariant: elasticsearch.index auto-creates its target index on
          // first write, so index *existence* is not a reliable signal of whether
          // the write ran (an auto-configured empty index could exist either way).
          // Zero marker documents is the honest assertion that the consequential
          // write never executed. The run's terminal status may be completed /
          // failed / cancelled depending on engine semantics for a rejected wait —
          // the gate invariant is about the SIDE EFFECT, not the status label.
          const consequentialStepDidNotRun = markerDocs === 0;
          const halted = finalStatus !== 'running' && finalStatus !== 'waiting_for_input';

          const success = reachedPause && consequentialStepDidNotRun && halted;
          return {
            success,
            explanation:
              `HIL pause reached=${reachedPause} (status=${status}); after REJECT ` +
              `the consequential elasticsearch.index step wrote ${markerDocs} marker ` +
              `doc(s) (must be 0 for fail-closed). Final run status=${finalStatus} ` +
              `(halted=${halted}).`,
            scorecard: {
              reachedHilPause: reachedPause ? 1 : 0,
              consequentialStepDidNotRun: consequentialStepDidNotRun ? 1 : 0,
              runHaltedAfterReject: halted ? 1 : 0,
            },
          };
        } finally {
          await cleanup(workflowId);
        }
      }
    );

    evaluate.skip(
      'D5 — Allowlist boundary: Orchestrator invokes only allowlisted Workers',
      async () => {
        // BLOCKED: the `orchestration.workers` allowlist mechanism itself is an
        // OPEN DECISION, not merely unimplemented. daybreak-watches-object-model.md's
        // "Still open" section lists verbatim: "Explicit `orchestration.workers`
        // field vs graph-as-allowlist today". Until that resolves there is no
        // schema to enforce, and inventing one here would bake an unratified
        // product decision into a gate test.
        //
        // NOT a substitute: Task 6 registered `security.pnd_watch_orchestrator`
        // with Agent Builder carrying a `configuration.tools` allowlist — but it
        // is `tools: []` (degenerate/empty). Asserting "a non-allowlisted tool is
        // refused" against an empty list is true but vacuous: it does not
        // exercise the boundary this gate names (Workers the Orchestrator may
        // invoke), only that an agent with no tools calls no tools. The real
        // boundary lands with the orchestration.workers decision.
        //
        // When it lands: attempt workflow.execute* a Worker outside the
        // Orchestrator's allowlist → invocation refused.
      }
    );

    evaluate(
      'D6 — Open-vs-append determinism: same-unit signal appends, new-unit opens',
      async ({ kbnClient, esClient, log }) => {
        // Same alertId fired twice (re-triggered run against the same alert, the real
        // `createInvestigationIfMissing` idempotency path) must APPEND (still exactly one
        // Investigation doc), while a distinct alertId must OPEN a new, distinct Investigation.
        const sameUnitAlertId = `d6-same-unit-${uuidv4()}`;
        const newUnitAlertId = `d6-new-unit-${uuidv4()}`;

        // Fire the same-unit signal twice — this is the exact re-triggered-alert path
        // `createInvestigationIfMissing`'s doc comment describes (409-as-success).
        const firstRun = await emitProposal(kbnClient, {
          sourceWatch: 'watch-floor',
          workerRun: workerRun({ alertId: sameUnitAlertId }),
        });
        const secondRun = await emitProposal(kbnClient, {
          sourceWatch: 'watch-floor',
          workerRun: workerRun({ alertId: sameUnitAlertId }),
        });

        // Fire a distinct new-unit signal — must open its own, separate Investigation.
        const newUnitRun = await emitProposal(kbnClient, {
          sourceWatch: 'watch-floor',
          workerRun: workerRun({ alertId: newUnitAlertId }),
        });

        log.info(
          `[D6] same-unit investigationIds: first proposal=${firstRun.proposalId} ` +
            `second proposal=${secondRun.proposalId}`
        );

        const sameUnitInvestigationId = `inv-watch-floor-${sameUnitAlertId}`;
        const newUnitInvestigationId = `inv-watch-floor-${newUnitAlertId}`;

        let sameUnitInvestigationCount = 0;
        let sameUnitProposalCount = 0;
        let newUnitInvestigationCount = 0;
        try {
          sameUnitInvestigationCount = (
            await esClient.count({
              index: PND_INVESTIGATIONS_INDEX,
              query: { term: { id: sameUnitInvestigationId } },
            })
          ).count;
          sameUnitProposalCount = (
            await esClient.count({
              index: PND_CANONICAL_PROPOSALS_INDEX,
              query: { term: { investigationId: sameUnitInvestigationId } },
            })
          ).count;
          newUnitInvestigationCount = (
            await esClient.count({
              index: PND_INVESTIGATIONS_INDEX,
              query: { term: { id: newUnitInvestigationId } },
            })
          ).count;
        } catch (e) {
          log.warning(`[D6] ES count search failed: ${(e as Error).message}`);
        }

        log.info(
          `[D6] sameUnitInvestigationCount=${sameUnitInvestigationCount} ` +
            `sameUnitProposalCount=${sameUnitProposalCount} ` +
            `newUnitInvestigationCount=${newUnitInvestigationCount}`
        );

        // Same-unit: exactly 1 Investigation doc despite 2 emit calls (append, not duplicate-open),
        // but 2 proposals threaded on (each call's proposal still lands — the analyst sees both
        // touches, only the top-level Investigation doc doesn't fork).
        const appendsNotDuplicates =
          sameUnitInvestigationCount === 1 && sameUnitProposalCount === 2;
        // New-unit: opens its own distinct Investigation (not folded into the same-unit one).
        const opensDistinctUnit = newUnitInvestigationCount === 1;

        const success =
          newUnitRun.written.includes('proposal') && appendsNotDuplicates && opensDistinctUnit;

        return {
          success,
          explanation:
            `Same alertId fired twice: ${sameUnitInvestigationCount} Investigation doc(s) ` +
            `(want 1, i.e. append-not-duplicate) with ${sameUnitProposalCount} threaded ` +
            `proposals (want 2). Distinct alertId: ${newUnitInvestigationCount} Investigation ` +
            `doc(s) (want 1, i.e. opens its own unit).`,
          scorecard: {
            appendsNotDuplicates: appendsNotDuplicates ? 1 : 0,
            opensDistinctUnit: opensDistinctUnit ? 1 : 0,
          },
        };
      }
    );

    evaluate(
      'D7 — Incident-fork integrity: escalation forks losslessly',
      async ({ kbnClient, esClient, log }) => {
        // A promotion must FORK to a new `template_id: 'incident'` root — the
        // object model calls this out explicitly as "not a status rename"
        // (daybreak-watches-object-model.md, D13). Three things have to hold:
        //   1. the source Investigation SURVIVES (it is not mutated away), and
        //   2. the new Incident root carries EVERY prior thread forward
        //      (lossless — that's the "integrity" in the gate name), and
        //   3. the promotion itself is recorded as an audit event on both.
        const alertId = `d7-fork-${uuidv4()}`;
        const investigationId = `inv-watch-floor-${alertId}`;

        // Build real prior history on the Investigation: two worker touches,
        // so a lossy fork (one that drops or truncates threads) is detectable.
        await emitProposal(kbnClient, {
          sourceWatch: 'watch-floor',
          workerRun: workerRun({ alertId, investigationId }),
        });
        await emitProposal(kbnClient, {
          sourceWatch: 'watch-deep',
          workerRun: workerRun({ alertId, investigationId }),
        });

        // Snapshot the pre-fork timeline so carry-over can be compared exactly.
        let preForkEventCount = 0;
        try {
          const pre = await esClient.get<{ events?: unknown[] }>({
            index: PND_INVESTIGATIONS_INDEX,
            id: investigationId,
          });
          preForkEventCount = pre._source?.events?.length ?? 0;
        } catch (e) {
          log.warning(`[D7] pre-fork investigation read failed: ${(e as Error).message}`);
        }

        const promote = await kbnClient.request<PromoteToIncidentResponse>({
          path: pndPromoteToIncidentPath(investigationId),
          method: 'POST',
          headers: { 'elastic-api-version': PND_API_VERSION },
          body: { reason: 'D7 gate — escalation fork integrity' },
        });
        const incidentId = promote.data.incidentId;
        log.info(
          `[D7] promote outcome=${promote.data.outcome} incidentId=${incidentId} ` +
            `carriedEventCount=${promote.data.carriedEventCount} (preFork=${preForkEventCount})`
        );

        // 1. Source Investigation still exists — a fork, not a rename/move.
        let investigationSurvives = false;
        try {
          investigationSurvives =
            (
              await esClient.count({
                index: PND_INVESTIGATIONS_INDEX,
                query: { term: { id: investigationId } },
              })
            ).count === 1;
        } catch (e) {
          log.warning(`[D7] post-fork investigation count failed: ${(e as Error).message}`);
        }

        // 2. + 3. Incident root exists, is lineage-linked, and carried the
        // prior threads forward plus the promotion audit event.
        let incidentIsLineageLinked = false;
        let carriedAllPriorThreads = false;
        let promotionAudited = false;
        try {
          const incidentDoc = await esClient.get<{
            template_id?: string;
            forkedFromInvestigationId?: string;
            events?: Array<{ type?: string; summary?: string }>;
          }>({ index: PND_INCIDENTS_INDEX, id: incidentId });

          const src = incidentDoc._source;
          incidentIsLineageLinked =
            src?.template_id === 'incident' && src?.forkedFromInvestigationId === investigationId;

          const incidentEvents = src?.events ?? [];
          // Lossless: every pre-fork event carried over, PLUS the fork event.
          carriedAllPriorThreads =
            preForkEventCount > 0 && incidentEvents.length === preForkEventCount + 1;
          promotionAudited = incidentEvents.some(
            (evt) =>
              evt?.type === 'decision' && (evt?.summary ?? '').includes('promoted to Incident')
          );
        } catch (e) {
          log.warning(`[D7] incident doc read failed: ${(e as Error).message}`);
        }

        log.info(
          `[D7] investigationSurvives=${investigationSurvives} ` +
            `incidentIsLineageLinked=${incidentIsLineageLinked} ` +
            `carriedAllPriorThreads=${carriedAllPriorThreads} promotionAudited=${promotionAudited}`
        );

        const success =
          promote.data.outcome === 'forked' &&
          investigationSurvives &&
          incidentIsLineageLinked &&
          carriedAllPriorThreads &&
          promotionAudited;

        return {
          success,
          explanation:
            `Promoted ${investigationId} -> ${incidentId} (outcome=${promote.data.outcome}). ` +
            `Source Investigation survives: ${investigationSurvives} (fork, not rename). ` +
            `Incident lineage-linked via forkedFromInvestigationId: ${incidentIsLineageLinked}. ` +
            `Carried ${promote.data.carriedEventCount} events vs ${preForkEventCount} pre-fork ` +
            `+1 promotion event (lossless: ${carriedAllPriorThreads}). ` +
            `Promotion recorded as audit event: ${promotionAudited}.`,
          scorecard: {
            forked: promote.data.outcome === 'forked' ? 1 : 0,
            investigationSurvives: investigationSurvives ? 1 : 0,
            incidentIsLineageLinked: incidentIsLineageLinked ? 1 : 0,
            carriedAllPriorThreads: carriedAllPriorThreads ? 1 : 0,
            promotionAudited: promotionAudited ? 1 : 0,
          },
        };
      }
    );
  }
);
