/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionStatus } from '@kbn/workflows/types/v1';

import type { StepExecutionWithLink } from '../../../../loading_callout/types';

/**
 * Defines the pipeline placeholder steps in canonical order.
 *
 * `topologicalIndex` is only meaningful for `retrieve_alerts` (always sorts
 * first with a negative value). For `generate_discoveries` and
 * `validate_discoveries`, the final topological index is computed dynamically
 * by `addAttackDiscoveryPipelinePlaceholders` so that these placeholders
 * always sort AFTER all real steps, regardless of how many alert retrieval
 * workflows exist.
 *
 * The static values for generation/validation are kept only as a fallback
 * when there are no real steps (empty pipeline). They are overridden
 * whenever real steps are present.
 */
export const ATTACK_DISCOVERY_PIPELINE_PLACEHOLDER_STEPS: ReadonlyArray<
  Pick<StepExecutionWithLink, 'stepId' | 'stepType' | 'topologicalIndex'>
> = [
  {
    stepId: 'retrieve_alerts',
    stepType: 'attack-discovery.defaultAlertRetrieval',
    // Use a negative ordering key so this placeholder always sorts before any real steps
    // when the alert retrieval workflow execution isn't available yet.
    topologicalIndex: -1000,
  },
  {
    stepId: 'generate_discoveries',
    stepType: 'attack-discovery.generate',
    topologicalIndex: 1000,
  },
  {
    stepId: 'validate_discoveries',
    stepType: 'attack-discovery.defaultValidation',
    topologicalIndex: 2000,
  },
];

export const shouldAddAttackDiscoveryPipelinePlaceholders = (
  steps: StepExecutionWithLink[]
): boolean => {
  return steps.some(
    (step) =>
      (step.stepType != null && step.stepType.startsWith('attack-discovery.')) ||
      ATTACK_DISCOVERY_PIPELINE_PLACEHOLDER_STEPS.some(
        (s) => s.stepId === step.stepId || s.stepId === step.pipelinePhase
      )
  );
};

const DOWNSTREAM_STEP_IDS = new Set(['generate_discoveries', 'validate_discoveries']);

/**
 * Infers the status for a `retrieve_alerts` placeholder based on downstream
 * step progress. When alerts are "provided" (e.g. action-triggered runs),
 * no alert retrieval workflow executes, so there is no execution to track.
 * If any downstream step (generation or validation) has progressed past
 * PENDING, the retrieval phase must have completed successfully and the
 * placeholder should reflect that.
 */
const inferRetrievalPlaceholderStatus = (
  existingSteps: StepExecutionWithLink[]
): ExecutionStatus => {
  const hasDownstreamProgress = existingSteps.some(
    (step) =>
      (DOWNSTREAM_STEP_IDS.has(step.stepId) ||
        (step.pipelinePhase != null && DOWNSTREAM_STEP_IDS.has(step.pipelinePhase))) &&
      step.status !== ExecutionStatus.PENDING
  );

  return hasDownstreamProgress ? ExecutionStatus.COMPLETED : ExecutionStatus.PENDING;
};

export const addAttackDiscoveryPipelinePlaceholders = (
  steps: StepExecutionWithLink[]
): StepExecutionWithLink[] => {
  if (!shouldAddAttackDiscoveryPipelinePlaceholders(steps)) {
    return steps;
  }

  const existingStepIds = new Set(steps.map((step) => step.stepId));

  // Also track pipeline phases so custom workflows (whose stepIds differ from the
  // placeholder stepIds) still suppress the corresponding placeholder.  For example,
  // a custom alert retrieval workflow produces steps with stepId "query_alerts" but
  // pipelinePhase "retrieve_alerts" – the "retrieve_alerts" placeholder must NOT be
  // added when that phase is already covered.
  const existingPipelinePhases = new Set(
    steps.map((step) => step.pipelinePhase).filter((phase): phase is string => phase != null)
  );

  const neededPlaceholders = ATTACK_DISCOVERY_PIPELINE_PLACEHOLDER_STEPS.filter((placeholder) => {
    const stepMissing =
      !existingStepIds.has(placeholder.stepId) && !existingPipelinePhases.has(placeholder.stepId);
    if (!stepMissing) {
      return false;
    }
    // Validation placeholder: also suppress when old promote_discoveries step exists (backward compat)
    if (placeholder.stepId === 'validate_discoveries') {
      return !existingStepIds.has('promote_discoveries');
    }
    return true;
  });

  if (neededPlaceholders.length === 0) {
    return steps;
  }

  // Compute the maximum topologicalIndex from real steps so that generation
  // and validation placeholders always sort AFTER all existing steps. This is
  // critical when there are N > 1 alert retrieval executions, because each
  // execution's steps are assigned topologicalIndex = executionIndex * 1000.
  // With 3 alert retrievals the 3rd execution's steps start at 2000 – the
  // same value the old hardcoded validate_discoveries placeholder used,
  // causing Validation to incorrectly appear before Generation.
  const maxExistingIndex = steps.reduce((max, step) => Math.max(max, step.topologicalIndex), 0);

  let dynamicOffset = 0;

  const placeholders = neededPlaceholders.map((placeholder, index): StepExecutionWithLink => {
    // retrieve_alerts always uses a fixed negative index to sort first.
    // generation/validation use a dynamic index that is guaranteed to be
    // greater than every real step's topologicalIndex.
    let topologicalIndex: number;

    if (placeholder.stepId === 'retrieve_alerts') {
      topologicalIndex = placeholder.topologicalIndex;
    } else {
      dynamicOffset += 1000;
      topologicalIndex = maxExistingIndex + dynamicOffset;
    }

    const status =
      placeholder.stepId === 'retrieve_alerts'
        ? inferRetrievalPlaceholderStatus(steps)
        : ExecutionStatus.PENDING;

    return {
      error: undefined,
      executionTimeMs: undefined,
      finishedAt: undefined,
      globalExecutionIndex: index,
      id: `pending-${placeholder.stepId}`,
      input: undefined,
      output: undefined,
      scopeStack: [],
      startedAt: '',
      state: undefined,
      status,
      stepExecutionIndex: 0,
      stepId: placeholder.stepId,
      stepType: placeholder.stepType,
      topologicalIndex,
      workflowId: undefined,
      workflowRunId: undefined,
    };
  });

  return [...steps, ...placeholders].sort((a, b) => a.topologicalIndex - b.topologicalIndex);
};
