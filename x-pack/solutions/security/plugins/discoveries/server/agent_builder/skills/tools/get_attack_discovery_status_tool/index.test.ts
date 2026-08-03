/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType, ToolType } from '@kbn/agent-builder-common';
import type { ToolHandlerContext } from '@kbn/agent-builder-server';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { ExecutionStatus, type WorkflowExecutionDto } from '@kbn/workflows';

import {
  GET_ATTACK_DISCOVERY_STATUS_TOOL_ID,
  getAttackDiscoveryStatusTool,
  type AttackDiscoveryStatusResult,
  type WorkflowExecutionLookup,
} from '.';
import { extractPipelineValidationData } from '../../../../routes/get/pipeline_data/helpers/extract_pipeline_validation_data';
import { getWorkflowExecutionsTracking } from '../../../../routes/get/pipeline_data/helpers/get_workflow_executions_tracking';

jest.mock('../../../../routes/get/pipeline_data/helpers/get_workflow_executions_tracking');
jest.mock('../../../../routes/get/pipeline_data/helpers/extract_pipeline_validation_data');

const mockGetWorkflowExecutionsTracking = getWorkflowExecutionsTracking as jest.MockedFunction<
  typeof getWorkflowExecutionsTracking
>;
const mockExtractPipelineValidationData = extractPipelineValidationData as jest.MockedFunction<
  typeof extractPipelineValidationData
>;

const EXECUTION_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef0123456789';

const getMockExecution = (overrides: Partial<WorkflowExecutionDto> = {}): WorkflowExecutionDto =>
  ({
    error: null,
    finishedAt: '2026-05-05T00:00:00.000Z',
    id: 'workflow-run-id',
    startedAt: '2026-05-05T00:00:00.000Z',
    status: ExecutionStatus.COMPLETED,
    stepExecutions: [],
    workflowId: 'workflow-id',
    workflowName: 'Workflow',
    yaml: '',
    ...overrides,
  } as unknown as WorkflowExecutionDto);

describe('GET_ATTACK_DISCOVERY_STATUS_TOOL_ID', () => {
  it('has the expected value', () => {
    expect(GET_ATTACK_DISCOVERY_STATUS_TOOL_ID).toBe('security.attack-discovery.get_status');
  });
});

