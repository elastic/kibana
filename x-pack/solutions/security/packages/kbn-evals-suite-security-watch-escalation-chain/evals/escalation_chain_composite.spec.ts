/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * L3 Composite Pipeline — Watch escalation chain (Dark -> Deep -> Detection).
 *
 * Live, model-agnostic proof that the fix for bugs #9/#10 holds:
 *   - Bug #9: Dark/Deep Watch's `run_dark_worker`/`run_deep_worker` steps
 *     read `event.escalation` (always undefined for a workflow.execute
 *     child) instead of `inputs.escalation`, and a bare `{{ }}` template
 *     stringified the escalation object into "[object Object]".
 *   - Bug #10: Detection Watch's two reactive routes gated on
 *     `event.detectionChangeSignal` / `event.ruleTuningTrigger` for the
 *     same reason, so its rule-creation/rule-tuning workers never ran.
 *
 * This spec invokes Dark Watch directly with a synthetic `escalation`
 * payload (the same shape Floor's `escalate_to_dark` step produces),
 * and asserts:
 *   1. The chain reaches a terminal (non-error) status.
 *   2. Every persisted proposal across the chain shares the SAME
 *      investigationId (the single regression this whole fix targets --
 *      before the fix, Dark/Deep's worker output carried the literal
 *      string "[object Object]" wherever investigationId should be).
 *   3. At least one Detection Watch proposal is produced downstream
 *      (bug #10 made Detection's routes permanently dead code).
 *
 * Per PR #35 pyramid: this is an L3 (multi-turn / multi-worker composite)
 * spec proven against a live LLM, scored per model via the connector
 * fixture (see src/evaluate.ts). The suite is model-agnostic: swap the
 * Playwright project's connector, get the same golden scenario scored
 * against a different model, one row.
 *
 * Deliberately out of scope (per watch-eval-authoring-guide.md §2):
 *   - Family D orchestrator/execution-identity gates (D1-D8): this suite
 *     persists to a plain ES index via a custom route, not the platform
 *     Investigation/Proposal object model those invariants govern. See
 *     the deep-watch-forensics suite's orchestrator_identity.spec.ts stubs
 *     for the same documented gap.
 *   - Floor's alert-triage path: exercised by the (future) Floor suite;
 *     this suite starts one hop downstream, at Dark, to isolate the
 *     escalation-threading fix from Floor's alert-enrichment behavior.
 */

import { tags, evaluate } from '@kbn/evals';
import { ExecutionStatus } from '@kbn/workflows';
import { WATCH_WORKFLOW_IDS, buildSyntheticEscalation, PND_INDICES } from '../src/constants';
import { runWatchWorkflow, readProposalsForInvestigation } from '../src/workflow_task';

evaluate.describe(
  'C-watch-chain:L3 | Watch escalation chain — Dark -> Deep -> Detection',
  { tag: tags.stateful.classic },
  () => {
    // The Dark/Deep/Detection `ai.agent` steps resolve their LLM from the
    // space-wide `genAi:defaultAIConnector` uiSetting (no per-request
    // override exists in the managed workflow YAML). Setting it here, from
    // the Playwright project's `connector` fixture, is what makes this
    // suite model-agnostic: swap the project's connector, the same live
    // chain gets scored against a different model. See
    // WATCH_EVAL_EXAMPLE.md (kbn-evals-suite-security-threat-intel-hunt)
    // for the pattern this mirrors, and threat_intel_hunt.spec.ts for a
    // second reference application of it.
    evaluate.beforeAll(async ({ kbnClient, connector, log }) => {
      log.info(
        `[L3] Setting genAi:defaultAIConnector to '${connector.id}' for the Watch escalation chain`
      );
      await kbnClient.uiSettings.update({
        'genAi:defaultAIConnector': connector.id,
      });
    });

    evaluate(
      'investigationId threads unchanged through Dark -> Deep -> Detection, and Detection fires',
      async ({ fetch, esClient, log, connector }) => {
        // Deterministic, per-run investigationId so repeated CI runs (and
        // repeated models in the same matrix) don't collide on one shared
        // investigation and dedup each other's proposals away.
        const investigationId = `inv-eval-escalation-chain-${connector.id}-${Date.now()}`;
        const escalation = buildSyntheticEscalation(investigationId);

        log.info(
          `[L3] Invoking Dark Watch with synthetic escalation, investigationId=${investigationId}, connector=${connector.id}`
        );

        const darkExecution = await runWatchWorkflow({
          fetch,
          log,
          workflowId: WATCH_WORKFLOW_IDS.dark,
          inputs: { escalation },
        });

        log.info(
          `[L3] Dark Watch execution ${darkExecution.executionId} → ${darkExecution.status}`
        );

        // Give downstream fan-out (Deep, Detection x2, each their own
        // workflow.execute child) a little settle time after Dark's own
        // top-level execution reports terminal — those children run inside
        // Dark's own execution but their proposal-emit steps are
        // `on-failure: continue`, so a slow nested worker can still be
        // writing after the parent step tree reports done.
        await new Promise((resolve) => setTimeout(resolve, 5_000));

        const proposals = await readProposalsForInvestigation({
          esClient,
          investigationId,
          index: PND_INDICES.proposals,
        });

        const investigationIds = new Set(proposals.map((p) => p.investigationId));
        const sourceWatches = proposals.map((p) => p.sourceWatchId ?? p.sourceWatch);
        const detectionProposals = proposals.filter((p) =>
          String(p.sourceWatchId ?? p.sourceWatch ?? '').includes('detection')
        );

        // The single most important assertion this whole fix targeted: every
        // proposal that came out of this run carries the SAME investigationId
        // we passed in -- not "[object Object]", not undefined, not a forked
        // ad-hoc id minted by a downstream tier that never received it.
        const allShareInvestigationId =
          proposals.length > 0 &&
          investigationIds.size === 1 &&
          investigationIds.has(investigationId);

        // Bug #10 regression check: Dark Watch's synthetic escalation is
        // built to surface a real MITRE coverage gap (see constants.ts),
        // so a healthy chain should produce at least one Detection Watch
        // proposal downstream. Zero here is the exact bug #10 symptom.
        const detectionWatchFired = detectionProposals.length > 0;

        log.info(
          `[L3] proposals=${proposals.length}, uniqueInvestigationIds=${
            investigationIds.size
          }, sourceWatches=${JSON.stringify(sourceWatches)}, detectionProposals=${
            detectionProposals.length
          }`
        );

        const darkExecutionOk = darkExecution.status !== ExecutionStatus.FAILED;

        return {
          success: darkExecutionOk && allShareInvestigationId && detectionWatchFired,
          explanation:
            `Dark execution status: ${darkExecution.status}. ` +
            `Proposals persisted: ${proposals.length}. ` +
            `All share investigationId '${investigationId}': ${allShareInvestigationId}. ` +
            `Source watches: ${JSON.stringify(sourceWatches)}. ` +
            `Detection Watch proposals: ${detectionProposals.length}.`,
          scorecard: {
            darkExecutionNonError: darkExecutionOk ? 1 : 0,
            proposalsPersisted: proposals.length > 0 ? 1 : 0,
            investigationIdConsistent: allShareInvestigationId ? 1 : 0,
            detectionWatchFired: detectionWatchFired ? 1 : 0,
            proposalCount: proposals.length,
          },
        };
      }
    );
  }
);
