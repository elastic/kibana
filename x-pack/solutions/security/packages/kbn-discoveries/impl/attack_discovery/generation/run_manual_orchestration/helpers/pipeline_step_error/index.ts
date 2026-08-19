/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ErrorCategory } from '@kbn/discoveries-schemas';

export type FailedStep = 'alert_retrieval' | 'generation' | 'validation';

/**
 * Wraps an error from a pipeline step with metadata about which step failed
 * and how long it ran. Used to propagate step-failure context from
 * `runManualOrchestration` to `executeGenerationWorkflow` for telemetry and
 * event writing (errorCategory and failedWorkflowId are forwarded to the
 * generation-failed event so the ES transform can surface them).
 */
export class PipelineStepError extends Error {
  public readonly durationMs: number;
  public readonly errorCategory: ErrorCategory | undefined;
  public readonly failedWorkflowId: string | undefined;
  public readonly step: FailedStep;

  constructor({
    cause,
    durationMs,
    errorCategory,
    failedWorkflowId,
    message,
    step,
  }: {
    cause?: unknown;
    durationMs: number;
    errorCategory?: ErrorCategory;
    failedWorkflowId?: string;
    message: string;
    step: FailedStep;
  }) {
    super(message, { cause });
    this.name = 'PipelineStepError';
    this.durationMs = durationMs;
    this.errorCategory = errorCategory;
    this.failedWorkflowId = failedWorkflowId;
    this.step = step;
  }
}
