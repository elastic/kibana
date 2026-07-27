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
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { WorkflowExecutionAuthorizationError } from '@kbn/discoveries/impl/attack_discovery/generation/assert_authorized_to_execute_workflows';

import { RUN_ATTACK_DISCOVERY_TOOL_ID, getRunAttackDiscoveryTool } from '.';

const mockExecuteGenerationWorkflow = jest.fn();
const mockResolveConnectorDetails = jest.fn();
const mockGetDefaultModel = jest.fn();
const mockIsWorkflowsEnabledForSpace = jest.fn();

jest.mock('@kbn/discoveries/impl/attack_discovery/generation/execute_generation_workflow', () => ({
  executeGenerationWorkflow: (...args: unknown[]) => mockExecuteGenerationWorkflow(...args),
}));

jest.mock('../../../../workflows/helpers/resolve_connector_details', () => ({
  resolveConnectorDetails: (...args: unknown[]) => mockResolveConnectorDetails(...args),
}));

jest.mock('../../../../lib/is_workflows_enabled_for_space', () => ({
  isWorkflowsEnabledForSpace: (...args: unknown[]) => mockIsWorkflowsEnabledForSpace(...args),
}));

const FAKE_REQUEST = httpServerMock.createKibanaRequest();
const SOFT_DEADLINE_MS = 90_000;

const buildToolDeps = () => ({
  analytics: undefined,
  getEventLogIndex: jest.fn().mockResolvedValue('event-log-*'),
  getEventLogger: jest.fn().mockResolvedValue({}),
  getStartServices: jest.fn().mockResolvedValue({
    coreStart: {
      featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(true) },
      uiSettings: {
        asScopedToClient: jest.fn().mockReturnValue({ get: jest.fn().mockResolvedValue(true) }),
      },
    } as unknown,
    pluginsStart: {
      actions: {
        getActionsClientWithRequest: jest
          .fn()
          .mockResolvedValue({ get: jest.fn().mockResolvedValue({}) }),
      },
      inference: { getConnectorById: jest.fn() },
      security: { authz: {} },
    } as unknown,
  }),
  logger: loggingSystemMock.createLogger(),
  workflowsManagementApi: undefined,
});

const buildContext = (overrides: Partial<ToolHandlerContext> = {}): ToolHandlerContext => ({
  attachments: {} as never,
  callContext: { callSource: 'agent', toolCallId: 'test-tool-call-id', toolId: 'test-tool-id' },
  esClient: elasticsearchClientMock.createScopedClusterClient(),
  events: {} as never,
  experimentalFeatures: {} as never,
  logger: loggingSystemMock.createLogger(),
  modelProvider: { getDefaultModel: mockGetDefaultModel } as never,
  prompts: {} as never,
  request: FAKE_REQUEST,
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
  ...overrides,
});

const validationSucceededOutcome = {
  alertRetrievalResult: { alertsContextCount: 7 },
  generationResult: {
    attackDiscoveries: [
      { alert_ids: ['a'], details_markdown: 'd', summary_markdown: 's', title: 't' },
    ],
    executionUuid: 'gen-uuid',
  },
  outcome: 'validation_succeeded' as const,
  validationResult: { generatedCount: 3 },
};

const invokeHandler = async (
  args: Record<string, unknown>,
  contextOverrides: Partial<ToolHandlerContext> = {}
) => {
  const tool = getRunAttackDiscoveryTool(buildToolDeps());
  const context = buildContext(contextOverrides);
  const result = await tool.handler(args as never, context);

  if ('prompt' in result) {
    throw new Error('expected standard tool result, received prompt');
  }

  return result.results[0];
};

describe('RUN_ATTACK_DISCOVERY_TOOL_ID', () => {
  it('has the expected value', () => {
    expect(RUN_ATTACK_DISCOVERY_TOOL_ID).toBe('security.attack-discovery.run');
  });
});

