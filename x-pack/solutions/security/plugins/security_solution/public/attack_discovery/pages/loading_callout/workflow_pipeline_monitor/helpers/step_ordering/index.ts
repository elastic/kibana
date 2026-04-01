/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StepExecutionWithLink } from '../../../types';

/**
 * Checks whether a step should be grouped under the "Alert retrieval" phase.
 * This includes steps with `pipelinePhase === 'retrieve_alerts'` or `stepId === 'retrieve_alerts'`.
 */
export const isAlertRetrievalStep = (step: StepExecutionWithLink): boolean =>
  step.pipelinePhase === 'retrieve_alerts' || step.stepId === 'retrieve_alerts';

/**
 * Checks whether a step is an internal persistence step that should be
 * hidden from the UI. Persistence is an implementation detail of the
 * validation workflow and should not appear as a separate pipeline phase.
 */
export const isPersistenceStep = (step: StepExecutionWithLink): boolean =>
  step.pipelinePhase === 'persist_discoveries' || step.stepId === 'persist_discoveries';

/**
 * Canonical ordering for non-alert-retrieval pipeline steps.
 *
 * When multiple alert retrieval workflows exist (N > 2), dynamic
 * `topologicalIndex` values from the data layer could theoretically
 * produce unexpected orderings. This mapping enforces the invariant
 * that Generation always renders before Validation, regardless of
 * the underlying index values.
 */
export const CANONICAL_STEP_ORDER: Readonly<Record<string, number>> = {
  generate_discoveries: 0,
  promote_discoveries: 1, // backward compat
  validate_discoveries: 1,
};

export const getCanonicalOrder = (step: StepExecutionWithLink): number => {
  const byStepId = CANONICAL_STEP_ORDER[step.stepId];

  if (byStepId != null) {
    return byStepId;
  }

  const byPhase = step.pipelinePhase != null ? CANONICAL_STEP_ORDER[step.pipelinePhase] : undefined;

  if (byPhase != null) {
    return byPhase;
  }

  return Object.keys(CANONICAL_STEP_ORDER).length;
};

/**
 * Groups steps by their workflowId, preserving insertion order.
 * Steps without a workflowId are each treated as their own group.
 */
export const groupStepsByWorkflow = (steps: StepExecutionWithLink[]): StepExecutionWithLink[][] => {
  const groups: StepExecutionWithLink[][] = [];
  const workflowIdToGroupIndex = new Map<string, number>();

  for (const step of steps) {
    const key = step.workflowId;

    const existingGroupIndex = key != null ? workflowIdToGroupIndex.get(key) : undefined;

    if (existingGroupIndex != null) {
      groups[existingGroupIndex].push(step);
    } else {
      const idx = groups.length;
      groups.push([step]);

      if (key != null) {
        workflowIdToGroupIndex.set(key, idx);
      }
    }
  }

  return groups;
};
