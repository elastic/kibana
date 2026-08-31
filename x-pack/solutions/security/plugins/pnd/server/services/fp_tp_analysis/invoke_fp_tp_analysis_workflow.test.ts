/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { MOCK_FP_TP_TRUE_POSITIVE_RESULT } from '@kbn/pnd-common';
import { ExecutionStatus } from '@kbn/workflows';
import type { WorkflowDetailDto, WorkflowExecutionDto } from '@kbn/workflows';
import { PND_ATTACK_DISCOVERY_FP_TP_WORKFLOW_ID } from '@kbn/workflows/managed';
import { invokeFpTpAnalysisWorkflow } from './invoke_fp_tp_analysis_workflow';
import type { FpTpWorkflowsManagementApi } from './types';

const request = {} as KibanaRequest;

const mockWorkflow = {
  definition: { steps: [] },
  enabled: true,
  id: PND_ATTACK_DISCOVERY_FP_TP_WORKFLOW_ID,
  name: 'Attack Discovery FP/TP analysis',
  valid: true,
  yaml: 'version: "1"',
} as unknown as WorkflowDetailDto;

const completedExecution = {
  status: ExecutionStatus.COMPLETED,
  error: null,
  stepExecutions: [
    {
      stepType: 'workflow.output',
      output: MOCK_FP_TP_TRUE_POSITIVE_RESULT,
    },
  ],
} as unknown as WorkflowExecutionDto;

const createLogger = (): jest.Mocked<Logger> =>
  ({
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  } as unknown as jest.Mocked<Logger>);

const createWorkflowsManagementApi = (): jest.Mocked<FpTpWorkflowsManagementApi> =>
  ({
    getWorkflow: jest.fn().mockResolvedValue(mockWorkflow),
    getWorkflowExecution: jest.fn().mockResolvedValue(completedExecution),
    scheduleWorkflow: jest.fn().mockResolvedValue('fp-tp-exec-1'),
  } as unknown as jest.Mocked<FpTpWorkflowsManagementApi>);

const defaultArgs = {
  attackDiscoveryId: 'ad-001',
  investigationId: 'inv-001',
  request,
  spaceId: 'analyst-space',
};

describe('invokeFpTpAnalysisWorkflow', () => {
  it('schedules the workflow with document ids in the requesting user space', async () => {
    const logger = createLogger();
    const workflowsManagementApi = createWorkflowsManagementApi();

    await invokeFpTpAnalysisWorkflow({
      ...defaultArgs,
      logger,
      workflowsManagementApi,
    });

    expect(workflowsManagementApi.scheduleWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ id: PND_ATTACK_DISCOVERY_FP_TP_WORKFLOW_ID }),
      'analyst-space',
      {
        attack_discovery_id: 'ad-001',
        investigation_id: 'inv-001',
      },
      request,
      'pnd-fp-tp-analysis'
    );
  });

  it('returns the parsed completed result from workflow.output', async () => {
    const logger = createLogger();
    const workflowsManagementApi = createWorkflowsManagementApi();

    const result = await invokeFpTpAnalysisWorkflow({
      ...defaultArgs,
      logger,
      workflowsManagementApi,
    });

    expect(result).toEqual({
      kind: 'completed',
      result: MOCK_FP_TP_TRUE_POSITIVE_RESULT,
      workflowId: PND_ATTACK_DISCOVERY_FP_TP_WORKFLOW_ID,
      workflowExecutionId: 'fp-tp-exec-1',
    });
  });

  it('rejects the global workflow space', async () => {
    const logger = createLogger();
    const workflowsManagementApi = createWorkflowsManagementApi();

    await expect(
      invokeFpTpAnalysisWorkflow({
        ...defaultArgs,
        logger,
        spaceId: '*',
        workflowsManagementApi,
      })
    ).rejects.toThrow('requesting user space');
  });

  it('does not schedule when spaceId is the global workflow space', async () => {
    const logger = createLogger();
    const workflowsManagementApi = createWorkflowsManagementApi();

    await invokeFpTpAnalysisWorkflow({
      ...defaultArgs,
      logger,
      spaceId: '*',
      workflowsManagementApi,
    }).catch(() => undefined);

    expect(workflowsManagementApi.scheduleWorkflow).not.toHaveBeenCalled();
  });
});
