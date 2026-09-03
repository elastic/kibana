/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscoveryApiAlert } from '@kbn/elastic-assistant-common';
import { mockRouter } from '@kbn/core-http-router-server-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import {
  PND_DETECTION_CHANGE_SIGNAL_EMIT_URL,
  PND_DETECTION_CHANGE_SIGNAL_TRIGGER_ID,
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
  SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
  deriveConversationIds,
} from '@kbn/pnd-common';
import { WorkflowsManagementApiActions } from '@kbn/workflows';

import { PND_API_PRIVILEGE_PROPOSALS_RESPOND } from '../../../../common/constants';
import type { RouteDependencies } from '../../register_routes';
import { findAttackDiscoveryAlerts } from '../../get/conversations/helpers/find_attack_discovery_alerts';
import { validateRegisteredBody } from '../../test_helpers/validate_registered_body';
import { registerEmitDetectionChangeSignalRoute } from './emit_detection_change_signal';

jest.mock('../../get/conversations/helpers/find_attack_discovery_alerts');

const findAttackDiscoveryAlertsMock = findAttackDiscoveryAlerts as jest.MockedFunction<
  typeof findAttackDiscoveryAlerts
>;

const createWorkflowsExtensions = () => {
  const emitEvent = jest.fn().mockResolvedValue(undefined);
  const getClient = jest.fn().mockResolvedValue({ emitEvent });
  return { emitEvent, getClient, workflowsExtensions: { getClient } };
};

const floorExecution = (overrides: Record<string, unknown> = {}) => ({
  context: { event: { attackDiscoveryAlertId: 'ad-1' } },
  id: 'run-1',
  workflowId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
  ...overrides,
});

const createManagementClient = (execution: unknown = floorExecution()) => ({
  getWorkflowExecution: jest.fn().mockResolvedValue(execution),
});

const createDeps = (
  workflowsExtensions?: ReturnType<typeof createWorkflowsExtensions>['workflowsExtensions'],
  managementClient: ReturnType<typeof createManagementClient> | undefined = createManagementClient()
) => {
  const router = mockRouter.create();
  const deps = {
    config: { demo: { forceIncident: false }, enabled: true, ui: { useMockData: false } },
    getSpaceId: jest.fn().mockReturnValue('agent-3'),
    getStartServices: jest.fn().mockResolvedValue([{ http: {} }, { workflowsExtensions }]),
    getWatchProjection: jest.fn(),
    getWorkflowsManagementClient: jest.fn().mockReturnValue(managementClient),
    logger: loggerMock.create(),
    router,
  } as unknown as RouteDependencies & {
    logger: ReturnType<typeof loggerMock.create>;
    router: ReturnType<typeof mockRouter.create>;
  };

  return deps;
};

const getHandler = (router: ReturnType<typeof mockRouter.create>) =>
  router.versioned.getRoute('post', PND_DETECTION_CHANGE_SIGNAL_EMIT_URL).versions['1'].handler;

const invoke = async (
  handler: ReturnType<typeof getHandler>,
  body: Record<string, unknown> = {
    correlationId: 'ad-1',
    gapDescription: 'Investigation concluded this is not an incident',
    sourceRunId: 'run-1',
  }
) => {
  const request = httpServerMock.createKibanaRequest({ body });
  const response = httpServerMock.createResponseFactory();
  const context = {} as unknown as Parameters<typeof handler>[0];

  await handler(context, request, response);

  return response;
};

