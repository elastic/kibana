/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockRouter } from '@kbn/core-http-router-server-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { ExecutionStatus, WorkflowsManagementOperationPrivileges } from '@kbn/workflows';
import {
  type ListProposalsResponse as ListProposalsResponseType,
  ListProposalsResponse,
  PND_PROPOSALS_URL,
  type PndProposalRow,
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
} from '@kbn/pnd-common';
import {
  PND_API_PRIVILEGE_READ,
  PND_ATTACK_DISCOVERY_WORKFLOWS_ENABLED_HEADER,
} from '../../../../common/constants';
import { createPendingGatesManagementClientMock } from '../../../lib/list_pending_pnd_gates/mocks';
import type { RouteDependencies } from '../../register_routes';
import { findAttackDiscoveryAlerts } from '../conversations/helpers/find_attack_discovery_alerts';
import { listAgentBuilderConversations } from '../conversations/helpers/list_agent_builder_conversations';
import { registerListProposalsRoute } from './list_proposals';

jest.mock('../conversations/helpers/find_attack_discovery_alerts');
jest.mock('../conversations/helpers/list_agent_builder_conversations');

const findAttackDiscoveryAlertsMock = findAttackDiscoveryAlerts as jest.Mock;
const listAgentBuilderConversationsMock = listAgentBuilderConversations as jest.Mock;

/** The `[Thread]` conversation id derived from (`ad-1`, `open_investigation`). */
const THREAD_CONVERSATION_ID = 'a1c2022a-57ea-5afa-a7fa-c85ff30b0001';

const enabledHeaders = { [PND_ATTACK_DISCOVERY_WORKFLOWS_ENABLED_HEADER]: 'true' };

const http = { id: 'http' };

const createStartServices = (adWorkflowsEnabled: boolean) => {
  const get = jest.fn().mockResolvedValue(adWorkflowsEnabled);
  const uiSettings = { asScopedToClient: jest.fn().mockReturnValue({ get }) };
  const savedObjects = {
    getUnsafeInternalClient: jest
      .fn()
      .mockReturnValue({ asScopedToNamespace: jest.fn().mockReturnValue({}) }),
  };
  return jest.fn().mockResolvedValue([{ http, savedObjects, uiSettings }, {}, {}]);
};

const pendingStep = (overrides = {}) => ({
  id: 'step-exec-1',
  input: { message: 'Open an investigation?', schema: { type: 'object' } },
  startedAt: '2026-08-02T00:05:00.000Z',
  status: ExecutionStatus.WAITING_FOR_INPUT,
  stepId: 'await_open_investigation',
  workflowId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
  workflowRunId: 'run-1',
  ...overrides,
});

/** The `data.set` reasoning step the orchestrator runs immediately before each gate (C12). */
const reasoningStep = (overrides = {}) => ({
  finishedAt: '2026-08-02T00:04:00.000Z',
  id: 'step-exec-reason',
  output: { reasoning: { summary: 'Approve opening an investigation?' } },
  startedAt: '2026-08-02T00:03:00.000Z',
  status: ExecutionStatus.COMPLETED,
  stepId: 'reason_open_investigation',
  workflowId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
  workflowRunId: 'run-1',
  ...overrides,
});

const createManagementClient = () =>
  createPendingGatesManagementClientMock([
    {
      correlationId: 'ad-1',
      runId: 'run-1',
      stepExecutions: [reasoningStep(), pendingStep()],
    },
  ]);

const createDeps = (
  managementClient: ReturnType<typeof createManagementClient> | undefined,
  adWorkflowsEnabled = true
) => {
  const router = mockRouter.create();
  const deps = {
    config: { enabled: true, ui: { useMockData: false } },
    getSpaceId: jest.fn().mockReturnValue('agent-3'),
    getStartServices: createStartServices(adWorkflowsEnabled),
    getWatchProjection: jest.fn(),
    getWorkflowsManagementClient: jest.fn().mockReturnValue(managementClient),
    logger: loggerMock.create(),
    router,
  } as unknown as RouteDependencies & { router: ReturnType<typeof mockRouter.create> };

  return deps;
};

const getHandler = (router: ReturnType<typeof mockRouter.create>) =>
  router.versioned.getRoute('get', PND_PROPOSALS_URL).versions['1'].handler;

const invoke = async (handler: ReturnType<typeof getHandler>) => {
  const request = httpServerMock.createKibanaRequest();
  const response = httpServerMock.createResponseFactory();
  const context = {} as unknown as Parameters<typeof handler>[0];

  await handler(context, request, response);

  return response;
};

