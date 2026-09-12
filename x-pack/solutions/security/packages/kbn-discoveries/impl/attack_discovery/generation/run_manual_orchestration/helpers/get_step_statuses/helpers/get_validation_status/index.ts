/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ManualOrchestrationOutcome } from '../../../../steps/validation_step';
import type { StepStatus } from '../../../build_execution_summary_log';
import type { FailedPipelineStep } from '../../../resolve_failed_step';

/** Returns the final status of the validation pipeline step. */
export const getValidationStatus = ({
  failedStep,
  outcome,
}: {
  failedStep: FailedPipelineStep | undefined;
  outcome: ManualOrchestrationOutcome | undefined;
}): StepStatus => {
  if (outcome?.outcome === 'validation_succeeded') return 'succeeded';
  if (failedStep === 'validation') return 'failed';
  return 'not_started';
};
