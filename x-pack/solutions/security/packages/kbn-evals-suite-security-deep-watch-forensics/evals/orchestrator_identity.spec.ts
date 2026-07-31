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
 * D1, D2, D4 and D5 remain honest skip-stubs. They are NOT missing code — each
 * is blocked on a platform primitive or an architecture decision that has not
 * been made yet (run-as/UIAM #17942, HIL/Approval Gate #17944, and the still-
 * open `orchestration.workers` vs. graph-as-allowlist question). Substituting
 * an assertion against some adjacent endpoint would produce a green checkmark
 * that does not test the invariant the gate names, which is worse than an
 * acknowledged gap.
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

    evaluate.skip(
      'D4 — HIL-pause fail-closed: rejected/expired pause does not proceed',
      async () => {
        // BLOCKED: no HIL/Approval Gate primitive exists in the workflow engine
        // (#17944). Verified directly: `kbn-workflows`' step-type registry has
        // no waitForApproval/waitForInput step, so there is no mid-execution
        // pause to reject or expire.
        // NOTE: PND's proposal decision routes (accept/reject/defer) are NOT a
        // substitute — they are direct REST mutations on an already-completed
        // run, not a workflow pause. Asserting against them would test a
        // different thing entirely while appearing to cover this gate.
        // When it lands: reject/expire a pause → run halts in a terminal safe
        // state with prior evidence preserved; never resumes on timeout.
      }
    );

    evaluate.skip(
      'D5 — Allowlist boundary: Orchestrator invokes only allowlisted Workers',
      async () => {
        // BLOCKED: the allowlist mechanism itself is an OPEN DECISION, not
        // merely unimplemented. daybreak-watches-object-model.md's "Still open"
        // section lists verbatim: "Explicit `orchestration.workers` field vs
        // graph-as-allowlist today". Until that resolves there is no schema to
        // enforce, and inventing one here would bake an unratified product
        // decision into a gate test.
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