describe('getAttackDiscoveryStatusTool', () => {
  const mockLogger = loggingSystemMock.createLogger();
  const mockEsClient = elasticsearchClientMock.createScopedClusterClient();
  const mockGetEventLogIndex = jest.fn<Promise<string>, []>().mockResolvedValue('event-log-*');
  const mockGetWorkflowExecution = jest.fn<
    ReturnType<WorkflowExecutionLookup['getWorkflowExecution']>,
    Parameters<WorkflowExecutionLookup['getWorkflowExecution']>
  >();

  const mockContext: ToolHandlerContext = {
    attachments: {} as never,
    callContext: { callSource: 'agent', toolCallId: 'test-tool-call-id', toolId: 'test-tool-id' },
    esClient: mockEsClient,
    events: {} as never,
    experimentalFeatures: {} as never,
    logger: mockLogger,
    modelProvider: {} as never,
    prompts: {} as never,
    request: {} as never,
    resultStore: {} as never,
    runContext: { runId: 'test-run-id', stack: [] },
    runner: {} as never,
    savedObjectsClient: {} as never,
    skills: {} as never,
    skillsStore: {} as never,
    spaceId: 'default',
    stateManager: {} as never,
    toolManager: {} as never,
    toolProvider: {} as never,
  };

  const mockLookup: WorkflowExecutionLookup = {
    getWorkflowExecution: mockGetWorkflowExecution,
  };

  const buildTool = () =>
    getAttackDiscoveryStatusTool({
      getEventLogIndex: mockGetEventLogIndex,
      workflowExecutionLookup: mockLookup,
    });

  const invoke = async (executionUuid: string) => {
    const tool = buildTool();
    const result = await tool.handler({ execution_uuid: executionUuid }, mockContext);

    if ('prompt' in result) {
      throw new Error('expected standard tool result, received prompt');
    }

    return result.results[0];
  };

  const buildToolWithFeatureFlag = (enabled: boolean) =>
    getAttackDiscoveryStatusTool({
      getEventLogIndex: mockGetEventLogIndex,
      getStartServices: async () => ({
        coreStart: {
          featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(enabled) },
        } as never,
        pluginsStart: {} as never,
      }),
      workflowExecutionLookup: mockLookup,
    });

  beforeEach(() => {
    jest.clearAllMocks();
    mockEsClient.asCurrentUser.security.authenticate.mockResolvedValue({
      username: 'test-user',
    } as unknown as Awaited<ReturnType<typeof mockEsClient.asCurrentUser.security.authenticate>>);
  });

  it('scopes the tracking lookup to the requesting principal (object-level authz)', async () => {
    mockGetWorkflowExecutionsTracking.mockResolvedValue(null);

    await invoke(EXECUTION_UUID);

    expect(mockGetWorkflowExecutionsTracking).toHaveBeenCalledWith(
      expect.objectContaining({ username: 'test-user' })
    );
  });

  it('returns an error result and does no event-log work when the feature flag is OFF', async () => {
    const tool = buildToolWithFeatureFlag(false);

    const result = await tool.handler({ execution_uuid: EXECUTION_UUID }, mockContext);

    if ('prompt' in result) {
      throw new Error('expected standard tool result, received prompt');
    }

    expect(result.results[0].type).toBe(ToolResultType.error);
    expect(mockGetWorkflowExecutionsTracking).not.toHaveBeenCalled();
  });

  it('returns a tool with the expected id', () => {
    const tool = buildTool();

    expect(tool.id).toBe(GET_ATTACK_DISCOVERY_STATUS_TOOL_ID);
  });

  it('is a builtin tool', () => {
    const tool = buildTool();

    expect(tool.type).toBe(ToolType.builtin);
  });

  it('returns not_found when no tracking exists for the execution_uuid', async () => {
    mockGetWorkflowExecutionsTracking.mockResolvedValue(null);

    const result = await invoke(EXECUTION_UUID);

    expect((result.data as AttackDiscoveryStatusResult).status).toBe('not_found');
  });

  it('returns running with phase=alert_retrieval when only retrieval tracking exists', async () => {
    mockGetWorkflowExecutionsTracking.mockResolvedValue({
      alertRetrieval: [{ workflowId: 'wf-ar', workflowRunId: 'run-ar' }],
      generation: null,
      validation: null,
    });

    const result = await invoke(EXECUTION_UUID);

    expect(result.data as AttackDiscoveryStatusResult).toMatchObject({
      phase: 'alert_retrieval',
      status: 'running',
    });
  });

  it('returns running with phase=generation when generation tracking exists but generation is still running', async () => {
    mockGetWorkflowExecutionsTracking.mockResolvedValue({
      alertRetrieval: null,
      generation: { workflowId: 'wf-gen', workflowRunId: 'run-gen' },
      validation: null,
    });
    mockGetWorkflowExecution.mockResolvedValueOnce(
      getMockExecution({ status: ExecutionStatus.RUNNING })
    );

    const result = await invoke(EXECUTION_UUID);

    expect(result.data as AttackDiscoveryStatusResult).toMatchObject({
      phase: 'generation',
      status: 'running',
    });
  });

  it('returns failed when the generation workflow execution failed', async () => {
    mockGetWorkflowExecutionsTracking.mockResolvedValue({
      alertRetrieval: null,
      generation: { workflowId: 'wf-gen', workflowRunId: 'run-gen' },
      validation: null,
    });
    mockGetWorkflowExecution.mockResolvedValueOnce(
      getMockExecution({
        error: { message: 'connector failure', type: 'connector_error' },
        status: ExecutionStatus.FAILED,
      })
    );

    const result = await invoke(EXECUTION_UUID);

    expect(result.data as AttackDiscoveryStatusResult).toMatchObject({
      error_message: 'connector failure',
      phase: 'generation',
      status: 'failed',
    });
  });

  it('returns succeeded with discoveries when validation completes', async () => {
    const discoveries = [
      { id: 'd-1', alert_ids: ['a-1'], details_markdown: '', summary_markdown: '', title: 't' },
    ];
    mockGetWorkflowExecutionsTracking.mockResolvedValue({
      alertRetrieval: null,
      generation: { workflowId: 'wf-gen', workflowRunId: 'run-gen' },
      validation: { workflowId: 'wf-val', workflowRunId: 'run-val' },
    });
    mockGetWorkflowExecution.mockResolvedValueOnce(
      getMockExecution({ status: ExecutionStatus.COMPLETED })
    );
    mockExtractPipelineValidationData.mockReturnValue(discoveries as never);

    const result = await invoke(EXECUTION_UUID);

    expect(result.data as AttackDiscoveryStatusResult).toMatchObject({
      attack_discoveries: discoveries,
      phase: 'validation',
      status: 'succeeded',
    });
  });

  it('returns failed when the validation workflow execution times out', async () => {
    mockGetWorkflowExecutionsTracking.mockResolvedValue({
      alertRetrieval: null,
      generation: { workflowId: 'wf-gen', workflowRunId: 'run-gen' },
      validation: { workflowId: 'wf-val', workflowRunId: 'run-val' },
    });
    mockGetWorkflowExecution.mockResolvedValueOnce(
      getMockExecution({
        error: { message: 'step timed out', type: 'timeout' },
        status: ExecutionStatus.TIMED_OUT,
      })
    );

    const result = await invoke(EXECUTION_UUID);

    expect(result.data as AttackDiscoveryStatusResult).toMatchObject({
      error_message: 'step timed out',
      phase: 'validation',
      status: 'failed',
    });
  });

  it('returns running with phase=validation when validation execution is not yet available', async () => {
    mockGetWorkflowExecutionsTracking.mockResolvedValue({
      alertRetrieval: null,
      generation: { workflowId: 'wf-gen', workflowRunId: 'run-gen' },
      validation: { workflowId: 'wf-val', workflowRunId: 'run-val' },
    });
    mockGetWorkflowExecution.mockResolvedValueOnce(null);

    const result = await invoke(EXECUTION_UUID);

    expect(result.data as AttackDiscoveryStatusResult).toMatchObject({
      phase: 'validation',
      status: 'running',
    });
  });

  it('returns an error result when tracking lookup throws', async () => {
    mockGetWorkflowExecutionsTracking.mockRejectedValue(new Error('boom'));

    const result = await invoke(EXECUTION_UUID);

    expect(result.type).toBe(ToolResultType.error);
  });
});
