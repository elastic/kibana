/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RouteValidationError } from '@kbn/core-http-server';
import { mockRouter } from '@kbn/core-http-router-server-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { AttackDiscoveryApiAlert } from '@kbn/elastic-assistant-common';
import { loggerMock } from '@kbn/logging-mocks';
import {
  PND_DETECTION_CHANGE_SIGNAL_TRIGGER_ID,
  PND_INCIDENT_CLOSED_TRIGGER_ID,
  PND_PROPOSAL_RESPOND_URL_TEMPLATE,
  RespondToProposalRequestBody,
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
  buildProposalRespondUrl,
  deriveConversationIds,
} from '@kbn/pnd-common';
import { WorkflowsManagementApiActions } from '@kbn/workflows';
import { WorkflowExecutionInvalidStatusError } from '@kbn/workflows/common/errors';
import { PND_API_PRIVILEGE_PROPOSALS_RESPOND } from '../../../../common/constants';
import type { RouteDependencies } from '../../register_routes';
import { findAttackDiscoveryAlerts } from '../../get/conversations/helpers/find_attack_discovery_alerts';
import { validateRegisteredBody } from '../../test_helpers/validate_registered_body';
import { registerRespondToProposalRoute } from './respond_to_proposal';

jest.mock('../../get/conversations/helpers/find_attack_discovery_alerts');

const findAttackDiscoveryAlertsMock = findAttackDiscoveryAlerts as jest.MockedFunction<
  typeof findAttackDiscoveryAlerts
>;

const SOURCE_ID = `${SYSTEM_SECURITY_WATCH_FLOOR_ID}:run-1:step-exec-1`;

const execution = (overrides = {}) => ({
  context: {},
  id: 'run-1',
  stepExecutions: [
    { id: 'step-exec-1', status: 'waiting_for_input', stepId: 'await_open_investigation' },
  ],
  workflowId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
  ...overrides,
});

/** A Watch Floor execution paused at the containment gate, carrying an AD id on its event. */
const containmentExecution = () =>
  execution({
    context: { event: { correlationId: 'ad-1' } },
    stepExecutions: [
      { id: 'step-exec-1', status: 'waiting_for_input', stepId: 'await_incident_contained' },
    ],
  });

/** A Watch Floor execution paused at the promote-incident gate. */
const promoteIncidentExecution = () =>
  execution({
    context: { event: { correlationId: 'ad-1' } },
    stepExecutions: [
      { id: 'step-exec-1', status: 'waiting_for_input', stepId: 'await_promote_incident' },
    ],
  });

/** A Watch Floor execution paused at the open-investigation gate, with an AD id on its event. */
const openInvestigationExecution = () =>
  execution({
    context: { event: { correlationId: 'ad-1' } },
    stepExecutions: [
      { id: 'step-exec-1', status: 'waiting_for_input', stepId: 'await_open_investigation' },
    ],
  });

/**
 * The same run as it looks after a **manually-run** Watch Floor (`watch_floor.yaml`'s
 * `- type: manual` trigger): no `context.event`, so no `correlationId` (finding R4).
 */
const manuallyRunContainmentExecution = () =>
  execution({
    context: {},
    stepExecutions: [
      { id: 'step-exec-1', status: 'waiting_for_input', stepId: 'await_incident_contained' },
    ],
  });

const createManagementClient = () => ({
  getWorkflowExecution: jest.fn().mockResolvedValue(execution()),
  resumeWorkflowExecution: jest.fn().mockResolvedValue({ resumedBy: 'analyst' }),
});

const createWorkflowsExtensions = () => {
  const emitEvent = jest.fn().mockResolvedValue(undefined);
  const getClient = jest.fn().mockResolvedValue({ emitEvent });
  return { emitEvent, getClient, workflowsExtensions: { getClient } };
};

