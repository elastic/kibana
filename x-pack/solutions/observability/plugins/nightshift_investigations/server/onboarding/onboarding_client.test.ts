/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { ElasticsearchServiceStart } from '@kbn/core/server';
import { actionsClientMock } from '@kbn/actions-plugin/server/mocks';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { NIGHTSHIFT_ONBOARDING_SUGGESTIONS_WORKFLOW_ID } from '@kbn/workflows/managed';
import { createOnboardingClient, OnboardingUnavailableError } from './onboarding_client';

const ES_URL = 'https://es.example.com:9243';

const suggestion = {
  title: 'checkout 5xx spike',
  prompt: 'Why did checkout start returning 5xx in the last hour?',
  rationale: '5xx up 4x in the last hour',
  source: 'error_spike',
};

const setup = ({
  executions = [],
  execution,
  workflow = { id: NIGHTSHIFT_ONBOARDING_SUGGESTIONS_WORKFLOW_ID, definition: {} },
  agentInstalled = true,
  agentConnectorIds = [],
  withAgentBuilder = true,
  withExecutionService = true,
  agentExecutions = [],
  agentExecution,
  withActions = true,
  assistantEnabled = false,
  spaceId,
}: {
  executions?: Array<{ id: string }>;
  execution?: Record<string, unknown>;
  workflow?: Record<string, unknown> | null;
  agentInstalled?: boolean;
  /** The agent's connector list as read back after `ensure`. */
  agentConnectorIds?: string[];
  withAgentBuilder?: boolean;
  /** Whether Agent Builder exposes its execution service. */
  withExecutionService?: boolean;
  /** The agent executions found for the workflow execution. */
  agentExecutions?: Array<{ executionId: string }>;
  /** The agent execution as read back with its events. */
  agentExecution?: Record<string, unknown>;
  withActions?: boolean;
  assistantEnabled?: boolean;
  /** Space the request targets; the default space unless a test overrides it. */
  spaceId?: string;
} = {}) => {
  const management = {
    getWorkflowExecutions: jest.fn().mockResolvedValue({ results: executions }),
    getWorkflowExecution: jest.fn().mockResolvedValue(execution),
    getWorkflow: jest.fn().mockResolvedValue(workflow),
    runWorkflow: jest.fn().mockResolvedValue('exec-2'),
  };
  const registry = {
    has: jest.fn().mockResolvedValue(agentInstalled),
    get: jest.fn().mockResolvedValue({ configuration: { connector_ids: agentConnectorIds } }),
    update: jest.fn().mockResolvedValue(undefined),
  };
  const agents = {
    getRegistry: jest.fn().mockResolvedValue(registry),
    ensure: jest.fn().mockResolvedValue(undefined),
  };
  const agentExecutionService = {
    findExecutions: jest.fn().mockResolvedValue(agentExecutions),
    getExecution: jest.fn().mockResolvedValue(agentExecution),
  };
  const agentAvailability = { kind: 'always' } as never;
  const actionsClient = actionsClientMock.create();
  actionsClient.create.mockResolvedValue({ id: 'local-es' } as never);
  const actions = {
    getActionsClientWithRequest: jest.fn().mockResolvedValue(actionsClient),
  } as unknown as ActionsPluginStart;
  const esClient = {
    security: {
      createApiKey: jest.fn().mockResolvedValue({ id: 'key-1', api_key: 'raw', encoded: 'ZW5j' }),
      invalidateApiKey: jest.fn().mockResolvedValue({}),
    },
  };
  const elasticsearch = {
    publicBaseUrl: ES_URL,
    client: { asScoped: jest.fn().mockReturnValue({ asCurrentUser: esClient }) },
  } as unknown as ElasticsearchServiceStart;
  const logger = loggingSystemMock.createLogger();
  const client = createOnboardingClient({
    getDeps: () => ({
      workflowsManagement: { management } as unknown as WorkflowsServerPluginSetup,
      agentBuilder: withAgentBuilder
        ? ({
            agents,
            ...(withExecutionService ? { execution: agentExecutionService } : {}),
          } as unknown as AgentBuilderPluginStart)
        : undefined,
      agentAvailability,
      ...(spaceId
        ? {
            spaces: {
              spacesService: { getSpaceId: () => spaceId },
            } as unknown as SpacesPluginStart,
          }
        : {}),
      actions: withActions ? actions : undefined,
      elasticsearch,
      assistantEnabled,
    }),
    logger,
  });
  return {
    client,
    management,
    agents,
    agentExecutionService,
    registry,
    actionsClient,
    esClient,
    logger,
    request: httpServerMock.createKibanaRequest(),
  };
};

