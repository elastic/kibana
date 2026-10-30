/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import type { NightshiftTelemetryClient } from '../telemetry';
import type {
  OnlineEvalsStep,
  OnlineEvalsStepFailureCode,
} from '../telemetry/online_evals_step_failed_event';

/** A failure an online evals step knows the cause of. */
export class OnlineEvalsStepError extends Error {
  constructor(public readonly code: OnlineEvalsStepFailureCode, message: string) {
    super(message);
    this.name = 'OnlineEvalsStepError';
  }
}

const getFailureCode = (error: unknown): OnlineEvalsStepFailureCode => {
  if (error instanceof OnlineEvalsStepError) {
    return error.code;
  }
  return error instanceof z.ZodError ? 'invalid_input' : 'unexpected';
};

const readId = (input: unknown, key: string): string | undefined => {
  const value = (input as Record<string, unknown> | undefined)?.[key];
  return typeof value === 'string' && value.length <= 1024 ? value : undefined;
};

const readRun = (context: StepHandlerContext) => {
  try {
    const { workflow, execution } = context.contextManager.getContext();
    return { workflow_execution_id: execution.id, space_id: workflow.spaceId };
  } catch {
    return {};
  }
};

/**
 * Logs why an online evals step gave up and reports it as telemetry. The step then returns
 * without scoring, so a failure never fails the investigation or scoring workflow.
 */
export const reportOnlineEvalsStepFailure = ({
  step,
  error,
  context,
  telemetry,
}: {
  step: OnlineEvalsStep;
  error: unknown;
  context: StepHandlerContext;
  telemetry: NightshiftTelemetryClient;
}): void => {
  const code = getFailureCode(error);
  const message = error instanceof Error ? error.message : String(error);
  context.logger.warn(`Online evals step "${step}" failed (${code}): ${message}`);

  const investigationId = readId(context.input, 'investigation_id');
  const roundId = readId(context.input, 'round_id');
  telemetry.reportOnlineEvalsStepFailed({
    step,
    code,
    ...(investigationId ? { investigation_id: investigationId } : {}),
    ...(roundId ? { round_id: roundId } : {}),
    ...readRun(context),
  });
};