const createDeps = (
  managementClient: ReturnType<typeof createManagementClient> | undefined,
  workflowsExtensions?: ReturnType<typeof createWorkflowsExtensions>['workflowsExtensions']
) => {
  const router = mockRouter.create();
  const deps = {
    config: { demo: { forceIncident: false }, enabled: true, ui: { useMockData: false } },
    getSpaceId: jest.fn().mockReturnValue('agent-3'),
    getStartServices: jest.fn().mockResolvedValue([{}, { workflowsExtensions }]),
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
  router.versioned.getRoute('post', PND_PROPOSAL_RESPOND_URL_TEMPLATE).versions['1'].handler;

/** Run the body validation the route registered — the real source of D2's 400. */
const rejection = (router: ReturnType<typeof mockRouter.create>, body: unknown) =>
  validateRegisteredBody({
    body,
    route: router.versioned.getRoute('post', PND_PROPOSAL_RESPOND_URL_TEMPLATE),
  });

const invoke = async (
  handler: ReturnType<typeof getHandler>,
  {
    body = { input: { decision: 'approve', rationale: 'looks good' } },
    sourceId = SOURCE_ID,
  }: { body?: { input: Record<string, unknown> }; sourceId?: string } = {}
) => {
  const request = httpServerMock.createKibanaRequest({ body, params: { sourceId } });
  const response = httpServerMock.createResponseFactory();
  const context = {} as unknown as Parameters<typeof handler>[0];

  await handler(context, request, response);

  return response;
};

/** The payload the route emitted for one trigger id, or `undefined` when it emitted none. */
const emittedPayloadFor = (emitEvent: jest.Mock, triggerId: string): unknown =>
  emitEvent.mock.calls.find(([id]) => id === triggerId)?.[1];

/**
 * Fail exactly one of the two signals, so a test can prove the other still fires. One shared
 * `emitEvent` mock is what the engine really is, so this keys on the trigger id rather than on call
 * order — the two emits are concurrent and order is not a contract.
 */
const failOnly = (emitEvent: jest.Mock, triggerId: string) =>
  emitEvent.mockImplementation(async (id: string) => {
    if (id === triggerId) {
      throw new Error(`${id} is down`);
    }
  });

beforeEach(() => {
  findAttackDiscoveryAlertsMock.mockResolvedValue([
    { id: 'ad-1', mitre_attack_tactics: ['Initial Access'] } as unknown as AttackDiscoveryApiAlert,
  ]);
});

describe('registerRespondToProposalRoute', () => {
  it('requires both the PND respond privilege and the Workflows execute privilege', () => {
    const deps = createDeps(createManagementClient());

    registerRespondToProposalRoute(deps);

    expect(
      deps.router.versioned.getRoute('post', PND_PROPOSAL_RESPOND_URL_TEMPLATE).config.security
    ).toEqual({
      authz: {
        requiredPrivileges: [
          PND_API_PRIVILEGE_PROPOSALS_RESPOND,
          WorkflowsManagementApiActions.execute,
        ],
      },
    });
  });

  it('resumes the workflow through resumeWorkflowExecution for a valid gate', async () => {
    const managementClient = createManagementClient();
    const deps = createDeps(managementClient);
    registerRespondToProposalRoute(deps);

    await invoke(getHandler(deps.router));

    expect(managementClient.resumeWorkflowExecution).toHaveBeenCalledWith(
      'run-1',
      'agent-3',
      { decision: 'approve', rationale: 'looks good' },
      expect.anything(),
      { channel: 'pnd', stepExecutionId: 'step-exec-1' }
    );
  });

  it('forwards only decision and rationale even when extra input keys arrive', async () => {
    const managementClient = createManagementClient();
    const deps = createDeps(managementClient);
    registerRespondToProposalRoute(deps);

    await invoke(getHandler(deps.router), {
      body: {
        input: { decision: 'approve', rationale: 'looks good', ruleId: 'rule-1' },
      },
    });

    expect(managementClient.resumeWorkflowExecution).toHaveBeenCalledWith(
      'run-1',
      'agent-3',
      { decision: 'approve', rationale: 'looks good' },
      expect.anything(),
      { channel: 'pnd', stepExecutionId: 'step-exec-1' }
    );
  });

  it('returns { resumed: true } on success', async () => {
    const deps = createDeps(createManagementClient());
    registerRespondToProposalRoute(deps);

    const response = await invoke(getHandler(deps.router));

    expect(response.ok).toHaveBeenCalledWith({ body: { resumed: true, sourceId: SOURCE_ID } });
  });

  it('accepts a source id whose workflow id is the per-space document id (S1)', async () => {
    const documentId = `${SYSTEM_SECURITY_WATCH_FLOOR_ID}-agent-3`;
    const managementClient = createManagementClient();
    managementClient.getWorkflowExecution.mockResolvedValue(execution({ workflowId: documentId }));
    const deps = createDeps(managementClient);
    registerRespondToProposalRoute(deps);

    const response = await invoke(getHandler(deps.router), {
      sourceId: `${documentId}:run-1:step-exec-1`,
    });

    expect(response.ok).toHaveBeenCalledWith({
      body: { resumed: true, sourceId: `${documentId}:run-1:step-exec-1` },
    });
  });

  it('rejects a catalog-looking document id that is not this space (S1)', async () => {
    const managementClient = createManagementClient();
    const deps = createDeps(managementClient);
    registerRespondToProposalRoute(deps);

    const response = await invoke(getHandler(deps.router), {
      sourceId: `${SYSTEM_SECURITY_WATCH_FLOOR_ID}-evil:run-1:step-exec-1`,
    });

    expect(response.badRequest).toHaveBeenCalledTimes(1);
    expect(managementClient.getWorkflowExecution).not.toHaveBeenCalled();
  });

  it('rejects a source id whose workflow id is outside the allow-list (S1)', async () => {
    const managementClient = createManagementClient();
    const deps = createDeps(managementClient);
    registerRespondToProposalRoute(deps);

    const response = await invoke(getHandler(deps.router), {
      sourceId: 'made-up-workflow:run-1:step-exec-1',
    });

    expect(response.badRequest).toHaveBeenCalledTimes(1);
    expect(managementClient.resumeWorkflowExecution).not.toHaveBeenCalled();
  });

  it('does not touch the management client for a non-allow-listed workflow id', async () => {
    const managementClient = createManagementClient();
    const deps = createDeps(managementClient);
    registerRespondToProposalRoute(deps);

    await invoke(getHandler(deps.router), { sourceId: 'made-up-workflow:run-1:step-exec-1' });

    expect(managementClient.getWorkflowExecution).not.toHaveBeenCalled();
  });

  it('rejects a malformed source id with a 400', async () => {
    const deps = createDeps(createManagementClient());
    registerRespondToProposalRoute(deps);

    const response = await invoke(getHandler(deps.router), { sourceId: 'not-a-source-id' });

    expect(response.badRequest).toHaveBeenCalledTimes(1);
  });

  it('returns 403 when the run belongs to a non-PND workflow (forged source id, S1)', async () => {
    const managementClient = createManagementClient();
    managementClient.getWorkflowExecution.mockResolvedValue(
      execution({ workflowId: 'some-other-workflow' })
    );
    const deps = createDeps(managementClient);
    registerRespondToProposalRoute(deps);

    const response = await invoke(getHandler(deps.router));

    expect(response.forbidden).toHaveBeenCalledTimes(1);
    expect(managementClient.resumeWorkflowExecution).not.toHaveBeenCalled();
  });

  it('rejects an unknown gate step id with a 400', async () => {
    const managementClient = createManagementClient();
    managementClient.getWorkflowExecution.mockResolvedValue(
      execution({
        stepExecutions: [{ id: 'step-exec-1', status: 'waiting_for_input', stepId: 'not_a_gate' }],
      })
    );
    const deps = createDeps(managementClient);
    registerRespondToProposalRoute(deps);

    const response = await invoke(getHandler(deps.router));

    expect(response.badRequest).toHaveBeenCalledTimes(1);
  });

  it('returns 404 when the execution is not found in the space', async () => {
    const managementClient = createManagementClient();
    managementClient.getWorkflowExecution.mockResolvedValue(null);
    const deps = createDeps(managementClient);
    registerRespondToProposalRoute(deps);

    const response = await invoke(getHandler(deps.router));

    expect(response.notFound).toHaveBeenCalledTimes(1);
  });

  it('returns 409 when the gate is no longer pending', async () => {
    const managementClient = createManagementClient();
    managementClient.getWorkflowExecution.mockResolvedValue(
      execution({
        stepExecutions: [
          { id: 'step-exec-1', status: 'completed', stepId: 'await_open_investigation' },
        ],
      })
    );
    const deps = createDeps(managementClient);
    registerRespondToProposalRoute(deps);

    const response = await invoke(getHandler(deps.router));

    expect(response.conflict).toHaveBeenCalledTimes(1);
  });

  it('maps a first-writer-wins resume conflict to a 409', async () => {
    const managementClient = createManagementClient();
    managementClient.resumeWorkflowExecution.mockRejectedValue(
      new WorkflowExecutionInvalidStatusError('run-1', 'running', 'waiting_for_input')
    );
    const deps = createDeps(managementClient);
    registerRespondToProposalRoute(deps);

    const response = await invoke(getHandler(deps.router));

    expect(response.conflict).toHaveBeenCalledTimes(1);
  });

  it('returns a 503 when the workflows management client is unavailable', async () => {
    const deps = createDeps(undefined);
    registerRespondToProposalRoute(deps);

    const response = await invoke(getHandler(deps.router));

    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 503 }));
  });

  it('builds a respond url that round-trips to the same template', () => {
    expect(buildProposalRespondUrl(SOURCE_ID)).toContain('/_respond');
  });
});