describe('createOnboardingClient', () => {
  it('returns no execution before onboarding started', async () => {
    const { client, request } = setup();
    expect(await client.get(request)).toEqual({ agent_installed: true });
  });

  it('reports the agent missing from the space until Nightshift is enabled there', async () => {
    const { client, agents, request } = setup({ agentInstalled: false });

    expect(await client.get(request)).toEqual({ agent_installed: false });
    expect(agents.getRegistry).toHaveBeenCalledWith({ request });
  });

  it('reports the agent missing when Agent Builder is not available', async () => {
    const { client, request } = setup({ withAgentBuilder: false });
    expect(await client.get(request)).toEqual({ agent_installed: false });
  });

  it('enables Nightshift by creating the local connector and installing the agent with it', async () => {
    const { client, agents, registry, actionsClient, esClient, request } = setup({
      agentInstalled: false,
    });

    expect(await client.enable(request)).toEqual({ agent_installed: true });
    // The connector id is chosen before the key is created, and the key is named after it.
    const connectorId = actionsClient.create.mock.calls[0][0].options?.id;
    expect(esClient.security.createApiKey).toHaveBeenCalledWith(
      expect.objectContaining({
        name: `nightshift-local-elasticsearch-${connectorId}`,
        metadata: expect.objectContaining({ space_id: 'default', connector_id: connectorId }),
      })
    );
    expect(actionsClient.create).toHaveBeenCalledWith({
      options: { id: expect.any(String) },
      action: expect.objectContaining({
        actionTypeId: '.elasticsearch',
        config: { url: ES_URL, selectedActions: ['_test'] },
        secrets: { authType: 'api_key_header', Authorization: 'ApiKey ZW5j' },
      }),
    });
    expect(agents.ensure).toHaveBeenCalledTimes(1);
    expect(agents.ensure).toHaveBeenCalledWith(
      expect.objectContaining({
        spaceId: 'default',
        agent: expect.objectContaining({ id: 'nightshift.investigation' }),
      })
    );
    expect(registry.update).toHaveBeenCalledWith('nightshift.investigation', {
      configuration: { connector_ids: ['local-es'] },
    });
  });

  it('adds the connector to an agent that already existed without it', async () => {
    const { client, registry, request } = setup({
      agentInstalled: true,
      agentConnectorIds: ['slack'],
    });

    expect(await client.enable(request)).toEqual({ agent_installed: true });
    expect(registry.update).toHaveBeenCalledWith('nightshift.investigation', {
      configuration: { connector_ids: ['slack', 'local-es'] },
    });
  });

  it('still enables, and deletes the unattached connector, when it cannot be added to the agent', async () => {
    const { client, registry, actionsClient, logger, request } = setup({ agentConnectorIds: [] });
    registry.update.mockRejectedValue(new Error('forbidden'));

    expect(await client.enable(request)).toEqual({ agent_installed: true });
    // Deleting the connector invalidates its key through the connector lifecycle listener.
    expect(actionsClient.delete).toHaveBeenCalledWith({ id: 'local-es' });
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('forbidden'));
  });

  it('still enables when the unattached connector cannot be deleted either', async () => {
    const { client, registry, actionsClient, logger, request } = setup({ agentConnectorIds: [] });
    registry.update.mockRejectedValue(new Error('forbidden'));
    actionsClient.delete.mockRejectedValue(new Error('gone'));

    expect(await client.enable(request)).toEqual({ agent_installed: true });
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('gone'));
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('forbidden'));
  });

  it('still installs the agent, without a connector, when the API key cannot be created', async () => {
    const { client, agents, registry, actionsClient, esClient, logger, request } = setup({
      agentInstalled: false,
    });
    esClient.security.createApiKey.mockRejectedValue(new Error('security disabled'));

    expect(await client.enable(request)).toEqual({ agent_installed: true });
    expect(actionsClient.create).not.toHaveBeenCalled();
    expect(agents.ensure).toHaveBeenCalled();
    expect(registry.update).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('security disabled'));
  });

  it('still installs the agent, without a connector, when the connector cannot be created', async () => {
    const { client, agents, registry, actionsClient, esClient, logger, request } = setup({
      agentInstalled: false,
    });
    actionsClient.create.mockRejectedValue(new Error('license'));

    expect(await client.enable(request)).toEqual({ agent_installed: true });
    expect(esClient.security.invalidateApiKey).toHaveBeenCalledWith({ ids: ['key-1'] });
    expect(agents.ensure).toHaveBeenCalled();
    expect(registry.update).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('license'));
  });

  it('fails, before touching connectors, when the agent cannot be installed', async () => {
    const { client, agents, actionsClient, esClient, request } = setup({ agentInstalled: false });
    agents.ensure.mockRejectedValue(new Error('agent type missing'));

    await expect(client.enable(request)).rejects.toThrow('agent type missing');
    expect(esClient.security.createApiKey).not.toHaveBeenCalled();
    expect(actionsClient.create).not.toHaveBeenCalled();
  });

  it('also installs the assistant in the space when it is enabled', async () => {
    const { client, agents, request } = setup({ agentInstalled: false, assistantEnabled: true });

    await client.enable(request);

    expect(agents.ensure).toHaveBeenCalledWith(
      expect.objectContaining({
        spaceId: 'default',
        agent: expect.objectContaining({ id: 'nightshift.assistant' }),
      })
    );
  });

  it('refuses to enable Nightshift outside the default space', async () => {
    const { client, agents, request } = setup({ agentInstalled: false, spaceId: 'marketing' });

    await expect(client.enable(request)).rejects.toThrow(/only available in the "default" space/);
    expect(agents.ensure).not.toHaveBeenCalled();
  });

  it('cannot enable Nightshift without Agent Builder', async () => {
    const { client, request } = setup({ withAgentBuilder: false });
    await expect(client.enable(request)).rejects.toBeInstanceOf(OnboardingUnavailableError);
  });

  it('still installs the agent, without a connector, when connectors are not available', async () => {
    const { client, agents, logger, request } = setup({
      agentInstalled: false,
      withActions: false,
    });

    expect(await client.enable(request)).toEqual({ agent_installed: true });
    expect(agents.ensure).toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Connectors are not available')
    );
  });

  it("maps the space's latest execution and its suggestions", async () => {
    const { client, management, request } = setup({
      executions: [{ id: 'exec-1' }],
      execution: {
        id: 'exec-1',
        status: 'completed',
        startedAt: '2026-10-08T09:00:00.000Z',
        finishedAt: '2026-10-08T09:03:00.000Z',
        // Fields the UI does not render (such as severity from older runs) are dropped.
        context: { output: { suggestions: [{ ...suggestion, severity: 'high' }] } },
      },
    });

    expect(await client.get(request)).toEqual({
      agent_installed: true,
      execution: {
        execution_id: 'exec-1',
        status: 'succeeded',
        started_at: '2026-10-08T09:00:00.000Z',
        finished_at: '2026-10-08T09:03:00.000Z',
        error: undefined,
        suggestions: [suggestion],
      },
    });
    expect(management.getWorkflowExecutions).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowId: NIGHTSHIFT_ONBOARDING_SUGGESTIONS_WORKFLOW_ID,
        sortOrder: 'desc',
        size: 1,
      }),
      'default'
    );
  });

  it('reports a running execution without suggestions', async () => {
    const { client, request } = setup({
      executions: [{ id: 'exec-1' }],
      execution: { id: 'exec-1', status: 'running', finishedAt: undefined, context: {} },
    });

    expect((await client.get(request)).execution).toEqual(
      expect.objectContaining({ status: 'running', suggestions: undefined })
    );
  });

  describe('progress while running', () => {
    const toolCall = (id: string, data: Record<string, unknown> = {}) => ({
      type: 'tool_call',
      data: { tool_call_id: id, tool_id: 'bash', params: { command: 'secret' }, ...data },
    });
    const runningSetup = (overrides: Parameters<typeof setup>[0] = {}) =>
      setup({
        executions: [{ id: 'exec-1' }],
        execution: { id: 'exec-1', status: 'running', context: {} },
        agentExecutions: [{ executionId: 'agent-1' }],
        ...overrides,
      });

    it("reports the agent's tool calls, without params or results", async () => {
      const { client, agentExecutionService, request } = runningSetup({
        agentExecution: {
          events: [
            { type: 'reasoning', data: { reasoning: 'thinking' } },
            toolCall('c1', { intent: ' Checking active alerts ' }),
            { type: 'tool_result', data: { tool_call_id: 'c1', results: [{ data: 'secret' }] } },
            toolCall('c2'),
          ],
        },
      });

      const { execution } = await client.get(request);

      expect(execution?.progress).toEqual([
        { tool_call_id: 'c1', tool_id: 'bash', intent: 'Checking active alerts' },
        { tool_call_id: 'c2', tool_id: 'bash' },
      ]);
      expect(JSON.stringify(execution)).not.toContain('secret');
      expect(agentExecutionService.findExecutions).toHaveBeenCalledWith(request, {
        filter: { metadata: { workflow_execution_id: 'exec-1' } },
        sort: { field: '@timestamp', order: 'desc' },
        size: 1,
      });
      expect(agentExecutionService.getExecution).toHaveBeenCalledWith('agent-1');
    });

    it('keeps the newest 20 tool calls and caps long intents', async () => {
      const { client, request } = runningSetup({
        agentExecution: {
          events: Array.from({ length: 25 }, (_, i) =>
            toolCall(`c${i}`, { intent: 'x'.repeat(500) })
          ),
        },
      });

      const progress = (await client.get(request)).execution?.progress;

      expect(progress).toHaveLength(20);
      expect(progress?.[0].tool_call_id).toBe('c5');
      expect(progress?.[19].tool_call_id).toBe('c24');
      expect(progress?.[0].intent).toHaveLength(200);
    });

    it('reports no progress before the agent has made a tool call', async () => {
      const { client, request } = runningSetup({
        agentExecution: { events: [{ type: 'reasoning', data: {} }] },
      });
      expect((await client.get(request)).execution?.progress).toBeUndefined();
    });

    it('reports no progress before the agent execution exists', async () => {
      const { client, agentExecutionService, request } = runningSetup({ agentExecutions: [] });

      expect((await client.get(request)).execution).not.toHaveProperty('progress');
      expect(agentExecutionService.getExecution).not.toHaveBeenCalled();
    });

    it('does not look for progress once the run is over', async () => {
      const { client, agentExecutionService, request } = setup({
        executions: [{ id: 'exec-1' }],
        execution: { id: 'exec-1', status: 'completed', context: {} },
      });

      expect((await client.get(request)).execution).not.toHaveProperty('progress');
      expect(agentExecutionService.findExecutions).not.toHaveBeenCalled();
    });

    it('still answers when the agent execution cannot be found', async () => {
      const { client, agentExecutionService, logger, request } = runningSetup();
      agentExecutionService.findExecutions.mockRejectedValue(new Error('index missing'));

      expect((await client.get(request)).execution).toEqual(
        expect.objectContaining({ status: 'running' })
      );
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('index missing'));
    });

    it('still answers when the agent execution cannot be read', async () => {
      const { client, agentExecutionService, logger, request } = runningSetup();
      agentExecutionService.getExecution.mockRejectedValue(new Error('boom'));

      expect((await client.get(request)).execution).not.toHaveProperty('progress');
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('boom'));
    });

    it('still answers when Agent Builder has no execution service', async () => {
      const { client, request } = runningSetup({ withExecutionService: false });
      expect((await client.get(request)).execution).toEqual(
        expect.objectContaining({ status: 'running' })
      );
    });
  });

  it('starts the workflow without inputs', async () => {
    const { client, management, request } = setup();

    expect(await client.start(request)).toEqual({ execution_id: 'exec-2' });
    expect(management.runWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ id: NIGHTSHIFT_ONBOARDING_SUGGESTIONS_WORKFLOW_ID }),
      'default',
      {},
      request,
      'nightshift-onboarding'
    );
  });

  it('fails when the workflow is not installed', async () => {
    const { client, request } = setup({ workflow: null });
    await expect(client.start(request)).rejects.toBeInstanceOf(OnboardingUnavailableError);
  });
});
