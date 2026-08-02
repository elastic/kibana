/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WorkflowsManagementOperationPrivileges } from '@kbn/workflows';
import { mockRouter } from '@kbn/core-http-router-server-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import {
  PND_RUNS_URL,
  SYSTEM_SECURITY_WATCH_DEEP_ID,
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
  SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
} from '@kbn/pnd-common';

import {
  PND_API_PRIVILEGE_READ,
  PND_ATTACK_DISCOVERY_WORKFLOWS_ENABLED_HEADER,
} from '../../../../common/constants';
import type { RouteDependencies } from '../../register_routes';
import { findAttackDiscoveryAlerts } from '../conversations/helpers/find_attack_discovery_alerts';
import type { CorrelatedExecution } from './helpers/correlate_executions';
import { correlateExecutions } from './helpers/correlate_executions';
import { resolvePendingGateStepExecutionIds } from './helpers/resolve_pending_gate_step_execution_ids';
import { registerListRunsRoute } from './list_runs';

jest.mock('./helpers/correlate_executions');
jest.mock('./helpers/resolve_pending_gate_step_execution_ids');
jest.mock('../conversations/helpers/find_attack_discovery_alerts');

const correlateExecutionsMock = correlateExecutions as jest.Mock;
const resolvePendingGateStepExecutionIdsMock = resolvePendingGateStepExecutionIds as jest.Mock;
const findAttackDiscoveryAlertsMock = findAttackDiscoveryAlerts as jest.Mock;

const http = { id: 'http' };

const enabledHeaders = { [PND_ATTACK_DISCOVERY_WORKFLOWS_ENABLED_HEADER]: 'true' };

const createUiSettings = (adWorkflowsEnabled: boolean) => ({
  savedObjects: {
    getUnsafeInternalClient: jest
      .fn()
      .mockReturnValue({ asScopedToNamespace: jest.fn().mockReturnValue({}) }),
  },
  uiSettings: {
    asScopedToClient: jest
      .fn()
      .mockReturnValue({ get: jest.fn().mockResolvedValue(adWorkflowsEnabled) }),
  },
});

const correlatedExecution = (overrides: {
  correlationId?: string;
  execution?: Record<string, unknown>;
  watchId?: string;
}): CorrelatedExecution =>
  ({
    correlationId: overrides.correlationId ?? 'ad-1',
    event: undefined,
    execution: {
      id: 'run-1',
      status: 'waiting_for_input',
      startedAt: '2026-08-02T00:00:00.000Z',
      finishedAt: '',
      workflowId: 'wf-deep',
      error: null,
      ...overrides.execution,
    },
    watchId: overrides.watchId ?? SYSTEM_SECURITY_WATCH_FLOOR_ID,
  } as unknown as CorrelatedExecution);

const createDeps = (adWorkflowsEnabled = true) => {
  const router = mockRouter.create();
  const deps = {
    config: { enabled: true, ui: { useMockData: false } },
    getSpaceId: jest.fn().mockReturnValue('agent-3'),
    getStartServices: jest
      .fn()
      .mockResolvedValue([{ http, ...createUiSettings(adWorkflowsEnabled) }, {}, {}]),
    getWatchProjection: jest.fn(),
    getWorkflowsManagementClient: jest.fn().mockReturnValue({}),
    logger: loggerMock.create(),
    router,
  } as unknown as RouteDependencies & { router: ReturnType<typeof mockRouter.create> };

  return deps;
};

const getHandler = (router: ReturnType<typeof mockRouter.create>) =>
  router.versioned.getRoute('get', PND_RUNS_URL).versions['1'].handler;

const invoke = async (
  handler: ReturnType<typeof getHandler>,
  query: Record<string, unknown> = {}
) => {
  const request = httpServerMock.createKibanaRequest({ query });
  const response = httpServerMock.createResponseFactory();
  const context = {} as unknown as Parameters<typeof handler>[0];

  await handler(context, request, response);

  return response;
};

