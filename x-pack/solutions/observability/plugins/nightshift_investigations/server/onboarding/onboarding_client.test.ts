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
  connectors = [],
  withAgentBuilder = true,
  withActions = true,
}: {
  executions?: Array<{ id: string }>;
  execution?: Record<string, unknown>;
  workflow?: Record<string, unknown> | null;
  agentInstalled?: boolean;
  /** The space's connectors, as `{ id, actionTypeId, config }`. */
  connectors?: Array<{ id: string; actionTypeId: string; config?: Record<string, unknown> }>;
  withAgentBuilder?: boolean;
  withActions?: boolean;
} = {}) => {
  const management = {
    getWorkflowExecutions: jest.fn().mockResolvedValue({ results: executions }),
    getWorkflowExecution: jest.fn().mockResolvedValue(execution),
    getWorkflow: jest.fn().mockResolvedValue(workflow),
    runWorkflow: jest.fn().mockResolvedValue('exec-2'),
  };
  const agents = {
    getRegistry: jest.fn().mockResolvedValue({ has: jest.fn().mockResolvedValue(agentInstalled) }),
    ensure: jest.fn().mockResolvedValue(undefined),
  };
  const agentAvailability = { kind: 'always' } as never;
  const actionsClient = actionsClientMock.create();
  actionsClient.getAll.mockResolvedValue(connectors as never);
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
        ? ({ agents } as unknown as AgentBuilderPluginStart)
        : undefined,
      agentAvailability,
      actions: withActions ? actions : undefined,
      elasticsearch,
    }),
    logger,
  });
  return {
    client,
    management,
    agents,
    actionsClient,
    esClient,
    logger,
    request: httpServerMock.createKibanaRequest(),
  };
};

const ensuredConnectorIds = (agents: { ensure: jest.Mock }) =>
  agents.ensure.mock.calls[0][0].agent.configuration.connector_ids;

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
    const { client, agents, actionsClient, esClient, request } = setup({
      agentInstalled: false,
      connectors: [
        { id: 'slack', actionTypeId: '.slack' },
        { id: 'remote', actionTypeId: '.elasticsearch', config: { url: 'https://other:9243' } },
      ],
    });

    expect(await client.enable(request)).toEqual({ agent_installed: true });
    expect(esClient.security.createApiKey).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'nightshift-local-elasticsearch-default' })
    );
    expect(actionsClient.create).toHaveBeenCalledWith({
      action: expect.objectContaining({
        actionTypeId: '.elasticsearch',
        config: { url: ES_URL },
        secrets: { authType: 'api_key_header', Authorization: 'ApiKey ZW5j' },
      }),
    });
    expect(agents.ensure).toHaveBeenCalledWith(
      expect.objectContaining({
        spaceId: 'default',
        agent: expect.objectContaining({ id: 'nightshift.investigation' }),
      })
    );
    expect(ensuredConnectorIds(agents)).toEqual(['local-es']);
  });

  it("installs the agent with the space's existing connector for the local cluster", async () => {
    const { client, agents, actionsClient, esClient, request } = setup({
      agentInstalled: false,
      connectors: [{ id: 'mine', actionTypeId: '.elasticsearch', config: { url: `${ES_URL}/` } }],
    });

    expect(await client.enable(request)).toEqual({ agent_installed: true });
    expect(esClient.security.createApiKey).not.toHaveBeenCalled();
    expect(actionsClient.create).not.toHaveBeenCalled();
    expect(ensuredConnectorIds(agents)).toEqual(['mine']);
  });

  it('still installs the agent, without a connector, when the API key cannot be created', async () => {
    const { client, agents, actionsClient, esClient, logger, request } = setup({
      agentInstalled: false,
    });
    esClient.security.createApiKey.mockRejectedValue(new Error('security disabled'));

    expect(await client.enable(request)).toEqual({ agent_installed: true });
    expect(actionsClient.create).not.toHaveBeenCalled();
    expect(ensuredConnectorIds(agents)).toEqual([]);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('security disabled'));
  });

  it('still installs the agent, without a connector, when the connector cannot be created', async () => {
    const { client, agents, actionsClient, esClient, logger, request } = setup({
      agentInstalled: false,
    });
    actionsClient.create.mockRejectedValue(new Error('license'));

    expect(await client.enable(request)).toEqual({ agent_installed: true });
    expect(esClient.security.invalidateApiKey).toHaveBeenCalledWith({ ids: ['key-1'] });
    expect(ensuredConnectorIds(agents)).toEqual([]);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('license'));
  });

  it('fails when the agent cannot be installed, keeping the connector for the next enable', async () => {
    const { client, agents, actionsClient, esClient, request } = setup({ agentInstalled: false });
    agents.ensure.mockRejectedValue(new Error('agent type missing'));

    await expect(client.enable(request)).rejects.toThrow('agent type missing');
    expect(actionsClient.create).toHaveBeenCalled();
    expect(actionsClient.delete).not.toHaveBeenCalled();
    expect(esClient.security.invalidateApiKey).not.toHaveBeenCalled();
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
    expect(ensuredConnectorIds(agents)).toEqual([]);
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
