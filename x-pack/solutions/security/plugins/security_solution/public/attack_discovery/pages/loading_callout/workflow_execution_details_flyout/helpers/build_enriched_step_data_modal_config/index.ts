/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StepExecutionWithLink, WorkflowInspectMetadata } from '../../../types';
import type { StepDataModalConfig } from '../get_step_data_modal_config';

/**
 * Enriches a `StepDataModalConfig` with workflow names sourced from the step
 * execution data, and merges metadata (workflowId, workflowName, workflowRunId)
 * supplied at inspect time.
 */
export const buildEnrichedStepDataModalConfig = ({
  config,
  metadata,
  steps,
}: {
  config: StepDataModalConfig;
  metadata?: WorkflowInspectMetadata;
  steps: StepExecutionWithLink[] | undefined;
}): StepDataModalConfig => {
  const enrichedSummaries = config.workflowSummaries?.map((summary) => {
    const matchingStep = steps?.find(
      (s) => s.workflowRunId != null && s.workflowRunId === summary.workflowRunId
    );

    return matchingStep != null
      ? {
          ...summary,
          workflowId: summary.workflowId ?? matchingStep.workflowId,
          workflowName: summary.workflowName ?? matchingStep.workflowName,
        }
      : summary;
  });

  return {
    ...config,
    workflowId: metadata?.workflowId,
    workflowName: metadata?.workflowName,
    workflowRunId: metadata?.workflowRunId,
    workflowSummaries: enrichedSummaries,
  };
};