describe('registerRespondToProposalRoute — pnd.incidentClosed emission (P3/D14)', () => {
  it('emits exactly one pnd.incidentClosed when the containment gate is approved', async () => {
    const managementClient = createManagementClient();
    managementClient.getWorkflowExecution.mockResolvedValue(containmentExecution());
    const wf = createWorkflowsExtensions();
    const deps = createDeps(managementClient, wf.workflowsExtensions);
    registerRespondToProposalRoute(deps);

    await invoke(getHandler(deps.router), {
      body: { input: { decision: 'approve', rationale: 'contained' } },
    });

    expect(
      wf.emitEvent.mock.calls.filter(([id]) => id === PND_INCIDENT_CLOSED_TRIGGER_ID)
    ).toHaveLength(1);
  });

  it('lands the event in the caller space with only ids and non-sensitive metadata (S6)', async () => {
    const managementClient = createManagementClient();
    managementClient.getWorkflowExecution.mockResolvedValue(containmentExecution());
    const wf = createWorkflowsExtensions();
    const deps = createDeps(managementClient, wf.workflowsExtensions);
    registerRespondToProposalRoute(deps);

    await invoke(getHandler(deps.router), {
      body: { input: { decision: 'approve', rationale: 'contained' } },
    });

    expect(wf.emitEvent).toHaveBeenCalledWith('pnd.incidentClosed', {
      correlationId: 'ad-1',
      incidentConversationId: deriveConversationIds('ad-1').incidentConversationId,
      spaceId: 'agent-3',
      watchId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
    });
  });

  // Approving a non-containment gate is not terminal — the run continues — so the
  // lifecycle fact does not fire.
  it('emits nothing when a non-containment gate is approved', async () => {
    const managementClient = createManagementClient();
    const wf = createWorkflowsExtensions();
    const deps = createDeps(managementClient, wf.workflowsExtensions);
    registerRespondToProposalRoute(deps);

    await invoke(getHandler(deps.router));

    expect(wf.emitEvent).not.toHaveBeenCalled();
  });

  // `pnd.incidentClosed` is the lifecycle fact. A declined containment is not an incident
  // closing, so the fact does not fire — the coverage-gap claim still can.
  it('does not emit pnd.incidentClosed when the containment gate is dismissed', async () => {
    const managementClient = createManagementClient();
    managementClient.getWorkflowExecution.mockResolvedValue(containmentExecution());
    const wf = createWorkflowsExtensions();
    const deps = createDeps(managementClient, wf.workflowsExtensions);
    registerRespondToProposalRoute(deps);

    await invoke(getHandler(deps.router), {
      body: { input: { decision: 'dismiss', rationale: 'not contained yet' } },
    });

    expect(
      wf.emitEvent.mock.calls.filter(([id]) => id === PND_INCIDENT_CLOSED_TRIGGER_ID)
    ).toHaveLength(0);
  });

  it('still resumes the run when the containment gate is dismissed', async () => {
    const managementClient = createManagementClient();
    managementClient.getWorkflowExecution.mockResolvedValue(containmentExecution());
    const wf = createWorkflowsExtensions();
    const deps = createDeps(managementClient, wf.workflowsExtensions);
    registerRespondToProposalRoute(deps);

    const response = await invoke(getHandler(deps.router), {
      body: { input: { decision: 'dismiss', rationale: 'not contained yet' } },
    });

    expect(response.ok).toHaveBeenCalledWith({ body: { resumed: true, sourceId: SOURCE_ID } });
  });

  it('still resumes successfully when the emit fails (a Workflows failure must not fail the resume)', async () => {
    const managementClient = createManagementClient();
    managementClient.getWorkflowExecution.mockResolvedValue(containmentExecution());
    const wf = createWorkflowsExtensions();
    wf.emitEvent.mockRejectedValue(new Error('workflows down'));
    const deps = createDeps(managementClient, wf.workflowsExtensions);
    registerRespondToProposalRoute(deps);

    const response = await invoke(getHandler(deps.router), {
      body: { input: { decision: 'approve', rationale: 'contained' } },
    });

    expect(response.ok).toHaveBeenCalledWith({ body: { resumed: true, sourceId: SOURCE_ID } });
  });
});

