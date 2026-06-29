/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GenerationWorkflowResult } from '../../../../../invoke_generation_workflow';
import type { StepStatus } from '../../../build_execution_summary_log';
import type { FailedPipelineStep } from '../../../resolve_failed_step';

/** Returns the final status of the generation pipeline step. */
export const getGenerationStatus = ({
  failedStep,
  generationResult,
}: {
  failedStep: FailedPipelineStep | undefined;
  generationResult: GenerationWorkflowResult | undefined;
}): StepStatus => {
  if (generationResult != null) return 'succeeded';
  if (failedStep === 'generation') return 'failed';
  return 'not_started';
};
