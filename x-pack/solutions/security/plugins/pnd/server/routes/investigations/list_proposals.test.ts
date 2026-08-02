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
  deriveConversationIds,
  type ListInvestigationProposalsResponse as ListInvestigationProposalsResponseType,
  ListInvestigationProposalsResponse,
  PND_INVESTIGATION_URL_TEMPLATE,
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
} from '@kbn/pnd-common';
import {
  PND_API_PRIVILEGE_READ,
  PND_ATTACK_DISCOVERY_WORKFLOWS_ENABLED_HEADER,
} from '../../../common/constants';
import { createPendingGatesManagementClientMock } from '../../lib/list_pending_pnd_gates/mocks';
import type { RouteDependencies } from '../register_routes';
import { findAttackDiscoveryAlerts } from '../get/conversations/helpers/find_attack_discovery_alerts';
import { listAgentBuilderConversations } from '../get/conversations/helpers/list_agent_builder_conversations';
import { registerListInvestigationProposalsRoute } from './list_proposals';

jest.mock('../get/conversations/helpers/find_attack_discovery_alerts');
jest.mock('../get/conversations/helpers/list_agent_builder_conversations');

const findAttackDiscoveryAlertsMock = findAttackDiscoveryAlerts as jest.Mock;
const listAgentBuilderConversationsMock = listAgentBuilderConversations as jest.Mock;

const PROPOSALS_PATH = `${PND_INVESTIGATION_URL_TEMPLATE}/proposals`;

/** The Investigation conversation derived from `ad-1` — what a live `Investigation.id` is. */
const { investigationConversationId: INVESTIGATION_ID } = deriveConversationIds('ad-1');

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

const createDeps = ({
  adWorkflowsEnabled = true,
  managementClient,
  useMockData = false,
}: {
  adWorkflowsEnabled?: boolean;
  managementClient?: PendingGatesClient;
  useMockData?: boolean;
}) => {
  const router = mockRouter.create();

  return {
    config: { enabled: true, ui: { useMockData } },
    getSpaceId: jest.fn().mockReturnValue('agent-3'),
    getStartServices: createStartServices(adWorkflowsEnabled),
    getWorkflowsManagementClient: jest.fn().mockReturnValue(managementClient),
    logger: loggerMock.create(),
    router,
  } as unknown as RouteDependencies & { router: ReturnType<typeof mockRouter.create> };
};

type PendingGatesClient = ReturnType<typeof createManagementClient>;

const getHandler = (router: ReturnType<typeof mockRouter.create>) =>
  router.versioned.getRoute('get', PROPOSALS_PATH).versions['1'].handler;

const invoke = async (handler: ReturnType<typeof getHandler>, id: string) => {
  const request = httpServerMock.createKibanaRequest({ params: { id } });
  const response = httpServerMock.createResponseFactory();
  const context = {} as unknown as Parameters<typeof handler>[0];

  await handler(context, request, response);

  return response;
};

const bodyOf = (
  response: ReturnType<typeof httpServerMock.createResponseFactory>
): ListInvestigationProposalsResponseType => {
  const [call] = response.ok.mock.calls;
  const options = call?.[0];

  if (options == null) {
    throw new Error('expected the route to have responded');
  }

  return options.body as ListInvestigationProposalsResponseType;
};

describe('registerListInvestigationProposalsRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    findAttackDiscoveryAlertsMock.mockResolvedValue([{ id: 'ad-1' }, { id: 'ad-2' }]);
    listAgentBuilderConversationsMock.mockResolvedValue([]);
  });

  it('registers the route gated on the read privilege', () => {
    const deps = createDeps({ managementClient: createManagementClient() });

    registerListInvestigationProposalsRoute(deps);

    expect(deps.router.versioned.getRoute('get', PROPOSALS_PATH).config.security).toEqual({
      authz: {
        requiredPrivileges: [
          PND_API_PRIVILEGE_READ,
          ...WorkflowsManagementOperationPrivileges.readManagedExecution,
        ],
      },
    });
  });

  it('serves the fixtures when mock data is in use, without reading the queue', async () => {
    const managementClient = createManagementClient();
    const deps = createDeps({ managementClient, useMockData: true });
    registerListInvestigationProposalsRoute(deps);

    const response = await invoke(getHandler(deps.router), 'inv-officer-impossible-travel-001');

    expect(bodyOf(response).total).toBe(2);
    expect(managementClient.getWorkflowExecutions).not.toHaveBeenCalled();
  });

  describe('live mode', () => {
    it('returns the real parked gates rather than an empty list', async () => {
      const deps = createDeps({ managementClient: createManagementClient() });
      registerListInvestigationProposalsRoute(deps);

      const response = await invoke(getHandler(deps.router), INVESTIGATION_ID);

      expect(bodyOf(response)).toEqual({
        proposals: [
          expect.objectContaining({
            approvalRequired: true,
            correlationId: 'ad-1',
            evidenceRefs: [{ id: 'ad-1', type: 'attack_discovery' }],
            gateId: 'open_investigation',
            parentConversationId: INVESTIGATION_ID,
            reasoning: 'Approve opening an investigation?',
            status: 'pending',
            summary: 'Open an investigation?',
            template_id: 'proposal',
            threadConversationId: THREAD_CONVERSATION_ID,
            type: 'investigate',
          }),
        ],
        total: 1,
      });
    });

    it('returns a response that validates against the route contract', async () => {
      const deps = createDeps({ managementClient: createManagementClient() });
      registerListInvestigationProposalsRoute(deps);

      const response = await invoke(getHandler(deps.router), INVESTIGATION_ID);
      const parsed = ListInvestigationProposalsResponse.parse(bodyOf(response));

      expect(parsed.proposals).toHaveLength(1);
    });

    it('addresses each gate under both id and sourceId, so a client can answer it', async () => {
      const deps = createDeps({ managementClient: createManagementClient() });
      registerListInvestigationProposalsRoute(deps);

      const response = await invoke(getHandler(deps.router), INVESTIGATION_ID);
      const [proposal] = bodyOf(response).proposals;

      expect(proposal.sourceId).toBe(proposal.id);
      expect(proposal.id).not.toBe('');
    });

    it('omits confidence rather than inventing one', async () => {
      const deps = createDeps({ managementClient: createManagementClient() });
      registerListInvestigationProposalsRoute(deps);

      const response = await invoke(getHandler(deps.router), INVESTIGATION_ID);

      expect(bodyOf(response).proposals[0]).not.toHaveProperty('confidence');
    });

    it('accepts the Attack Discovery alert id as the investigation id', async () => {
      const deps = createDeps({ managementClient: createManagementClient() });
      registerListInvestigationProposalsRoute(deps);

      const response = await invoke(getHandler(deps.router), 'ad-1');

      expect(bodyOf(response).proposals[0].parentConversationId).toBe('ad-1');
    });

    it('excludes a gate belonging to another investigation', async () => {
      const managementClient = createPendingGatesManagementClientMock([
        {
          correlationId: 'ad-1',
          runId: 'run-1',
          stepExecutions: [pendingStep({ id: 'step-exec-1', workflowRunId: 'run-1' })],
        },
        {
          correlationId: 'ad-2',
          runId: 'run-2',
          stepExecutions: [pendingStep({ id: 'step-exec-2', workflowRunId: 'run-2' })],
        },
      ]);
      const deps = createDeps({ managementClient });
      registerListInvestigationProposalsRoute(deps);

      const response = await invoke(getHandler(deps.router), 'ad-1');

      expect(bodyOf(response)).toEqual({
        proposals: [expect.objectContaining({ correlationId: 'ad-1' })],
        total: 1,
      });
    });

    it('returns an empty list for an investigation with no parked gates', async () => {
      const deps = createDeps({ managementClient: createManagementClient() });
      registerListInvestigationProposalsRoute(deps);

      const response = await invoke(getHandler(deps.router), 'ad-2');

      expect(bodyOf(response)).toEqual({ proposals: [], total: 0 });
    });

    it('omits a gate whose attack discovery the caller cannot read (S3/D3)', async () => {
      findAttackDiscoveryAlertsMock.mockResolvedValue([]);
      const deps = createDeps({ managementClient: createManagementClient() });
      registerListInvestigationProposalsRoute(deps);

      const response = await invoke(getHandler(deps.router), INVESTIGATION_ID);

      expect(bodyOf(response)).toEqual({ proposals: [], total: 0 });
    });

    it('scopes the listing to the space resolved from the request (S9)', async () => {
      const managementClient = createManagementClient();
      const deps = createDeps({ managementClient });
      registerListInvestigationProposalsRoute(deps);

      await invoke(getHandler(deps.router), INVESTIGATION_ID);

      expect(managementClient.getWorkflowExecutions).toHaveBeenCalledWith(
        expect.any(Object),
        'agent-3'
      );
    });

    it('returns an empty list with the AD-2.0-disabled signal when the space setting is off', async () => {
      const deps = createDeps({
        adWorkflowsEnabled: false,
        managementClient: createManagementClient(),
      });
      registerListInvestigationProposalsRoute(deps);

      const response = await invoke(getHandler(deps.router), INVESTIGATION_ID);

      expect(response.ok).toHaveBeenCalledWith({
        body: { proposals: [], total: 0 },
        headers: { [PND_ATTACK_DISCOVERY_WORKFLOWS_ENABLED_HEADER]: 'false' },
      });
    });

    it('stamps the AD-2.0-enabled signal on a populated response', async () => {
      const deps = createDeps({ managementClient: createManagementClient() });
      registerListInvestigationProposalsRoute(deps);

      const response = await invoke(getHandler(deps.router), INVESTIGATION_ID);

      expect(response.ok).toHaveBeenCalledWith(
        expect.objectContaining({ headers: enabledHeaders })
      );
    });

    it('returns a 503 when the workflows management client is unavailable', async () => {
      const deps = createDeps({ managementClient: undefined });
      registerListInvestigationProposalsRoute(deps);

      const response = await invoke(getHandler(deps.router), INVESTIGATION_ID);

      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 503,
        body: { message: 'Workflows management API is not available' },
      });
    });

    it('returns a 500 when reading the queue throws', async () => {
      const managementClient = createManagementClient();
      managementClient.getWorkflowExecutions.mockRejectedValue(new Error('boom'));
      const deps = createDeps({ managementClient });
      registerListInvestigationProposalsRoute(deps);

      const response = await invoke(getHandler(deps.router), INVESTIGATION_ID);

      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: { message: 'Failed to list investigation proposals' },
      });
    });
  });
});