describe('registerRespondToProposalRoute — security.detectionChangeSignal emission', () => {
  const approveContainment = {
    input: { decision: 'approve', rationale: 'No rule covers the persistence this incident used' },
  };

  const registerAtContainment = () => {
    const managementClient = createManagementClient();
    managementClient.getWorkflowExecution.mockResolvedValue(containmentExecution());
    const wf = createWorkflowsExtensions();
    const deps = createDeps(managementClient, wf.workflowsExtensions);
    registerRespondToProposalRoute(deps);

    return { deps, wf };
  };

  it('emits exactly one security.detectionChangeSignal when the containment gate is approved', async () => {
    const { deps, wf } = registerAtContainment();

    await invoke(getHandler(deps.router), { body: approveContainment });

    expect(
      wf.emitEvent.mock.calls.filter(([id]) => id === PND_DETECTION_CHANGE_SIGNAL_TRIGGER_ID)
    ).toHaveLength(1);
  });

  it('emits both signals on containment, because the lifecycle fact and the claim are separate', async () => {
    const { deps, wf } = registerAtContainment();

    await invoke(getHandler(deps.router), { body: approveContainment });

    expect(wf.emitEvent.mock.calls.map(([id]) => id).sort()).toEqual(
      [PND_DETECTION_CHANGE_SIGNAL_TRIGGER_ID, PND_INCIDENT_CLOSED_TRIGGER_ID].sort()
    );
  });

  it('carries the whole claim: refs, the analyst rationale, the discovery tactics, and no more', async () => {
    const { deps, wf } = registerAtContainment();

    await invoke(getHandler(deps.router), { body: approveContainment });

    expect(emittedPayloadFor(wf.emitEvent, PND_DETECTION_CHANGE_SIGNAL_TRIGGER_ID)).toEqual({
      evidenceRefs: [
        { id: 'ad-1', kind: 'attack_discovery' },
        { id: deriveConversationIds('ad-1').incidentConversationId, kind: 'conversation' },
      ],
      gapDescription: 'No rule covers the persistence this incident used',
      sourceRunId: 'run-1',
      sourceWatchId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
      spaceId: 'agent-3',
      tactics: ['Initial Access'],
    });
  });

  // No LLM anywhere in the payload construction: the tactics are a projection of a document the
  // caller can read, resolved over `_find?ids=` with their own privileges (S3).
  it('takes the tactics from the attack discovery, resolved as the calling user (S3)', async () => {
    const { deps } = registerAtContainment();

    await invoke(getHandler(deps.router), { body: approveContainment });

    expect(findAttackDiscoveryAlertsMock).toHaveBeenCalledWith(
      expect.objectContaining({ ids: ['ad-1'], spaceId: 'agent-3' })
    );
  });

  it('emits nothing when a non-containment gate is approved', async () => {
    const managementClient = createManagementClient();
    const wf = createWorkflowsExtensions();
    const deps = createDeps(managementClient, wf.workflowsExtensions);
    registerRespondToProposalRoute(deps);

    await invoke(getHandler(deps.router));

    expect(wf.emitEvent).not.toHaveBeenCalled();
  });

  it('emits the claim when the containment gate is dismissed', async () => {
    const { deps, wf } = registerAtContainment();

    await invoke(getHandler(deps.router), {
      body: { input: { decision: 'dismiss', rationale: 'not contained yet' } },
    });

    expect(
      wf.emitEvent.mock.calls.filter(([id]) => id === PND_DETECTION_CHANGE_SIGNAL_TRIGGER_ID)
    ).toHaveLength(1);
  });

  it('does not emit pnd.incidentClosed when the containment gate is dismissed', async () => {
    const { deps, wf } = registerAtContainment();

    await invoke(getHandler(deps.router), {
      body: { input: { decision: 'dismiss', rationale: 'not contained yet' } },
    });

    expect(
      wf.emitEvent.mock.calls.filter(([id]) => id === PND_INCIDENT_CLOSED_TRIGGER_ID)
    ).toHaveLength(0);
  });

  it('still resumes successfully when the claim cannot be emitted', async () => {
    const { deps, wf } = registerAtContainment();
    failOnly(wf.emitEvent, PND_DETECTION_CHANGE_SIGNAL_TRIGGER_ID);

    const response = await invoke(getHandler(deps.router), { body: approveContainment });

    expect(response.ok).toHaveBeenCalledWith({ body: { resumed: true, sourceId: SOURCE_ID } });
  });
});

