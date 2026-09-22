/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import type {
  AttackDiscoveryAgentBuilderExample,
  AttackDiscoveryAgentBuilderTaskOutput,
} from '../types';

export const WORKFLOW_EVIDENCE_EVALUATOR_NAME = 'WorkflowEvidence';

export const createWorkflowEvidenceEvaluator = (): Evaluator<
  AttackDiscoveryAgentBuilderExample,
  AttackDiscoveryAgentBuilderTaskOutput
> => ({
  name: WORKFLOW_EVIDENCE_EVALUATOR_NAME,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, expected }) => {
    const expectedStages = expected?.expectedWorkflowStages ?? [];
    const stages = output.workflow.stages;
    const expectedRetrievedAlertCount = expected?.expectedRetrievedAlertCount;
    const expectedPassedAlertCount = expected?.expectedPassedAlertCount;

    // Count-expectation contract, deliberately asymmetric for back-compat:
    //   retrieved: number asserts equality; `null` or ABSENT means don't-care
    //              (golden data: clean provided-alerts runs report retrieved=4
    //              against a `null` expectation and legitimately score 1 —
    //              making retrieved-`null` strict would flip every clean cell).
    //   passed:    number asserts equality; `null` asserts the run reports
    //              `null` (Fix 3); ABSENT (undefined) means do not score the
    //              passed count at all. Dense live-retrieval uses ABSENT — a
    //              `null` there is a guaranteed 0 on any run that passes
    //              alerts, which is an unwinnable evaluator, not an opt-out.
    // `== null` covers both `null` and `undefined`, so availability is
    // unchanged by the absent state: an expectation that cannot be checked
    // (number expected, nothing reported) marks the evidence incomplete.
    const retrievedCountAvailable =
      expectedRetrievedAlertCount == null || output.workflow.retrievedAlertCount !== null;
    const passedCountAvailable =
      expectedPassedAlertCount == null || output.workflow.passedAlertCount !== null;
    const hasCompleteWorkflowEvidence = retrievedCountAvailable && passedCountAvailable;

    const stagesMatch = expectedStages.every((stage) => stages.includes(stage));
    const retrievedCountMatches =
      expectedRetrievedAlertCount == null ||
      output.workflow.retrievedAlertCount === expectedRetrievedAlertCount;
    const passedCountMatches =
      expectedPassedAlertCount === undefined ||
      output.workflow.passedAlertCount === expectedPassedAlertCount;
    const matchesExpectedWorkflow = stagesMatch && retrievedCountMatches && passedCountMatches;

    return {
      // `null` (not `undefined`) so the aggregate drops it, and a label so the
      // report can tell incomplete evidence from an evaluator that never ran.
      ...(hasCompleteWorkflowEvidence
        ? { score: Number(matchesExpectedWorkflow) }
        : { score: null, label: 'N/A' }),
      metadata: {
        evidenceState: hasCompleteWorkflowEvidence ? 'complete' : 'incomplete',
        // Which observable produced the count the comparison above used, so an
        // `N/A` (or a surprise 0) is self-explaining from the score document
        // alone: `pipeline_*` means the product's Alert Retrieval phase
        // reported it, `agent_esql_retrieval` means it came from the agent's
        // OWN retrieval — the only source a `provided`-mode run (retrieval
        // skipped by design) can have — and the last two are the two ways a
        // scoped example observes none of its population, both scored 0:
        // `unscoped_retrieval` (a retrieval happened, out of scope) and `none`
        // (no alerts retrieval at all).
        retrievedAlertCountSource: output.workflow.retrievedAlertCountSource ?? 'none',
        alertRetrievalMode: output.workflow.retrievalEvidence?.alertRetrievalMode ?? null,
        agentEsqlRowCounts: output.workflow.retrievalEvidence?.agentEsqlRowCounts ?? [],
        // The scope the example's retrieval had to carry, and the retrievals it
        // excluded for not carrying it — on both sides, the agent's own ES|QL
        // results and the pipeline counts derived from the query it handed the
        // AD tool. All three are here so a 0 reads as "the run retrieved N rows
        // unscoped" (none of it attributable to this fixture) instead of "no
        // retrieval happened": both score 0 on a scoped example, and these
        // fields are what tell them apart after the fact.
        retrievalScope: output.workflow.retrievalEvidence?.retrievalScope ?? null,
        unscopedAgentAlertRetrievalRowCounts:
          output.workflow.retrievalEvidence?.unscopedAgentAlertRetrievalRowCounts ?? [],
        unscopedPipelineAlertRetrievalCounts:
          output.workflow.retrievalEvidence?.unscopedPipelineAlertRetrievalCounts ?? [],
        stages,
        expectedRetrievedAlertCount,
        expectedPassedAlertCount,
        retrievedAlertCount: output.workflow.retrievedAlertCount,
        passedAlertCount: output.workflow.passedAlertCount,
        validatedDiscoveryCount: output.workflow.validatedDiscoveryCount,
      },
    };
  },
});
