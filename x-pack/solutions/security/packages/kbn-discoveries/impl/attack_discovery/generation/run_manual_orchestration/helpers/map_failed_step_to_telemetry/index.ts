/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FailedPipelineStep } from '../resolve_failed_step';

/** The canonical step name used in the telemetry event schema. */
export type TelemetryStep = 'alert_retrieval' | 'generation' | 'validation';

/**
 * Maps a failed pipeline step name to the telemetry parameters required by
 * `reportStepFailure`: the canonical step name used in the event schema, the
 * step's measured duration, and the workflow ID that was executing when the
 * failure occurred.
 */
export const mapFailedStepToTelemetry = ({
  defaultAlertRetrievalWorkflowId,
  failedStep,
  generationWorkflowId,
  stepTimings,
  validationWorkflowId,
}: {
  defaultAlertRetrievalWorkflowId: string;
  failedStep: FailedPipelineStep;
  generationWorkflowId: string;
  stepTimings: { generation: number; retrieval: number; validation: number };
  validationWorkflowId: string;
}): { durationMs: number; step: TelemetryStep; workflowId: string } => {
  if (failedStep === 'retrieval') {
    return {
      durationMs: stepTimings.retrieval,
      step: 'alert_retrieval',
      workflowId: defaultAlertRetrievalWorkflowId,
    };
  }

  if (failedStep === 'validation') {
    return {
      durationMs: stepTimings.validation,
      step: 'validation',
      workflowId: validationWorkflowId,
    };
  }

  return {
    durationMs: stepTimings.generation,
    step: 'generation',
    workflowId: generationWorkflowId,
  };
};
