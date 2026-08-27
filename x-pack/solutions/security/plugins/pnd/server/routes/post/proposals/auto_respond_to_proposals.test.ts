/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockRouter } from '@kbn/core-http-router-server-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { ExecutionStatus, WorkflowsManagementApiActions } from '@kbn/workflows';
import {
  PND_AUTO_RESPOND_CHANNELS,
  PND_AUTO_RESPOND_RATIONALE_PREFIX,
  PND_PROPOSALS_AUTO_RESPOND_URL,
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
} from '@kbn/pnd-common';
import type { PndAutoRespondOrigin, WatchAutonomyLevel } from '@kbn/pnd-common';
import { createPendingGatesManagementClientMock } from '../../../lib/list_pending_pnd_gates/mocks';
import type { RouteDependencies } from '../../register_routes';
import { WorkflowsManagedReadForbiddenError } from '../../../services/watches/workflows_read_authz';
import { getLiveAutoRespondRouteAuthz } from '../../watches/watch_route_security';
import { registerAutoRespondToProposalsRoute } from './auto_respond_to_proposals';

const step = (stepId: string) => ({
  id: `exec-${stepId}`,
  startedAt: '2026-08-02T00:05:00.000Z',
  status: ExecutionStatus.WAITING_FOR_INPUT,
  stepId,
  workflowId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
  workflowRunId: `run-${stepId}`,
});

/** Each pending gate sits on its own parked run, the way re-triggered orchestrations produce them. */
const createManagementClient = (steps: Array<ReturnType<typeof step>>) => ({
  ...createPendingGatesManagementClientMock(
    steps.map((pending) => ({
      runId: pending.workflowRunId,
      stepExecutions: [pending],
    }))
  ),
  resumeWorkflowExecution: jest.fn().mockResolvedValue({ resumedBy: 'analyst' }),
});

const createDeps = (
  managementClient: ReturnType<typeof createManagementClient> | undefined,
  autonomyLevel: WatchAutonomyLevel = 'supervised'
) => {
  const router = mockRouter.create();
  const get = jest.fn().mockResolvedValue({
    settings: { autonomy: autonomyLevel },
    settingsRevision: null,
  });
  const deps = {
    config: { enabled: true, ui: { useMockData: false } },
    get,
    getSpaceId: jest.fn().mockReturnValue('agent-3'),
    getWatchesService: jest.fn().mockReturnValue({ get }),
    getWatchProjection: jest.fn(),
    getWorkflowsManagementClient: jest.fn().mockReturnValue(managementClient),
    logger: loggerMock.create(),
    router,
  } as unknown as RouteDependencies & {
    get: jest.Mock;
    router: ReturnType<typeof mockRouter.create>;
  };

  return deps;
};

const getHandler = (router: ReturnType<typeof mockRouter.create>) =>
  router.versioned.getRoute('post', PND_PROPOSALS_AUTO_RESPOND_URL).versions['1'].handler;

const invoke = async (
  handler: ReturnType<typeof getHandler>,
  {
    origin = 'dial' as PndAutoRespondOrigin,
    watchId = SYSTEM_SECURITY_WATCH_FLOOR_ID as string,
  } = {}
) => {
  const request = httpServerMock.createKibanaRequest({ body: { origin, watchId } });
  const response = httpServerMock.createResponseFactory();
  const context = {} as unknown as Parameters<typeof handler>[0];

  await handler(context, request, response);

  return response;
};

describe('registerAutoRespondToProposalsRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers the route gated on BOTH the autonomy-write and Workflows execute privileges (D1)', () => {
    const deps = createDeps(createManagementClient([]));

    registerAutoRespondToProposalsRoute(deps);

    expect(
      deps.router.versioned.getRoute('post', PND_PROPOSALS_AUTO_RESPOND_URL).config.security
    ).toEqual({
      authz: getLiveAutoRespondRouteAuthz(),
    });
  });

  it('requires managed-execution read so listing parked gates is not a Workflows RBAC side-channel', () => {
    const deps = createDeps(createManagementClient([]));

    registerAutoRespondToProposalsRoute(deps);

    const authz = deps.router.versioned.getRoute('post', PND_PROPOSALS_AUTO_RESPOND_URL).config
      .security?.authz;
    const required = authz != null && 'requiredPrivileges' in authz ? authz.requiredPrivileges : [];

    expect(required).toContain(WorkflowsManagementApiActions.readExecution);
    expect(required).toContain(WorkflowsManagementApiActions.readManagedExecution);
    expect(
      authz != null && 'extendedPrivileges' in authz ? authz.extendedPrivileges : undefined
    ).toBeUndefined();
  });

  it('auto-responds to a permitted gate at the current level', async () => {
    const managementClient = createManagementClient([step('await_promote_incident')]);
    const deps = createDeps(managementClient);
    registerAutoRespondToProposalsRoute(deps);

    const response = await invoke(getHandler(deps.router));

    expect(response.ok).toHaveBeenCalledWith({ body: { approved: 1, skipped: 0 } });
    expect(managementClient.resumeWorkflowExecution).toHaveBeenCalledTimes(1);
  });

  it('refuses both alwaysGate gates at the supervised level (S5)', async () => {
    const managementClient = createManagementClient([
      step('await_incident_contained'),
      step('await_promote_incident'),
    ]);
    const deps = createDeps(managementClient);
    registerAutoRespondToProposalsRoute(deps);

    const response = await invoke(getHandler(deps.router));

    expect(response.ok).toHaveBeenCalledWith({ body: { approved: 1, skipped: 1 } });
    expect(managementClient.resumeWorkflowExecution).toHaveBeenCalledTimes(1);
    expect(managementClient.resumeWorkflowExecution).toHaveBeenCalledWith(
      'run-await_promote_incident',
      'agent-3',
      expect.objectContaining({ decision: 'approve' }),
      expect.anything(),
      expect.objectContaining({ stepExecutionId: 'exec-await_promote_incident' })
    );
  });

  it('builds the resume payload from the registry autoApproveResponse plus the shared prefix (D12)', async () => {
    const managementClient = createManagementClient([step('await_promote_incident')]);
    const deps = createDeps(managementClient);
    registerAutoRespondToProposalsRoute(deps);

    await invoke(getHandler(deps.router));

    expect(managementClient.resumeWorkflowExecution).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      {
        decision: 'approve',
        rationale: `${PND_AUTO_RESPOND_RATIONALE_PREFIX}supervised (dial)`,
      },
      expect.anything(),
      expect.anything()
    );
  });

  it('stamps pnd-autonomy-dial when origin is dial', async () => {
    const managementClient = createManagementClient([step('await_promote_incident')]);
    const deps = createDeps(managementClient);
    registerAutoRespondToProposalsRoute(deps);

    await invoke(getHandler(deps.router), { origin: 'dial' });

    expect(managementClient.resumeWorkflowExecution).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ channel: PND_AUTO_RESPOND_CHANNELS.dial })
    );
  });

  it('stamps pnd-autonomy-auto when origin is auto', async () => {
    const managementClient = createManagementClient([step('await_promote_incident')]);
    const deps = createDeps(managementClient);
    registerAutoRespondToProposalsRoute(deps);

    await invoke(getHandler(deps.router), { origin: 'auto' });

    expect(managementClient.resumeWorkflowExecution).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        rationale: `${PND_AUTO_RESPOND_RATIONALE_PREFIX}supervised (auto)`,
      }),
      expect.anything(),
      expect.objectContaining({ channel: PND_AUTO_RESPOND_CHANNELS.auto })
    );
  });

  it('never resumes an alwaysGate gate even when it is the only pending gate (S5)', async () => {
    const managementClient = createManagementClient([step('await_incident_contained')]);
    const deps = createDeps(managementClient);
    registerAutoRespondToProposalsRoute(deps);

    const response = await invoke(getHandler(deps.router));

    expect(managementClient.resumeWorkflowExecution).not.toHaveBeenCalled();
    expect(response.ok).toHaveBeenCalledWith({ body: { approved: 0, skipped: 1 } });
  });

  it('scopes the listing and resume to the request space (S9)', async () => {
    const managementClient = createManagementClient([step('await_promote_incident')]);
    const deps = createDeps(managementClient);
    registerAutoRespondToProposalsRoute(deps);

    await invoke(getHandler(deps.router));

    expect(managementClient.getWorkflowExecutions).toHaveBeenCalledWith(
      expect.any(Object),
      'agent-3',
      expect.any(Object)
    );
  });

  it('reads only the requested watch, and never the workflow-space-blind listing (kibana-idjb.21)', async () => {
    const managementClient = createManagementClient([step('await_promote_incident')]);
    const deps = createDeps(managementClient);
    registerAutoRespondToProposalsRoute(deps);

    await invoke(getHandler(deps.router));

    expect(managementClient.getWorkflowExecutions).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowId: `${SYSTEM_SECURITY_WATCH_FLOOR_ID}-agent-3`,
      }),
      'agent-3',
      expect.any(Object)
    );
  });

  it('counts a resume failure as skipped rather than approved', async () => {
    const managementClient = createManagementClient([step('await_promote_incident')]);
    managementClient.resumeWorkflowExecution.mockRejectedValue(new Error('boom'));
    const deps = createDeps(managementClient);
    registerAutoRespondToProposalsRoute(deps);

    const response = await invoke(getHandler(deps.router));

    expect(response.ok).toHaveBeenCalledWith({ body: { approved: 0, skipped: 1 } });
  });

  it('rejects an unknown watch id with a 400', async () => {
    const deps = createDeps(createManagementClient([]));
    registerAutoRespondToProposalsRoute(deps);

    const response = await invoke(getHandler(deps.router), { watchId: '../../evil' });

    expect(response.badRequest).toHaveBeenCalledTimes(1);
  });

  it('returns a 503 when the workflows management client is unavailable', async () => {
    const deps = createDeps(undefined);
    registerAutoRespondToProposalsRoute(deps);

    const response = await invoke(getHandler(deps.router));

    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 503 }));
  });

  it('maps a managed-read forbidden error to 403 rather than a retried 500', async () => {
    const deps = createDeps(createManagementClient([]));
    deps.get.mockRejectedValue(new WorkflowsManagedReadForbiddenError());
    registerAutoRespondToProposalsRoute(deps);

    const response = await invoke(getHandler(deps.router));

    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  it('maps a managed-execution-read forbidden error from the gate listing to 403', async () => {
    const managementClient = createManagementClient([step('await_promote_incident')]);
    managementClient.getWorkflowExecutions.mockRejectedValue(
      new WorkflowsManagedReadForbiddenError()
    );
    const deps = createDeps(managementClient);
    registerAutoRespondToProposalsRoute(deps);

    const response = await invoke(getHandler(deps.router));

    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  it('returns a 500 when listing throws', async () => {
    const managementClient = createManagementClient([step('await_promote_incident')]);
    managementClient.getWorkflowExecutions.mockRejectedValue(new Error('boom'));
    const deps = createDeps(managementClient);
    registerAutoRespondToProposalsRoute(deps);

    const response = await invoke(getHandler(deps.router));

    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500 }));
  });
});