describe('registerRespondToProposalRoute — coverage-gap claim at investigation terminals', () => {
  const dismiss = {
    input: { decision: 'dismiss', rationale: 'known false positive, no coverage gap to close' },
  };

  it('emits the claim when opening an investigation is dismissed', async () => {
    const managementClient = createManagementClient();
    managementClient.getWorkflowExecution.mockResolvedValue(openInvestigationExecution());
    const wf = createWorkflowsExtensions();
    const deps = createDeps(managementClient, wf.workflowsExtensions);
    registerRespondToProposalRoute(deps);

    await invoke(getHandler(deps.router), { body: dismiss });

    expect(
      wf.emitEvent.mock.calls.filter(([id]) => id === PND_DETECTION_CHANGE_SIGNAL_TRIGGER_ID)
    ).toHaveLength(1);
  });

  it('cites the investigation conversation when opening an investigation is dismissed', async () => {
    const managementClient = createManagementClient();
    managementClient.getWorkflowExecution.mockResolvedValue(openInvestigationExecution());
    const wf = createWorkflowsExtensions();
    const deps = createDeps(managementClient, wf.workflowsExtensions);
    registerRespondToProposalRoute(deps);

    await invoke(getHandler(deps.router), { body: dismiss });

    expect(emittedPayloadFor(wf.emitEvent, PND_DETECTION_CHANGE_SIGNAL_TRIGGER_ID)).toEqual(
      expect.objectContaining({
        evidenceRefs: [
          { id: 'ad-1', kind: 'attack_discovery' },
          { id: deriveConversationIds('ad-1').investigationConversationId, kind: 'conversation' },
        ],
        gapDescription: 'known false positive, no coverage gap to close',
      })
    );
  });

  it('does not emit pnd.incidentClosed when opening an investigation is dismissed', async () => {
    const managementClient = createManagementClient();
    managementClient.getWorkflowExecution.mockResolvedValue(openInvestigationExecution());
    const wf = createWorkflowsExtensions();
    const deps = createDeps(managementClient, wf.workflowsExtensions);
    registerRespondToProposalRoute(deps);

    await invoke(getHandler(deps.router), { body: dismiss });

    expect(
      wf.emitEvent.mock.calls.filter(([id]) => id === PND_INCIDENT_CLOSED_TRIGGER_ID)
    ).toHaveLength(0);
  });

  it('emits the claim when promoting an incident is dismissed', async () => {
    const managementClient = createManagementClient();
    managementClient.getWorkflowExecution.mockResolvedValue(promoteIncidentExecution());
    const wf = createWorkflowsExtensions();
    const deps = createDeps(managementClient, wf.workflowsExtensions);
    registerRespondToProposalRoute(deps);

    await invoke(getHandler(deps.router), { body: dismiss });

    expect(
      wf.emitEvent.mock.calls.filter(([id]) => id === PND_DETECTION_CHANGE_SIGNAL_TRIGGER_ID)
    ).toHaveLength(1);
  });

  it('does not emit the claim when promoting an incident is approved', async () => {
    const managementClient = createManagementClient();
    managementClient.getWorkflowExecution.mockResolvedValue(promoteIncidentExecution());
    const wf = createWorkflowsExtensions();
    const deps = createDeps(managementClient, wf.workflowsExtensions);
    registerRespondToProposalRoute(deps);

    await invoke(getHandler(deps.router), {
      body: { input: { decision: 'approve', rationale: 'real incident' } },
    });

    expect(wf.emitEvent).not.toHaveBeenCalled();
  });
});

