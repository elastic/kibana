/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FpTpFailure, FpTpResult } from '@kbn/pnd-common';
import type { WorkflowExecutionDto } from '@kbn/workflows';
import { FP_TP_ERROR_CODE } from './types';

export type ParsedFpTpAnalysis =
  | { kind: 'completed'; result: FpTpResult }
  | { kind: 'failed'; result: FpTpFailure };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toFailure = ({
  attackDiscoveryId,
  code,
  investigationId,
  message,
  retryable,
}: {
  attackDiscoveryId: string;
  code: string;
  investigationId: string;
  message: string;
  retryable: boolean;
}): ParsedFpTpAnalysis => ({
  kind: 'failed',
  result: {
    status: 'failed',
    attack_discovery_id: attackDiscoveryId,
    investigation_id: investigationId,
    error: { code, message, retryable },
  },
});

export const extractWorkflowOutput = (execution: WorkflowExecutionDto): unknown => {
  const outputSteps = execution.stepExecutions.filter(
    (step) => step.stepType === 'workflow.output' && step.output != null
  );
  const failureStep = outputSteps.find(
    (step) => isRecord(step.output) && step.output.status === 'failed'
  );

  return (failureStep ?? outputSteps.at(-1))?.output;
};

export const parseFpTpExecutionOutput = ({
  attackDiscoveryId,
  investigationId,
  output,
}: {
  attackDiscoveryId: string;
  investigationId: string;
  output: unknown;
}): ParsedFpTpAnalysis => {
  if (isRecord(output) && 'schema_version' in output && output.schema_version !== '1') {
    return toFailure({
      attackDiscoveryId,
      investigationId,
      code: FP_TP_ERROR_CODE.unknownSchemaVersion,
      message: `Unsupported FP/TP schema_version: ${String(output.schema_version)}`,
      retryable: false,
    });
  }

  const completed = FpTpResult.safeParse(output);
  if (completed.success) {
    return { kind: 'completed', result: completed.data };
  }

  const failed = FpTpFailure.safeParse(output);
  if (failed.success) {
    return { kind: 'failed', result: failed.data };
  }

  return toFailure({
    attackDiscoveryId,
    investigationId,
    code: FP_TP_ERROR_CODE.malformedModelOutput,
    message: 'Assessment output did not validate against the FP/TP result or failure contract.',
    retryable: true,
  });
};
