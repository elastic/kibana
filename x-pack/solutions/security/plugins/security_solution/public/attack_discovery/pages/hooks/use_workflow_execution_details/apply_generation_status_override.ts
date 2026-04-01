/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionStatus } from '@kbn/workflows';

import type {
  AggregatedWorkflowExecution,
  StepExecutionWithLink,
} from '../../loading_callout/types';

const isGenerationStep = (step: StepExecutionWithLink): boolean =>
  step.stepId === 'generate_discoveries' || step.pipelinePhase === 'generate_discoveries';

/**
 * Overrides the generation step status when the event log reports a failure
 * that the Workflows API does not reflect.
 *
 * The Workflows engine may mark a generation step as COMPLETED because the
 * step itself ran to completion, but the server-side post-processing
 * (e.g. `extractGenerationWorkflowResult`) can detect that the output is empty or
 * invalid and record a `generate-step-failed` event. In that case the
 * `generationStatus` from the generations API will be `'failed'`, while the
 * Workflows API still reports `COMPLETED`. This function reconciles the two
 * by overriding the step status to `FAILED`.
 */
export const applyGenerationStatusOverride = ({
  aggregatedExecution,
  generationStatus,
}: {
  aggregatedExecution: AggregatedWorkflowExecution;
  generationStatus?: 'started' | 'succeeded' | 'failed' | 'canceled' | 'dismissed';
}): AggregatedWorkflowExecution => {
  if (generationStatus !== 'failed') {
    return aggregatedExecution;
  }

  const OVERRIDABLE_STATUSES = new Set([ExecutionStatus.COMPLETED, ExecutionStatus.PENDING]);

  const needsOverride = aggregatedExecution.steps.some(
    (step) => isGenerationStep(step) && OVERRIDABLE_STATUSES.has(step.status)
  );

  if (!needsOverride) {
    return aggregatedExecution;
  }

  return {
    ...aggregatedExecution,
    status: ExecutionStatus.FAILED,
    steps: aggregatedExecution.steps.map((step) => {
      if (isGenerationStep(step) && OVERRIDABLE_STATUSES.has(step.status)) {
        return {
          ...step,
          status: ExecutionStatus.FAILED,
        };
      }

      return step;
    }),
  };
};
