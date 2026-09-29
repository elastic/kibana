/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isLeft } from 'fp-ts/Either';
import * as t from 'io-ts';

import type { KibanaRequest } from '@kbn/core/server';
import type { WorkflowsManagementApi } from '@kbn/workflows-management-plugin/server';
import { ExecutionStatus, TerminalExecutionStatuses } from '@kbn/workflows';
import {
  CODE_INTELLIGENCE_LOGGING_CLASSIFICATION_WORKFLOW_ID,
  CODE_INTELLIGENCE_OTEL_CLASSIFICATION_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';

import {
  loggingClassificationRequestRt,
  loggingClassificationRt,
  MAX_WORKFLOW_REQUEST_BYTES,
  otelClassificationRequestRt,
  otelClassificationRt,
  type LoggingClassification,
  type LoggingClassificationRequest,
  type OtelClassification,
  type OtelClassificationRequest,
} from '../domain/models/classification_codec';
import { validateClassificationCompleteness } from '../domain/models/classification_completeness';
import type { OperationResult } from '../domain/models/operation_result';
import type { ClassificationWorkflowClient } from '../domain/ports/workflows';

const workflowDeadlineMs = 5 * 60_000;
const workflowPollIntervalMs = 2_500;

const failure = (code: string, message: string, retryable: boolean): OperationResult<never> => ({
  error: { code, message, retryable },
  status: 'failure',
});

const record = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

const workflowResults = (execution: unknown): unknown => {
  const steps = record(execution)?.stepExecutions;
  if (!Array.isArray(steps)) return undefined;
  const classify = steps.find((step) => record(step)?.stepId === 'classify');
  const content = record(record(classify)?.output)?.content;
  return record(content)?.results ?? content;
};

const validateRequest = <Value>(codec: t.Type<Value>, value: Value): OperationResult<Value> => {
  const decoded = codec.decode(value);
  if (
    isLeft(decoded) ||
    new TextEncoder().encode(JSON.stringify({ inputs: value })).byteLength >
      MAX_WORKFLOW_REQUEST_BYTES
  ) {
    return failure('invalid_workflow_request', 'Workflow request exceeded its contract.', false);
  }
  return { status: 'success', value: decoded.right };
};

const sourceBackedLoggingResults = (
  request: LoggingClassificationRequest,
  results: readonly LoggingClassification[]
): readonly LoggingClassification[] =>
  results.map((result) => {
    const candidate = request.candidates.find(({ id }) => id === result.id);
    return {
      id: result.id,
      keep: result.keep,
      ...(result.level === undefined ? {} : { level: result.level }),
      ...(result.staticMessage !== undefined &&
      candidate?.excerpt.includes(result.staticMessage) === true
        ? { staticMessage: result.staticMessage }
        : {}),
    };
  });

const sourceBackedOtelResults = (
  request: OtelClassificationRequest,
  results: readonly OtelClassification[]
): readonly OtelClassification[] =>
  results.map((result) => {
    const candidate = request.candidates.find(({ id }) => id === result.id);
    const sourceContains = (value: string | undefined): value is string =>
      value !== undefined &&
      candidate !== undefined &&
      (candidate.signal.value?.includes(value) === true ||
        candidate.evidence.some(({ excerpt }) => excerpt.includes(value)));
    return {
      id: result.id,
      keep: result.keep,
      ...(result.severityScore === undefined ? {} : { severityScore: result.severityScore }),
      ...(sourceContains(result.title) ? { title: result.title } : {}),
      ...(sourceContains(result.description) ? { description: result.description } : {}),
    };
  });

export class InProcessClassificationWorkflowClient implements ClassificationWorkflowClient {
  public constructor(
    private readonly managedWorkflows: PluginScopedManagedWorkflowsApi,
    private readonly management: WorkflowsManagementApi,
    private readonly request: KibanaRequest,
    private readonly spaceId: string
  ) {}

  private async run<Value>(
    workflowId:
      | typeof CODE_INTELLIGENCE_LOGGING_CLASSIFICATION_WORKFLOW_ID
      | typeof CODE_INTELLIGENCE_OTEL_CLASSIFICATION_WORKFLOW_ID,
    input: Record<string, unknown>,
    codec: t.Type<readonly Value[]>
  ): Promise<OperationResult<readonly Value[]>> {
    try {
      const executionId = await this.managedWorkflows.execute(this.request, workflowId, {
        inputs: input,
        spaceId: this.spaceId,
        triggeredBy: 'code-intelligence',
      });
      const deadline = Date.now() + workflowDeadlineMs;
      let execution;
      while (Date.now() < deadline) {
        execution = await this.management.getWorkflowExecution(executionId, this.spaceId, {
          includeOutput: true,
          request: this.request,
        });
        if (
          execution !== null &&
          TerminalExecutionStatuses.includes(execution.status as ExecutionStatus)
        ) {
          break;
        }
        await new Promise<void>((resolve) => setTimeout(resolve, workflowPollIntervalMs));
      }
      if (execution?.status !== ExecutionStatus.COMPLETED) {
        return failure(
          'workflow_execution_failed',
          'Classification workflow did not complete.',
          true
        );
      }
      const decoded = codec.decode(workflowResults(execution));
      return isLeft(decoded)
        ? failure(
            'malformed_workflow_response',
            'Classification workflow response did not match its contract.',
            false
          )
        : { status: 'success', value: decoded.right };
    } catch (_error: unknown) {
      return failure('workflow_transport_failure', 'Classification workflow failed.', true);
    }
  }

  public async classifyLogging(
    request: LoggingClassificationRequest
  ): Promise<OperationResult<readonly LoggingClassification[]>> {
    const validated = validateRequest(loggingClassificationRequestRt, request);
    if (validated.status === 'failure') return validated;
    const result = await this.run(
      CODE_INTELLIGENCE_LOGGING_CLASSIFICATION_WORKFLOW_ID,
      validated.value,
      t.readonlyArray(loggingClassificationRt)
    );
    if (result.status === 'failure') return result;
    const complete = validateClassificationCompleteness(validated.value.candidates, result.value);
    return complete.status === 'failure'
      ? complete
      : {
          status: 'success',
          value: sourceBackedLoggingResults(validated.value, complete.value),
        };
  }

  public async classifyOtel(
    request: OtelClassificationRequest
  ): Promise<OperationResult<readonly OtelClassification[]>> {
    const validated = validateRequest(otelClassificationRequestRt, request);
    if (validated.status === 'failure') return validated;
    const result = await this.run(
      CODE_INTELLIGENCE_OTEL_CLASSIFICATION_WORKFLOW_ID,
      validated.value,
      t.readonlyArray(otelClassificationRt)
    );
    if (result.status === 'failure') return result;
    const complete = validateClassificationCompleteness(validated.value.candidates, result.value);
    return complete.status === 'failure'
      ? complete
      : {
          status: 'success',
          value: sourceBackedOtelResults(validated.value, complete.value),
        };
  }
}
