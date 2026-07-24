/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertRetrievalResult } from '../../../invoke_alert_retrieval_workflow';
import type { GenerationWorkflowResult } from '../../../invoke_generation_workflow';
import type { ManualOrchestrationOutcome } from '../../steps/validation_step';
import type { StepStatus } from '../build_execution_summary_log';
import type { FailedPipelineStep } from '../resolve_failed_step';
import { getGenerationStatus } from './helpers/get_generation_status';
import { getRetrievalStatus } from './helpers/get_retrieval_status';
import { getValidationStatus } from './helpers/get_validation_status';

/**
 * Computes the final status of each pipeline step for inclusion in the
 * execution summary log. A step is "succeeded" if its result is present,
 * "failed" if it is the step that threw, and "not_started" otherwise.
 */
export const getStepStatuses = ({
  alertRetrievalResult,
  failedStep,
  generationResult,
  outcome,
}: {
  alertRetrievalResult: AlertRetrievalResult | undefined;
  failedStep: FailedPipelineStep | undefined;
  generationResult: GenerationWorkflowResult | undefined;
  outcome: ManualOrchestrationOutcome | undefined;
}): {
  generationStatus: StepStatus;
  retrievalStatus: StepStatus;
  validationStatus: StepStatus;
} => {
  const retrievalStatus: StepStatus = getRetrievalStatus({ alertRetrievalResult, failedStep });
  const generationStatus: StepStatus = getGenerationStatus({ failedStep, generationResult });
  const validationStatus: StepStatus = getValidationStatus({ failedStep, outcome });

  return { generationStatus, retrievalStatus, validationStatus };
};