describe('registerEmitDetectionChangeSignalRoute', () => {
  beforeEach(() => {
    findAttackDiscoveryAlertsMock.mockResolvedValue([
      { id: 'ad-1', mitre_attack_tactics: ['Persistence'] } as unknown as AttackDiscoveryApiAlert,
    ]);
  });

  it('requires BOTH the proposals-respond privilege AND the Workflows execute privilege', () => {
    const deps = createDeps();
    registerEmitDetectionChangeSignalRoute(deps);

    expect(
      deps.router.versioned.getRoute('post', PND_DETECTION_CHANGE_SIGNAL_EMIT_URL).config.security
    ).toEqual({
      authz: {
        requiredPrivileges: [
          PND_API_PRIVILEGE_PROPOSALS_RESPOND,
          WorkflowsManagementApiActions.execute,
        ],
      },
    });
  });

  it('is an internal route', () => {
    const deps = createDeps();
    registerEmitDetectionChangeSignalRoute(deps);

    expect(
      deps.router.versioned.getRoute('post', PND_DETECTION_CHANGE_SIGNAL_EMIT_URL).config.access
    ).toEqual('internal');
  });

  it('emits exactly one security.detectionChangeSignal', async () => {
    const wf = createWorkflowsExtensions();
    const deps = createDeps(wf.workflowsExtensions);
    registerEmitDetectionChangeSignalRoute(deps);

    await invoke(getHandler(deps.router));

    expect(
      wf.emitEvent.mock.calls.filter(([id]) => id === PND_DETECTION_CHANGE_SIGNAL_TRIGGER_ID)
    ).toHaveLength(1);
  });

  it('stamps the claim as coming from Watch Floor', async () => {
    const wf = createWorkflowsExtensions();
    const deps = createDeps(wf.workflowsExtensions);
    registerEmitDetectionChangeSignalRoute(deps);

    await invoke(getHandler(deps.router));

    expect(wf.emitEvent.mock.calls[0][1]).toEqual(
      expect.objectContaining({ sourceWatchId: SYSTEM_SECURITY_WATCH_FLOOR_ID })
    );
  });

  it('cites the investigation conversation, because this path never opens an incident', async () => {
    const wf = createWorkflowsExtensions();
    const deps = createDeps(wf.workflowsExtensions);
    registerEmitDetectionChangeSignalRoute(deps);

    await invoke(getHandler(deps.router));

    expect(wf.emitEvent.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        evidenceRefs: [
          { id: 'ad-1', kind: 'attack_discovery' },
          { id: deriveConversationIds('ad-1').investigationConversationId, kind: 'conversation' },
        ],
      })
    );
  });

  it('answers { emitted: true } when the claim fires', async () => {
    const wf = createWorkflowsExtensions();
    const deps = createDeps(wf.workflowsExtensions);
    registerEmitDetectionChangeSignalRoute(deps);

    const response = await invoke(getHandler(deps.router));

    expect(response.ok).toHaveBeenCalledWith({ body: { emitted: true } });
  });

  it('answers { emitted: false } when the claim cannot fire, rather than failing the Floor', async () => {
    const wf = createWorkflowsExtensions();
    wf.emitEvent.mockRejectedValue(new Error('workflows down'));
    const deps = createDeps(wf.workflowsExtensions);
    registerEmitDetectionChangeSignalRoute(deps);

    const response = await invoke(getHandler(deps.router));

    expect(response.ok).toHaveBeenCalledWith({ body: { emitted: false } });
  });

  it('answers 503 when the workflows management client is unavailable', async () => {
    const deps = createDeps(createWorkflowsExtensions().workflowsExtensions);
    (deps.getWorkflowsManagementClient as jest.Mock).mockReturnValue(undefined);
    registerEmitDetectionChangeSignalRoute(deps);

    const response = await invoke(getHandler(deps.router));

    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 503 }));
  });

  it('answers 404 when the named run is not a Floor execution', async () => {
    const wf = createWorkflowsExtensions();
    const deps = createDeps(
      wf.workflowsExtensions,
      createManagementClient(floorExecution({ workflowId: SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID }))
    );
    registerEmitDetectionChangeSignalRoute(deps);

    const response = await invoke(getHandler(deps.router));

    expect(response.notFound).toHaveBeenCalledTimes(1);
    expect(wf.emitEvent).not.toHaveBeenCalled();
  });

  it('answers 404 when the caller cannot read the discovery', async () => {
    findAttackDiscoveryAlertsMock.mockResolvedValue([]);
    const wf = createWorkflowsExtensions();
    const deps = createDeps(wf.workflowsExtensions);
    registerEmitDetectionChangeSignalRoute(deps);

    const response = await invoke(getHandler(deps.router));

    expect(response.notFound).toHaveBeenCalledTimes(1);
    expect(wf.emitEvent).not.toHaveBeenCalled();
  });
});

describe('registerEmitDetectionChangeSignalRoute — request body validation', () => {
  const validate = (body: unknown) => {
    const deps = createDeps();
    registerEmitDetectionChangeSignalRoute(deps);

    return validateRegisteredBody({
      body,
      route: deps.router.versioned.getRoute('post', PND_DETECTION_CHANGE_SIGNAL_EMIT_URL),
    });
  };

  it('accepts the three required fields', () => {
    expect(
      validate({
        correlationId: 'ad-1',
        gapDescription: 'not an incident',
        sourceRunId: 'run-1',
      })
    ).toBeUndefined();
  });

  it('rejects a body missing gapDescription', () => {
    expect(validate({ correlationId: 'ad-1', sourceRunId: 'run-1' })).toBeInstanceOf(Error);
  });
});