describe('getRunAttackDiscoveryTool', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockIsWorkflowsEnabledForSpace.mockResolvedValue(true);

    mockResolveConnectorDetails.mockResolvedValue({
      actionTypeId: '.gen-ai',
      connectorName: 'Connector',
    });

    mockGetDefaultModel.mockResolvedValue({
      connector: { connectorId: 'model-provider-connector' },
    });

    mockExecuteGenerationWorkflow.mockResolvedValue(validationSucceededOutcome);
  });

  it('returns a tool with the expected id', () => {
    const tool = getRunAttackDiscoveryTool(buildToolDeps());

    expect(tool.id).toBe(RUN_ATTACK_DISCOVERY_TOOL_ID);
  });

  it('is a builtin tool', () => {
    const tool = getRunAttackDiscoveryTool(buildToolDeps());

    expect(tool.type).toBe(ToolType.builtin);
  });

  it('has a non-empty description', () => {
    const tool = getRunAttackDiscoveryTool(buildToolDeps());

    expect(tool.description.length).toBeGreaterThan(0);
  });

  it('uses the connector_id provided in args when present', async () => {
    await invokeHandler({ connector_id: 'override-connector' });

    expect(mockResolveConnectorDetails).toHaveBeenCalledWith(
      expect.objectContaining({ connectorId: 'override-connector' })
    );
  });

  it('does not call modelProvider.getDefaultModel when args.connector_id is provided', async () => {
    await invokeHandler({ connector_id: 'override-connector' });

    expect(mockGetDefaultModel).not.toHaveBeenCalled();
  });

  it('resolves the connector from modelProvider.getDefaultModel when args.connector_id is not provided', async () => {
    await invokeHandler({});

    expect(mockResolveConnectorDetails).toHaveBeenCalledWith(
      expect.objectContaining({ connectorId: 'model-provider-connector' })
    );
  });

  it('returns an error result when modelProvider.getDefaultModel throws', async () => {
    mockGetDefaultModel.mockRejectedValue(new Error('no default model'));

    const result = await invokeHandler({});

    expect(result.type).toBe(ToolResultType.error);
  });

  it('returns an error result when modelProvider.getDefaultModel resolves an empty connectorId', async () => {
    mockGetDefaultModel.mockResolvedValue({ connector: { connectorId: '' } });

    const result = await invokeHandler({});

    expect(result.type).toBe(ToolResultType.error);
  });

  it('does not invoke executeGenerationWorkflow when no connector is resolvable', async () => {
    mockGetDefaultModel.mockRejectedValue(new Error('no default model'));

    await invokeHandler({});

    expect(mockExecuteGenerationWorkflow).not.toHaveBeenCalled();
  });

  it('passes apiConfig built from the resolved connector to executeGenerationWorkflow', async () => {
    await invokeHandler({});

    expect(mockExecuteGenerationWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({
        apiConfig: { action_type_id: '.gen-ai', connector_id: 'model-provider-connector' },
      })
    );
  });

  it('forwards pluginsStart.security.authz to executeGenerationWorkflow so the authorization choke point is enforced', async () => {
    const authz = { actions: { api: { get: jest.fn() } } };
    const deps = buildToolDeps();
    deps.getStartServices = jest.fn().mockResolvedValue({
      coreStart: {
        featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(true) },
        uiSettings: {
          asScopedToClient: jest.fn().mockReturnValue({ get: jest.fn().mockResolvedValue(true) }),
        },
      } as unknown,
      pluginsStart: {
        actions: {
          getActionsClientWithRequest: jest
            .fn()
            .mockResolvedValue({ get: jest.fn().mockResolvedValue({}) }),
        },
        inference: { getConnectorById: jest.fn() },
        security: { authz },
      } as unknown,
    });

    const tool = getRunAttackDiscoveryTool(deps);
    await tool.handler({} as never, buildContext());

    expect(mockExecuteGenerationWorkflow).toHaveBeenCalledWith(expect.objectContaining({ authz }));
  });

  it('disables default retrieval and forwards the alerts when alerts are supplied', async () => {
    await invokeHandler({ alerts: ['Alert 1', 'Alert 2'] });

    expect(mockExecuteGenerationWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({
        alerts: ['Alert 1', 'Alert 2'],
        workflowConfig: expect.objectContaining({ default_retrieval_enabled: false }),
      })
    );
  });

  it('returns inline discoveries on validation_succeeded outcome (sync mode)', async () => {
    const result = await invokeHandler({});

    expect(result.data).toMatchObject({
      alerts_context_count: 7,
      discovery_count: 3,
      execution_uuid: 'gen-uuid',
      status: 'completed',
    });
  });

  it('returns null discoveries when outcome is not validation_succeeded (sync mode)', async () => {
    mockExecuteGenerationWorkflow.mockResolvedValue({ outcome: 'validation_failed' });

    const result = await invokeHandler({});

    expect(result.data).toMatchObject({
      alerts_context_count: 0,
      attack_discoveries: null,
      discovery_count: 0,
      status: 'completed',
    });
  });

  it('returns execution_uuid only when the soft deadline elapses before the pipeline completes', async () => {
    jest.useFakeTimers();

    mockExecuteGenerationWorkflow.mockImplementation(() => new Promise(() => {}));

    const tool = getRunAttackDiscoveryTool(buildToolDeps());
    const handlerPromise = tool.handler({} as never, buildContext());

    await jest.advanceTimersByTimeAsync(SOFT_DEADLINE_MS + 1);

    const result = await handlerPromise;

    if ('prompt' in result) {
      throw new Error('expected standard tool result, received prompt');
    }

    expect(result.results[0].data).toMatchObject({
      execution_uuid: expect.any(String),
      status: 'pending',
    });
    expect(result.results[0].data).not.toHaveProperty('attack_discoveries');

    jest.useRealTimers();
  });

  it('returns execution_uuid immediately in async mode without awaiting the pipeline', async () => {
    let resolvePipeline: ((value: unknown) => void) | undefined;
    mockExecuteGenerationWorkflow.mockImplementation(
      () => new Promise((resolve) => (resolvePipeline = resolve))
    );

    const result = await invokeHandler({ mode: 'async' });

    expect(result.data).toMatchObject({ execution_uuid: expect.any(String), status: 'pending' });

    resolvePipeline?.(validationSucceededOutcome);
  });

  it('does not reject the handler when an async-mode background pipeline rejects', async () => {
    mockExecuteGenerationWorkflow.mockRejectedValue(new Error('background failure'));

    await expect(invokeHandler({ mode: 'async' })).resolves.toBeDefined();
  });

  it('returns an error result when resolveConnectorDetails throws', async () => {
    mockResolveConnectorDetails.mockRejectedValue(new Error('boom'));

    const result = await invokeHandler({});

    expect(result.type).toBe(ToolResultType.error);
  });

  it('returns an error result when executeGenerationWorkflow throws synchronously in sync mode', async () => {
    mockExecuteGenerationWorkflow.mockRejectedValue(new Error('pipeline boom'));

    const result = await invokeHandler({});

    expect(result.type).toBe(ToolResultType.error);
  });

  it('returns an error result when unauthorized to execute workflows (sync mode)', async () => {
    mockExecuteGenerationWorkflow.mockRejectedValue(
      new WorkflowExecutionAuthorizationError(['workflowsManagement:execute'])
    );

    const result = await invokeHandler({});

    expect(result.type).toBe(ToolResultType.error);
  });

  it('does not surface attack discoveries when unauthorized to execute workflows (sync mode)', async () => {
    mockExecuteGenerationWorkflow.mockRejectedValue(
      new WorkflowExecutionAuthorizationError(['workflowsManagement:execute'])
    );

    const result = await invokeHandler({});

    expect(result.data).not.toHaveProperty('attack_discoveries');
  });

  describe('per-space setting check', () => {
    it('returns an error result when isWorkflowsEnabledForSpace returns false', async () => {
      mockIsWorkflowsEnabledForSpace.mockResolvedValue(false);

      const result = await invokeHandler({});

      expect(result.type).toBe(ToolResultType.error);
    });

    it('does not call executeGenerationWorkflow when isWorkflowsEnabledForSpace returns false', async () => {
      mockIsWorkflowsEnabledForSpace.mockResolvedValue(false);

      await invokeHandler({});

      expect(mockExecuteGenerationWorkflow).not.toHaveBeenCalled();
    });

    it('error message mentions the space setting when isWorkflowsEnabledForSpace returns false', async () => {
      mockIsWorkflowsEnabledForSpace.mockResolvedValue(false);

      const result = await invokeHandler({});

      expect((result.data as { message: string }).message).toContain('not enabled for this space');
    });
  });
});