// The AC this describe exists for: the two emits must be independent. A gap claim is worth having
// when the lifecycle emit fails, and the lifecycle fact is worth recording when the claim cannot be
// built — so neither may be sequenced behind the other's success.
describe('registerRespondToProposalRoute — the two containment signals are independent', () => {
  const approveContainment = { input: { decision: 'approve', rationale: 'contained' } };

  const registerAtContainment = () => {
    const managementClient = createManagementClient();
    managementClient.getWorkflowExecution.mockResolvedValue(containmentExecution());
    const wf = createWorkflowsExtensions();
    const deps = createDeps(managementClient, wf.workflowsExtensions);
    registerRespondToProposalRoute(deps);

    return { deps, wf };
  };

  it('still emits the detection change signal when pnd.incidentClosed fails', async () => {
    const { deps, wf } = registerAtContainment();
    failOnly(wf.emitEvent, PND_INCIDENT_CLOSED_TRIGGER_ID);

    await invoke(getHandler(deps.router), { body: approveContainment });

    expect(emittedPayloadFor(wf.emitEvent, PND_DETECTION_CHANGE_SIGNAL_TRIGGER_ID)).toBeDefined();
  });

  it('still emits pnd.incidentClosed when the detection change signal fails', async () => {
    const { deps, wf } = registerAtContainment();
    failOnly(wf.emitEvent, PND_DETECTION_CHANGE_SIGNAL_TRIGGER_ID);

    await invoke(getHandler(deps.router), { body: approveContainment });

    expect(emittedPayloadFor(wf.emitEvent, PND_INCIDENT_CLOSED_TRIGGER_ID)).toBeDefined();
  });

  it('names only the signal that failed, so the log does not implicate the one that fired', async () => {
    const { deps, wf } = registerAtContainment();
    failOnly(wf.emitEvent, PND_DETECTION_CHANGE_SIGNAL_TRIGGER_ID);

    await invoke(getHandler(deps.router), { body: approveContainment });

    expect(loggerMock.collect(deps.logger).warn).toEqual([
      [expect.stringContaining(PND_DETECTION_CHANGE_SIGNAL_TRIGGER_ID)],
    ]);
  });

  // A failure to resolve the discovery's tactics degrades the claim, it does not drop it: `tactics`
  // is permitted to be empty precisely so an unreadable discovery costs the ATT&CK labels only.
  it('still emits the claim when the tactics cannot be resolved', async () => {
    const { deps, wf } = registerAtContainment();
    findAttackDiscoveryAlertsMock.mockRejectedValue(new Error('_find unreachable'));

    await invoke(getHandler(deps.router), { body: approveContainment });

    expect(emittedPayloadFor(wf.emitEvent, PND_DETECTION_CHANGE_SIGNAL_TRIGGER_ID)).toEqual(
      expect.objectContaining({ tactics: [] })
    );
  });
});

