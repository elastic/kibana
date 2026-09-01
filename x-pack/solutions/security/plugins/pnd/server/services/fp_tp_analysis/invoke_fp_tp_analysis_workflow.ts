/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { PND_ATTACK_DISCOVERY_FP_TP_WORKFLOW_ID } from '@kbn/workflows/managed';
import type { WorkflowExecutionEngineModel } from '@kbn/workflows';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import {
  extractWorkflowOutput,
  parseFpTpExecutionOutput,
  type ParsedFpTpAnalysis,
} from './parse_fp_tp_execution_output';
import { pollForFpTpWorkflowCompletion } from './poll_for_fp_tp_workflow_completion';
import { FP_TP_ANALYSIS_TRIGGERED_BY, FP_TP_ERROR_CODE } from './types';
import type { FpTpWorkflowsManagementApi } from './types';

export interface InvokeFpTpAnalysisWorkflowParams {
  attackDiscoveryId: string;
  investigationId: string;
  logger: Logger;
  maxWaitMs?: number;
  request: KibanaRequest;
  spaceId: string;
  workflowsManagementApi: FpTpWorkflowsManagementApi;
}

export type InvokeFpTpAnalysisWorkflowResult = ParsedFpTpAnalysis & {
  workflowExecutionId: string;
  workflowId: string;
};

const assertUserSpace = (spaceId: string): void => {
  if (spaceId === GLOBAL_WORKFLOW_SPACE_ID || spaceId.trim().length === 0) {
    throw new Error(
      'FP/TP analysis must be invoked with the requesting user space, not the global workflow space'
    );
  }
};

export const invokeFpTpAnalysisWorkflow = async ({
  attackDiscoveryId,
  investigationId,
  logger,
  maxWaitMs,
  request,
  spaceId,
  workflowsManagementApi,
}: InvokeFpTpAnalysisWorkflowParams): Promise<InvokeFpTpAnalysisWorkflowResult> => {
  assertUserSpace(spaceId);

  const workflowId = PND_ATTACK_DISCOVERY_FP_TP_WORKFLOW_ID;
  const rawWorkflow = await workflowsManagementApi.getWorkflow(workflowId, spaceId);

  if (!rawWorkflow?.definition) {
    return {
      kind: 'failed',
      workflowId,
      workflowExecutionId: '',
      result: {
        status: 'failed',
        attack_discovery_id: attackDiscoveryId,
        investigation_id: investigationId,
        error: {
          code: FP_TP_ERROR_CODE.workflowMissing,
          message: `FP/TP analysis workflow (id: ${workflowId}) was not found in space "${spaceId}".`,
          retryable: true,
        },
      },
    };
  }

  const workflowToRun: WorkflowExecutionEngineModel = {
    definition: rawWorkflow.definition,
    enabled: rawWorkflow.enabled,
    id: rawWorkflow.id,
    name: rawWorkflow.name,
    yaml: rawWorkflow.yaml,
  };

  const workflowExecutionId = await workflowsManagementApi.scheduleWorkflow(
    workflowToRun,
    spaceId,
    {
      attack_discovery_id: attackDiscoveryId,
      investigation_id: investigationId,
    },
    request,
    FP_TP_ANALYSIS_TRIGGERED_BY
  );

  logger.info(`Scheduled FP/TP analysis workflow (workflowExecutionId: ${workflowExecutionId})`);

  try {
    const execution = await pollForFpTpWorkflowCompletion({
      executionId: workflowExecutionId,
      logger,
      ...(maxWaitMs != null ? { maxWaitMs } : {}),
      spaceId,
      workflowsManagementApi,
    });

    const output = extractWorkflowOutput(execution);
    if (output == null) {
      return {
        kind: 'failed',
        workflowId,
        workflowExecutionId,
        result: {
          status: 'failed',
          attack_discovery_id: attackDiscoveryId,
          investigation_id: investigationId,
          error: {
            code:
              execution.status === 'timed_out'
                ? FP_TP_ERROR_CODE.timeout
                : FP_TP_ERROR_CODE.workflowOutputMissing,
            message:
              execution.error?.message ??
              `FP/TP analysis workflow completed without a workflow.output payload (status: ${execution.status}).`,
            retryable: true,
          },
        },
      };
    }

    return {
      ...parseFpTpExecutionOutput({
        attackDiscoveryId,
        investigationId,
        output,
      }),
      workflowId,
      workflowExecutionId,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const timedOut = message.includes('timed out');

    logger.error(`FP/TP analysis workflow failed: ${message}`);

    return {
      kind: 'failed',
      workflowId,
      workflowExecutionId,
      result: {
        status: 'failed',
        attack_discovery_id: attackDiscoveryId,
        investigation_id: investigationId,
        error: {
          code: timedOut ? FP_TP_ERROR_CODE.timeout : FP_TP_ERROR_CODE.workflowFailed,
          message,
          retryable: true,
        },
      },
    };
  }
};