/** The single proposal row the default fixtures produce. */
const firstProposal = (
  response: ReturnType<typeof httpServerMock.createResponseFactory>
): PndProposalRow => {
  const [call] = response.ok.mock.calls;
  const options = call?.[0];

  if (options == null) {
    throw new Error('expected the route to have responded with a queue');
  }

  const { groups } = options.body as ListProposalsResponseType;
  const [proposal] = groups.flatMap(({ proposals }) => proposals);

  if (proposal == null) {
    throw new Error('expected the queue to hold at least one proposal');
  }

  return proposal;
};

describe('registerListProposalsRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    findAttackDiscoveryAlertsMock.mockResolvedValue([{ id: 'ad-1' }]);
    listAgentBuilderConversationsMock.mockResolvedValue([]);
  });

  it('registers the route gated on the read privilege', () => {
    const deps = createDeps(createManagementClient());

    registerListProposalsRoute(deps);

    expect(deps.router.versioned.getRoute('get', PND_PROPOSALS_URL).config.security).toEqual({
      authz: {
        requiredPrivileges: [
          PND_API_PRIVILEGE_READ,
          ...WorkflowsManagementOperationPrivileges.readManagedExecution,
        ],
      },
    });
  });

  it('returns a grouped queue of pending gates', async () => {
    const deps = createDeps(createManagementClient());
    registerListProposalsRoute(deps);

    const response = await invoke(getHandler(deps.router));

    expect(response.ok).toHaveBeenCalledWith({
      body: {
        groups: [
          {
            proposals: [
              expect.objectContaining({
                correlationId: 'ad-1',
                gateId: 'open_investigation',
                reasoning: 'Approve opening an investigation?',
                recommendedAction: 'investigate',
              }),
            ],
            recommendedAction: 'investigate',
          },
        ],
        total: 1,
      },
      headers: enabledHeaders,
    });
  });

  // The flat queue and `GET /internal/pnd/investigations/{id}/proposals` are two surfaces of one
  // contract, so this route's body has to satisfy the generated codec rather than merely resemble it.
  it('returns a response that validates against the generated route contract', async () => {
    const deps = createDeps(createManagementClient());
    registerListProposalsRoute(deps);

    const response = await invoke(getHandler(deps.router));
    const [call] = response.ok.mock.calls;
    const parsed = ListProposalsResponse.parse(call?.[0]?.body);

    expect(parsed.groups.flatMap(({ proposals }) => proposals)).toHaveLength(1);
  });

  it('carries the thread conversation id derived for each pending gate (D1)', async () => {
    const deps = createDeps(createManagementClient());
    registerListProposalsRoute(deps);

    const response = await invoke(getHandler(deps.router));

    expect(response.ok).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          groups: [
            expect.objectContaining({
              proposals: [
                expect.objectContaining({
                  threadConversationId: 'a1c2022a-57ea-5afa-a7fa-c85ff30b0001',
                }),
              ],
            }),
          ],
        }),
      })
    );
  });

  it('returns an empty queue with the AD-2.0-disabled signal when the space setting is off', async () => {
    const managementClient = createManagementClient();
    const deps = createDeps(managementClient, false);
    registerListProposalsRoute(deps);

    const response = await invoke(getHandler(deps.router));

    expect(response.ok).toHaveBeenCalledWith({
      body: { groups: [], total: 0 },
      headers: { [PND_ATTACK_DISCOVERY_WORKFLOWS_ENABLED_HEADER]: 'false' },
    });
  });

  it('does not read the workflows queue when AD 2.0 is disabled in the space', async () => {
    const managementClient = createManagementClient();
    const deps = createDeps(managementClient, false);
    registerListProposalsRoute(deps);

    await invoke(getHandler(deps.router));

    expect(managementClient.getWorkflowExecutions).not.toHaveBeenCalled();
  });

  it('scopes the listing to the space resolved from the request (S9)', async () => {
    const managementClient = createManagementClient();
    const deps = createDeps(managementClient);
    registerListProposalsRoute(deps);

    await invoke(getHandler(deps.router));

    expect(managementClient.getWorkflowExecutions).toHaveBeenCalledWith(
      expect.any(Object),
      'agent-3'
    );
  });

  it('de-duplicates re-triggered gates by (correlationId, gateId) (S10)', async () => {
    const managementClient = createPendingGatesManagementClientMock([
      {
        correlationId: 'ad-1',
        runId: 'run-1',
        startedAt: '2026-08-02T00:00:00.000Z',
        stepExecutions: [pendingStep({ id: 'step-exec-1', workflowRunId: 'run-1' })],
      },
      {
        correlationId: 'ad-1',
        runId: 'run-2',
        startedAt: '2026-08-02T01:00:00.000Z',
        stepExecutions: [
          pendingStep({
            id: 'step-exec-2',
            startedAt: '2026-08-02T01:05:00.000Z',
            workflowRunId: 'run-2',
          }),
        ],
      },
    ]);
    const deps = createDeps(managementClient);
    registerListProposalsRoute(deps);

    const response = await invoke(getHandler(deps.router));

    expect(response.ok).toHaveBeenCalledWith(
      expect.objectContaining({ body: expect.objectContaining({ total: 1 }) })
    );
  });

  it('resolves the correlated discoveries as the calling user (S3/D3)', async () => {
    const deps = createDeps(createManagementClient());
    registerListProposalsRoute(deps);

    await invoke(getHandler(deps.router));

    expect(findAttackDiscoveryAlertsMock).toHaveBeenCalledWith(
      expect.objectContaining({ http, ids: ['ad-1'], spaceId: 'agent-3' })
    );
  });

  it('omits a proposal whose attack discovery the caller cannot read (S3/D3)', async () => {
    findAttackDiscoveryAlertsMock.mockResolvedValue([]);
    const deps = createDeps(createManagementClient());
    registerListProposalsRoute(deps);

    const response = await invoke(getHandler(deps.router));

    expect(response.ok).toHaveBeenCalledWith({
      body: { groups: [], total: 0 },
      headers: enabledHeaders,
    });
  });

  it('does not call the AD find route when no pending gate carries a correlation (S3/D3)', async () => {
    const managementClient = createPendingGatesManagementClientMock([
      { runId: 'run-1', stepExecutions: [reasoningStep(), pendingStep()] },
    ]);
    const deps = createDeps(managementClient);
    registerListProposalsRoute(deps);

    await invoke(getHandler(deps.router));

    expect(findAttackDiscoveryAlertsMock).not.toHaveBeenCalled();
  });

  it("resolves the thread conversation's title onto each row (D9)", async () => {
    listAgentBuilderConversationsMock.mockResolvedValue([
      { id: THREAD_CONVERSATION_ID, title: 'Is credential access on host-1 worth investigating?' },
    ]);
    const deps = createDeps(createManagementClient());
    registerListProposalsRoute(deps);

    const response = await invoke(getHandler(deps.router));

    expect(firstProposal(response).threadTitle).toEqual(
      'Is credential access on host-1 worth investigating?'
    );
  });

  it('resolves every thread title in one batch, not once per row', async () => {
    const deps = createDeps(createManagementClient());
    registerListProposalsRoute(deps);

    await invoke(getHandler(deps.router));

    expect(listAgentBuilderConversationsMock).toHaveBeenCalledTimes(1);
  });

  it('lists the conversations as the calling user in the request space (S3/S9)', async () => {
    const deps = createDeps(createManagementClient());
    registerListProposalsRoute(deps);

    await invoke(getHandler(deps.router));

    expect(listAgentBuilderConversationsMock).toHaveBeenCalledWith(
      expect.objectContaining({ http, spaceId: 'agent-3' })
    );
  });

  it('leaves threadTitle absent when the thread conversation has not materialised', async () => {
    const deps = createDeps(createManagementClient());
    registerListProposalsRoute(deps);

    const response = await invoke(getHandler(deps.router));

    expect(firstProposal(response)).not.toHaveProperty('threadTitle');
  });

  it('does not list conversations when no pending gate carries a correlation', async () => {
    const managementClient = createPendingGatesManagementClientMock([
      { runId: 'run-1', stepExecutions: [reasoningStep(), pendingStep()] },
    ]);
    const deps = createDeps(managementClient);
    registerListProposalsRoute(deps);

    await invoke(getHandler(deps.router));

    expect(listAgentBuilderConversationsMock).not.toHaveBeenCalled();
  });

  it('still returns the queue when the thread-title enrichment fails', async () => {
    listAgentBuilderConversationsMock.mockRejectedValue(new Error('boom'));
    const deps = createDeps(createManagementClient());
    registerListProposalsRoute(deps);

    const response = await invoke(getHandler(deps.router));

    expect(response.ok).toHaveBeenCalledWith(
      expect.objectContaining({ body: expect.objectContaining({ total: 1 }) })
    );
  });

  it('returns a 503 when the workflows management client is unavailable', async () => {
    const deps = createDeps(undefined);
    registerListProposalsRoute(deps);

    const response = await invoke(getHandler(deps.router));

    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 503 }));
  });

  it('returns a 500 when listing throws', async () => {
    const managementClient = createManagementClient();
    managementClient.getWorkflowExecutions.mockRejectedValue(new Error('boom'));
    const deps = createDeps(managementClient);
    registerListProposalsRoute(deps);

    const response = await invoke(getHandler(deps.router));

    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500 }));
  });
});
