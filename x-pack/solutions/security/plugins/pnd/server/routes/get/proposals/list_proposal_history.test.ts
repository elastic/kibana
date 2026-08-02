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
import { PND_PROPOSALS_HISTORY_URL, SYSTEM_SECURITY_WATCH_FLOOR_ID } from '@kbn/pnd-common';

import { PND_API_PRIVILEGE_READ } from '../../../../common/constants';
import { createPendingGatesManagementClientMock } from '../../../lib/list_pending_pnd_gates/mocks';
import type { RouteDependencies } from '../../register_routes';
import { findAttackDiscoveryAlerts } from '../conversations/helpers/find_attack_discovery_alerts';
import { registerListProposalHistoryRoute } from './list_proposal_history';

jest.mock('../conversations/helpers/find_attack_discovery_alerts');

const findAttackDiscoveryAlertsMock = findAttackDiscoveryAlerts as jest.Mock;

const http = { id: 'http' };

const createStartServices = () => {
  const get = jest.fn().mockResolvedValue(true);
  const uiSettings = { asScopedToClient: jest.fn().mockReturnValue({ get }) };
  const savedObjects = {
    getUnsafeInternalClient: jest
      .fn()
      .mockReturnValue({ asScopedToNamespace: jest.fn().mockReturnValue({}) }),
  };
  return jest.fn().mockResolvedValue([{ http, savedObjects, uiSettings }, {}, {}]);
};

/** A gate the analyst already answered, in the shape `extractGateAnswer` reads. */
const answeredStep = () => ({
  finishedAt: '2026-08-02T00:10:00.000Z',
  hitl: { respondedAt: '2026-08-02T00:10:00.000Z', respondedBy: 'analyst' },
  id: 'step-exec-1',
  input: { message: 'Open an investigation?', schema: { type: 'object' } },
  output: { response: { decision: 'approve', rationale: 'The narrative holds up' } },
  startedAt: '2026-08-02T00:05:00.000Z',
  status: ExecutionStatus.COMPLETED,
  stepId: 'await_open_investigation',
  workflowId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
  workflowRunId: 'run-1',
});

const createManagementClient = () =>
  createPendingGatesManagementClientMock([
    { correlationId: 'ad-1', runId: 'run-1', stepExecutions: [answeredStep()] },
  ]);

const createDeps = () => {
  const router = mockRouter.create();

  return {
    config: { enabled: true, ui: { useMockData: false } },
    getSpaceId: jest.fn().mockReturnValue('agent-3'),
    getStartServices: createStartServices(),
    getWatchProjection: jest.fn(),
    getWorkflowsManagementClient: jest.fn().mockReturnValue(createManagementClient()),
    logger: loggerMock.create(),
    router,
  } as unknown as RouteDependencies & { router: ReturnType<typeof mockRouter.create> };
};

const invoke = async (router: ReturnType<typeof mockRouter.create>) => {
  const handler = router.versioned.getRoute('get', PND_PROPOSALS_HISTORY_URL).versions['1'].handler;
  const request = httpServerMock.createKibanaRequest();
  const response = httpServerMock.createResponseFactory();
  const context = {} as unknown as Parameters<typeof handler>[0];

  await handler(context, request, response);

  return response;
};

describe('registerListProposalHistoryRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    findAttackDiscoveryAlertsMock.mockResolvedValue([{ id: 'ad-1' }]);
  });

  it('requires PND read and Workflows managed-execution read', () => {
    const deps = createDeps();
    registerListProposalHistoryRoute(deps);

    expect(
      deps.router.versioned.getRoute('get', PND_PROPOSALS_HISTORY_URL).config.security
    ).toEqual({
      authz: {
        requiredPrivileges: [
          PND_API_PRIVILEGE_READ,
          ...WorkflowsManagementOperationPrivileges.readManagedExecution,
        ],
      },
    });
  });

  it('returns the answered gate as a history row', async () => {
    const deps = createDeps();
    registerListProposalHistoryRoute(deps);

    const response = await invoke(deps.router);

    expect(response.ok).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          groups: [
            expect.objectContaining({
              proposals: [expect.objectContaining({ decision: 'approve', respondedBy: 'analyst' })],
            }),
          ],
        }),
      })
    );
  });

  it('carries the thread conversation id the queue carries, alongside the answer', async () => {
    const deps = createDeps();
    registerListProposalHistoryRoute(deps);

    const response = await invoke(deps.router);

    expect(response.ok).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          groups: [
            expect.objectContaining({
              proposals: [
                expect.objectContaining({
                  decision: 'approve',
                  threadConversationId: 'a1c2022a-57ea-5afa-a7fa-c85ff30b0001',
                }),
              ],
            }),
          ],
        }),
      })
    );
  });
});
