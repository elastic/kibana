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
  evaluate: async ({ output, expected }) => {
    const expectedStages = expected?.expectedWorkflowStages ?? [];
    const stages = output.workflow.stages;
    const expectedRetrievedAlertCount = expected?.expectedRetrievedAlertCount;
    const expectedPassedAlertCount = expected?.expectedPassedAlertCount;

    const retrievedCountAvailable =
      expectedRetrievedAlertCount == null || output.workflow.retrievedAlertCount !== null;
    // A `null` expectation asserts the value IS `null` (e.g. the pipeline
    // never reported a passed count for this example) rather than excusing
    // the evaluator from scoring it. `passedCountMatches` below already does
    // strict equality, so `null === null` matches once this stops gating on
    // `expectedPassedAlertCount != null`.
    const passedCountAvailable =
      expectedPassedAlertCount == null || output.workflow.passedAlertCount !== null;
    const hasCompleteWorkflowEvidence = retrievedCountAvailable && passedCountAvailable;

    const stagesMatch = expectedStages.every((stage) => stages.includes(stage));
    const retrievedCountMatches =
      expectedRetrievedAlertCount == null ||
      output.workflow.retrievedAlertCount === expectedRetrievedAlertCount;
    const passedCountMatches = output.workflow.passedAlertCount === expectedPassedAlertCount;
    const matchesExpectedWorkflow = stagesMatch && retrievedCountMatches && passedCountMatches;

    return {
      score: hasCompleteWorkflowEvidence ? Number(matchesExpectedWorkflow) : undefined,
      metadata: {
        evidenceState: hasCompleteWorkflowEvidence ? 'complete' : 'incomplete',
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