// Finding R4: on a manually-run Watch Floor the resumed execution has no `correlationId`,
// so the emit could only ever fail its `min(1)` validation. It used to be swallowed whole: the
// analyst got `{ resumed: true }`, the Detection Watch was never woken, and nothing said so.
describe('registerRespondToProposalRoute — containment resume on a manually-run watch (R4)', () => {
  const approveContainment = { input: { decision: 'approve', rationale: 'contained' } };

  it('still returns { resumed: true }, because the resume genuinely succeeded', async () => {
    const managementClient = createManagementClient();
    managementClient.getWorkflowExecution.mockResolvedValue(manuallyRunContainmentExecution());
    const wf = createWorkflowsExtensions();
    const deps = createDeps(managementClient, wf.workflowsExtensions);
    registerRespondToProposalRoute(deps);

    const response = await invoke(getHandler(deps.router), { body: approveContainment });

    expect(response.ok).toHaveBeenCalledWith({ body: { resumed: true, sourceId: SOURCE_ID } });
  });

  it('does not attempt an emit that could only fail the trigger schema', async () => {
    const managementClient = createManagementClient();
    managementClient.getWorkflowExecution.mockResolvedValue(manuallyRunContainmentExecution());
    const wf = createWorkflowsExtensions();
    const deps = createDeps(managementClient, wf.workflowsExtensions);
    registerRespondToProposalRoute(deps);

    await invoke(getHandler(deps.router), { body: approveContainment });

    expect(wf.emitEvent).not.toHaveBeenCalled();
  });

  it('warns that the proposal was resumed but the signal did not fire', async () => {
    const managementClient = createManagementClient();
    managementClient.getWorkflowExecution.mockResolvedValue(manuallyRunContainmentExecution());
    const wf = createWorkflowsExtensions();
    const deps = createDeps(managementClient, wf.workflowsExtensions);
    registerRespondToProposalRoute(deps);

    await invoke(getHandler(deps.router), { body: approveContainment });

    expect(loggerMock.collect(deps.logger).warn).toContainEqual([
      expect.stringContaining(SOURCE_ID),
    ]);
  });

  it('names the reason the signal did not fire', async () => {
    const managementClient = createManagementClient();
    managementClient.getWorkflowExecution.mockResolvedValue(manuallyRunContainmentExecution());
    const wf = createWorkflowsExtensions();
    const deps = createDeps(managementClient, wf.workflowsExtensions);
    registerRespondToProposalRoute(deps);

    await invoke(getHandler(deps.router), { body: approveContainment });

    expect(loggerMock.collect(deps.logger).warn).toContainEqual([
      expect.stringContaining('missing_attack_discovery_alert_id'),
    ]);
  });

  it('warns when the emit itself fails, so a swallowed Workflows failure is still visible', async () => {
    const managementClient = createManagementClient();
    managementClient.getWorkflowExecution.mockResolvedValue(containmentExecution());
    const wf = createWorkflowsExtensions();
    wf.emitEvent.mockRejectedValue(new Error('workflows down'));
    const deps = createDeps(managementClient, wf.workflowsExtensions);
    registerRespondToProposalRoute(deps);

    await invoke(getHandler(deps.router), { body: approveContainment });

    expect(loggerMock.collect(deps.logger).warn).toContainEqual([
      expect.stringContaining('emit_failed'),
    ]);
  });

  it('stays silent when the emit succeeds', async () => {
    const managementClient = createManagementClient();
    managementClient.getWorkflowExecution.mockResolvedValue(containmentExecution());
    const wf = createWorkflowsExtensions();
    const deps = createDeps(managementClient, wf.workflowsExtensions);
    registerRespondToProposalRoute(deps);

    await invoke(getHandler(deps.router), { body: approveContainment });

    expect(deps.logger.warn).not.toHaveBeenCalled();
  });
});

