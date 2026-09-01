/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { WorkflowDetailDto } from '@kbn/workflows';

import { invokeSkillReportWorkflow } from './invoke_skill_report_workflow';
import type { WorkflowsManagementApi } from './invoke_alert_retrieval_workflow';

const mockWorkflow = {
  definition: { steps: [] },
  enabled: true,
  id: 'system-attack-discovery-skill-report',
  name: 'Security - Attack discovery - Skill report',
  valid: true,
  yaml: 'version: "1"',
} as unknown as WorkflowDetailDto;

const createLogger = (): jest.Mocked<Logger> =>
  ({
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  } as unknown as jest.Mocked<Logger>);

const createWorkflowsManagementApi = (): jest.Mocked<WorkflowsManagementApi> =>
  ({
    getWorkflow: jest.fn().mockResolvedValue(mockWorkflow),
    getWorkflowExecution: jest.fn(),
    runWorkflow: jest.fn(),
    scheduleWorkflow: jest.fn().mockResolvedValue('report-run-id'),
  } as unknown as jest.Mocked<WorkflowsManagementApi>);

const baseParams = {
  connectorId: 'connector-xyz',
  conversationId: 'conversation-123',
  executionUuid: 'execution-abc',
  request: {} as KibanaRequest,
  spaceId: 'default',
  workflowId: 'system-attack-discovery-skill-report',
};

describe('invokeSkillReportWorkflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('schedules the report workflow with the connector id, conversation id, and execution uuid', async () => {
    const logger = createLogger();
    const workflowsManagementApi = createWorkflowsManagementApi();

    await invokeSkillReportWorkflow({ ...baseParams, logger, workflowsManagementApi });

    expect(workflowsManagementApi.scheduleWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'system-attack-discovery-skill-report' }),
      'default',
      {
        connector_id: 'connector-xyz',
        conversation_id: 'conversation-123',
        execution_uuid: 'execution-abc',
      },
      baseParams.request,
      'attack-discovery-skill-report'
    );
  });

  it('omits connector_id from the scheduled inputs when it is empty (falls back to the default model)', async () => {
    const logger = createLogger();
    const workflowsManagementApi = createWorkflowsManagementApi();

    await invokeSkillReportWorkflow({
      ...baseParams,
      connectorId: '',
      logger,
      workflowsManagementApi,
    });

    expect(workflowsManagementApi.scheduleWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'system-attack-discovery-skill-report' }),
      'default',
      { conversation_id: 'conversation-123', execution_uuid: 'execution-abc' },
      baseParams.request,
      'attack-discovery-skill-report'
    );
  });

  it('looks up the workflow in the provided space', async () => {
    const logger = createLogger();
    const workflowsManagementApi = createWorkflowsManagementApi();

    await invokeSkillReportWorkflow({ ...baseParams, logger, workflowsManagementApi });

    expect(workflowsManagementApi.getWorkflow).toHaveBeenCalledWith(
      'system-attack-discovery-skill-report',
      'default'
    );
  });

  it('skips scheduling when the workflow is not found', async () => {
    const logger = createLogger();
    const workflowsManagementApi = createWorkflowsManagementApi();
    workflowsManagementApi.getWorkflow.mockResolvedValue(null);

    await invokeSkillReportWorkflow({ ...baseParams, logger, workflowsManagementApi });

    expect(workflowsManagementApi.scheduleWorkflow).not.toHaveBeenCalled();
  });

  it('warns when the workflow is not found', async () => {
    const logger = createLogger();
    const workflowsManagementApi = createWorkflowsManagementApi();
    workflowsManagementApi.getWorkflow.mockResolvedValue(null);

    await invokeSkillReportWorkflow({ ...baseParams, logger, workflowsManagementApi });

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('not found'));
  });

  it('does not throw when scheduling fails', async () => {
    const logger = createLogger();
    const workflowsManagementApi = createWorkflowsManagementApi();
    workflowsManagementApi.scheduleWorkflow.mockRejectedValue(new Error('schedule boom'));

    await expect(
      invokeSkillReportWorkflow({ ...baseParams, logger, workflowsManagementApi })
    ).resolves.toBeUndefined();
  });

  it('logs an error when scheduling fails', async () => {
    const logger = createLogger();
    const workflowsManagementApi = createWorkflowsManagementApi();
    workflowsManagementApi.scheduleWorkflow.mockRejectedValue(new Error('schedule boom'));

    await invokeSkillReportWorkflow({ ...baseParams, logger, workflowsManagementApi });

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('schedule boom'));
  });
});
