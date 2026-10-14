/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertRetrievalResult } from '../../../invoke_alert_retrieval_workflow';
import type { GenerationWorkflowResult } from '../../../invoke_generation_workflow';

export type FailedPipelineStep = 'generation' | 'retrieval' | 'validation';

/**
 * Determines which pipeline step failed and how long it ran before failing.
 *
 * Steps are checked in execution order: retrieval → generation → validation.
 * The first step whose result is absent is the one that failed.
 */
export const resolveFailedStep = ({
  alertRetrievalResult,
  generationResult,
  generationStartMs,
  retrievalStartMs,
  validationStartMs,
}: {
  alertRetrievalResult: AlertRetrievalResult | undefined;
  generationResult: GenerationWorkflowResult | undefined;
  generationStartMs: number;
  retrievalStartMs: number;
  validationStartMs: number;
}): { durationMs: number; failedStep: FailedPipelineStep } => {
  if (alertRetrievalResult == null) {
    return { durationMs: Date.now() - retrievalStartMs, failedStep: 'retrieval' };
  }

  if (generationResult == null) {
    return { durationMs: Date.now() - generationStartMs, failedStep: 'generation' };
  }

  return { durationMs: Date.now() - validationStartMs, failedStep: 'validation' };
};