describe('registerListRunsRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    correlateExecutionsMock.mockResolvedValue([correlatedExecution({})]);
    resolvePendingGateStepExecutionIdsMock.mockResolvedValue(new Map([['run-1', ['step-exec-1']]]));
    findAttackDiscoveryAlertsMock.mockResolvedValue([{ id: 'ad-1' }]);
  });

  it('gates the route on the read privilege', () => {
    const deps = createDeps();

    registerListRunsRoute(deps);

    expect(deps.router.versioned.getRoute('get', PND_RUNS_URL).config.security).toEqual({
      authz: {
        requiredPrivileges: [
          PND_API_PRIVILEGE_READ,
          ...WorkflowsManagementOperationPrivileges.readManagedExecution,
        ],
      },
    });
  });

  it('returns the projected runs with a total', async () => {
    const deps = createDeps();
    registerListRunsRoute(deps);

    const response = await invoke(getHandler(deps.router));

    expect(response.ok).toHaveBeenCalledWith({
      body: {
        runs: [
          expect.objectContaining({
            correlationId: 'ad-1',
            deepLinkPath: '/wf-deep?tab=executions&executionId=run-1&stepExecutionId=step-exec-1',
            executionId: 'run-1',
            pendingGateCount: 1,
            status: 'waiting_for_input',
            watchId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
          }),
        ],
        total: 1,
      },
      headers: enabledHeaders,
    });
  });

  it('returns an empty list with the AD-2.0-disabled signal when the space setting is off', async () => {
    const deps = createDeps(false);
    registerListRunsRoute(deps);

    const response = await invoke(getHandler(deps.router));

    expect(response.ok).toHaveBeenCalledWith({
      body: { runs: [], total: 0 },
      headers: { [PND_ATTACK_DISCOVERY_WORKFLOWS_ENABLED_HEADER]: 'false' },
    });
  });

  it('does not correlate executions when AD 2.0 is disabled in the space', async () => {
    const deps = createDeps(false);
    registerListRunsRoute(deps);

    await invoke(getHandler(deps.router));

    expect(correlateExecutionsMock).not.toHaveBeenCalled();
  });

  it('correlates executions across both orchestrator workflows by default', async () => {
    const deps = createDeps();
    registerListRunsRoute(deps);

    await invoke(getHandler(deps.router));

    expect(correlateExecutionsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        spaceId: 'agent-3',
        watchIds: [SYSTEM_SECURITY_WATCH_FLOOR_ID, SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID],
      })
    );
  });

  it('restricts correlation to a single orchestrator when watchId is given', async () => {
    const deps = createDeps();
    registerListRunsRoute(deps);

    await invoke(getHandler(deps.router), { watchId: SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID });

    expect(correlateExecutionsMock).toHaveBeenCalledWith(
      expect.objectContaining({ watchIds: [SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID] })
    );
  });

  // The Deep Watch is a real managed watch and still not an orchestrator: kibana-phf4.5 sent its
  // lane to the Watch Floor (ADR-015) and left a beta triage stub behind, so it runs no lifecycle.
  it('returns no runs for a watchId that is not an orchestrator', async () => {
    correlateExecutionsMock.mockResolvedValue([]);
    const deps = createDeps();
    registerListRunsRoute(deps);

    await invoke(getHandler(deps.router), { watchId: SYSTEM_SECURITY_WATCH_DEEP_ID });

    expect(correlateExecutionsMock).toHaveBeenCalledWith(expect.objectContaining({ watchIds: [] }));
  });

  it('resolves readable discoveries as the calling user (S3)', async () => {
    const deps = createDeps();
    registerListRunsRoute(deps);

    await invoke(getHandler(deps.router));

    expect(findAttackDiscoveryAlertsMock).toHaveBeenCalledWith(
      expect.objectContaining({ http, ids: ['ad-1'], spaceId: 'agent-3' })
    );
  });

  it('excludes a run whose discovery the caller cannot read (S3)', async () => {
    findAttackDiscoveryAlertsMock.mockResolvedValue([]);
    const deps = createDeps();
    registerListRunsRoute(deps);

    const response = await invoke(getHandler(deps.router));

    expect(response.ok).toHaveBeenCalledWith({
      body: { runs: [], total: 0 },
      headers: enabledHeaders,
    });
  });

  it('does not call the AD find route when no run carries a correlation', async () => {
    correlateExecutionsMock.mockResolvedValue([correlatedExecution({ correlationId: '' })]);
    const deps = createDeps();
    registerListRunsRoute(deps);

    await invoke(getHandler(deps.router));

    expect(findAttackDiscoveryAlertsMock).not.toHaveBeenCalled();
  });

  it('returns a 503 when the workflows management client is unavailable', async () => {
    const deps = createDeps();
    (deps.getWorkflowsManagementClient as jest.Mock).mockReturnValue(undefined);
    registerListRunsRoute(deps);

    const response = await invoke(getHandler(deps.router));

    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 503 }));
  });

  it('returns a 500 when correlation throws', async () => {
    correlateExecutionsMock.mockRejectedValue(new Error('boom'));
    const deps = createDeps();
    registerListRunsRoute(deps);

    const response = await invoke(getHandler(deps.router));

    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500 }));
  });
});