describe('registerRespondToProposalRoute — decision validation at the route boundary (D2)', () => {
  // Every one of these used to proceed as an APPROVAL: the body was a catchall carrying only a
  // required `rationale`, while the orchestrator YAMLs only ever match `decision : "dismiss"`.
  it.each([
    ['a body carrying only a rationale', { input: { rationale: 'looks good' } }],
    ['a capitalized "Dismiss"', { input: { decision: 'Dismiss', rationale: 'no' } }],
    ['an unknown decision', { input: { decision: 'maybe', rationale: 'unsure' } }],
    ['a null decision', { input: { decision: null, rationale: 'unsure' } }],
    ['a non-string decision', { input: { decision: true, rationale: 'unsure' } }],
    ['a missing input', {}],
  ])('rejects %s', (_label, body) => {
    const deps = createDeps(createManagementClient());
    registerRespondToProposalRoute(deps);

    expect(rejection(deps.router, body)).toBeInstanceOf(RouteValidationError);
  });

  it.each([
    ['approve', { input: { decision: 'approve', rationale: 'looks good' } }],
    ['dismiss', { input: { decision: 'dismiss', rationale: 'false positive' } }],
  ])('accepts %s', (_label, body) => {
    const deps = createDeps(createManagementClient());
    registerRespondToProposalRoute(deps);

    expect(rejection(deps.router, body)).toBeUndefined();
  });

  it('rejects extra keys on input', () => {
    const deps = createDeps(createManagementClient());
    registerRespondToProposalRoute(deps);

    expect(
      rejection(deps.router, {
        input: { decision: 'approve', gateSpecific: 'value', rationale: 'looks good' },
      })
    ).toBeInstanceOf(RouteValidationError);
  });

  it('rejects a missing rationale even with a valid decision', () => {
    const deps = createDeps(createManagementClient());
    registerRespondToProposalRoute(deps);

    expect(rejection(deps.router, { input: { decision: 'approve' } })).toBeInstanceOf(
      RouteValidationError
    );
  });

  it('rejects a whitespace-only rationale even with a valid decision', () => {
    const deps = createDeps(createManagementClient());
    registerRespondToProposalRoute(deps);

    expect(
      rejection(deps.router, { input: { decision: 'approve', rationale: '   ' } })
    ).toBeInstanceOf(RouteValidationError);
  });
});

describe('RespondToProposalRequestBody (contract relied on by the route)', () => {
  it('rejects a missing rationale', () => {
    expect(RespondToProposalRequestBody.safeParse({ input: {} }).success).toBe(false);
  });

  it('rejects a whitespace-only rationale', () => {
    expect(RespondToProposalRequestBody.safeParse({ input: { rationale: '   ' } }).success).toBe(
      false
    );
  });

  it('accepts a non-empty rationale with gate-specific fields', () => {
    expect(
      RespondToProposalRequestBody.safeParse({
        input: { decision: 'approve', rationale: 'contained' },
      }).success
    ).toBe(true);
  });
});
