/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * PND security regression suite (epic kibana-idjb, bead .17).
 *
 * A single, discoverable place that asserts the epic's S1–S10 findings at the route
 * boundary, so a regression fails a **named** test here rather than silently reopening a
 * hole. Each finding has its own `describe` block. The per-route unit tests
 * (`put_autonomy.test.ts`, `respond_to_proposal.test.ts`, `auto_respond_to_proposals.test.ts`, …)
 * remain the exhaustive coverage; this file is the security-invariant tripwire that a
 * reviewer can read top-to-bottom.
 *
 * Findings covered:
 *   S1  `_respond`/`_auto_respond` are a universal workflow-resume primitive (privilege escalation)
 *   S3  IDOR — content routes resolve the AD as the calling user and 404/omit when unreadable
 *   S4  arbitrary-key write via the autonomy route
 *   S5  `_auto_respond` re-enforces `alwaysGate` server-side, at every level
 *   S5-b the resume call site (`approveGate`) refuses `alwaysGate` even if the partition helper is bypassed
 *   D15 containment and apply-tuning always gate, exhaustively over the autonomy scale — the
 *       invariant the deleted Approval gates table used to display (bead kibana-phf4.33)
 *   S9  space confinement — the request's space, never a client value, never `'*'`
 *   S10 duplicate proposals de-duplicated by `(correlationId, gateId)`
 *   D1  `_auto_respond` / `_detection_change` require the Workflows `execute` privilege too, not just a PND privilege
 *   D2  `_respond` rejects a missing or malformed `decision`, and a dismissal never signals closure
 *   D3  the proposals queue omits gates whose Attack Discovery the caller cannot read
 *   D4  `listPendingPndGates` returns only registered gates, never a superset
 *   D6  no unjustified internal-user client remains in `pnd/server` (all four identifiers)
 *   D6 companion  proposals/runs/executions/`_auto_respond` require Workflows managed-execution read
 *   F3  a detection-rule worker is installable but never resumable (install list ≠ resume allow-list)
 *   B6a `_apply` refuses to write any detection-rule field outside PND_TUNABLE_RULE_FIELDS, and
 *       refuses a `query` change aimed at a rule whose type is not `query`
 */

import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

import { RouteValidationError } from '@kbn/core-http-server';
import { mockRouter } from '@kbn/core-http-router-server-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import {
  PND_AUTONOMY_URL,
  PND_CONVERSATIONS_DERIVE_URL,
  PND_DISCOVERY_CONTEXT_URL,
  PND_EXECUTION_URL_TEMPLATE,
  PND_DETECTION_CHANGE_SIGNAL_EMIT_URL,
  PND_INVESTIGATION_PROPOSALS_URL_TEMPLATE,
  PND_PROPOSALS_AUTO_RESPOND_URL,
  PND_PROPOSALS_HISTORY_URL,
  PND_PROPOSALS_URL,
  PND_RUNS_URL,
  PND_PROPOSAL_RESPOND_URL_TEMPLATE,
  PND_GATE_IDS,
  PND_GATE_REGISTRY,
  PND_GATE_STEP_IDS,
  PND_INCIDENT_CLOSED_TRIGGER_ID,
  PND_TUNABLE_RULE_FIELDS,
  PND_TUNING_APPLY_URL_TEMPLATE,
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
  SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
  SYSTEM_SECURITY_WATCH_OFFICER_ID,
  WATCH_AUTONOMY_LEVELS,
  isAlwaysGate,
} from '@kbn/pnd-common';
import {
  ExecutionStatus,
  WorkflowsManagementApiActions,
  WorkflowsManagementOperationPrivileges,
} from '@kbn/workflows';
import { PND_RULE_TUNING_WORKFLOW_ID } from '@kbn/workflows/managed';

import {
  PND_API_PRIVILEGE_AUTONOMY_WRITE,
  PND_API_PRIVILEGE_PROPOSALS_RESPOND,
  PND_API_PRIVILEGE_READ,
} from '../../common/constants';
import type { RouteDependencies } from './register_routes';
import { listPendingPndGates } from '../lib/list_pending_pnd_gates';
import { createPendingGatesManagementClientMock } from '../lib/list_pending_pnd_gates/mocks';
import type { WatchWorkflowsManagementClient } from '../services/watches/watch_workflows_management_client';
import { getScopedInternalUiSettingsClient } from '../lib/scoped_internal_ui_settings_client';
import { findAttackDiscoveryAlerts } from './get/conversations/helpers/find_attack_discovery_alerts';
import { validateRegisteredBody } from './test_helpers/validate_registered_body';
import { registerPutAutonomyRoute } from './put/autonomy/put_autonomy';
import { registerAutoRespondToProposalsRoute } from './post/proposals/auto_respond_to_proposals';
import { approveGate } from './post/proposals/helpers/approve_gate';
import { registerRespondToProposalRoute } from './post/proposals/respond_to_proposal';
import { registerApplyTuningRoute } from './post/tuning/apply_tuning';
import { resolveApprovedTuningTarget } from './post/tuning/helpers/resolve_approved_tuning';
import { registerEmitDetectionChangeSignalRoute } from './post/signals/emit_detection_change_signal';
import { registerListProposalsRoute } from './get/proposals/list_proposals';
import { registerListProposalHistoryRoute } from './get/proposals/list_proposal_history';
import { registerListRunsRoute } from './get/runs/list_runs';
import { registerListInvestigationProposalsRoute } from './investigations/list_proposals';
import { registerDeriveConversationIdsRoute } from './get/conversations/derive_conversation_ids';
import { registerGetDiscoveryContextRoute } from './get/discovery_context/get_discovery_context';
import { registerGetExecutionRoute } from './get/executions/get_executions';

jest.mock('../lib/scoped_internal_ui_settings_client');
// Both the `_derive` and `/executions/{adId}` routes import this same module file, so one
// mock covers both content routes (S3).
jest.mock('./get/conversations/helpers/find_attack_discovery_alerts');
jest.mock('./post/tuning/helpers/resolve_approved_tuning', () => ({
  resolveApprovedTuningTarget: jest.fn().mockResolvedValue({ status: 'ok' }),
}));

const getScopedInternalUiSettingsClientMock = getScopedInternalUiSettingsClient as jest.Mock;
const findAttackDiscoveryAlertsMock = findAttackDiscoveryAlerts as jest.Mock;
const resolveApprovedTuningTargetMock = resolveApprovedTuningTarget as jest.MockedFunction<
  typeof resolveApprovedTuningTarget
>;

/** The space every route must resolve from the request and use uniformly (S9). */
const REQUEST_SPACE = 'agent-3';

/** A pending `waitForInput` step, addressed the way `listPendingPndGates` returns them. */
const waitingStep = ({
  id,
  runId,
  startedAt = '2026-08-02T00:00:00.000Z',
  stepId,
  workflowId = SYSTEM_SECURITY_WATCH_FLOOR_ID,
}: {
  id: string;
  runId: string;
  startedAt?: string;
  stepId: string;
  workflowId?: string;
}) => ({
  id,
  startedAt,
  status: ExecutionStatus.WAITING_FOR_INPUT,
  stepId,
  workflowId,
  workflowRunId: runId,
});

/**
 * A management client serving each pending gate from its own parked run — the shape
 * {@link listPendingPndGates} reads, which (unlike `listWaitingForInputSteps`) finds gates owned by
 * a global (`'*'`) managed watch (bead `kibana-idjb.21`).
 */
const createPendingGatesClient = (
  steps: Array<ReturnType<typeof waitingStep>>,
  correlationId?: string
) =>
  createPendingGatesManagementClientMock(
    steps.map((step) => ({
      correlationId,
      runId: step.workflowRunId,
      startedAt: step.startedAt,
      stepExecutions: [step],
      workflowId: step.workflowId,
    }))
  );

const createDeps = (
  overrides: Partial<RouteDependencies> = {}
): RouteDependencies & { router: ReturnType<typeof mockRouter.create> } => {
  const router = mockRouter.create();
  return {
    config: { demo: { forceIncident: false }, enabled: true, ui: { useMockData: false } },
    getSpaceId: jest.fn().mockReturnValue(REQUEST_SPACE),
    getStartServices: jest
      .fn()
      .mockResolvedValue([{ http: {}, savedObjects: { id: 'so' }, uiSettings: { id: 'ui' } }, {}]),
    getWatchesService: jest.fn().mockReturnValue({
      get: jest.fn().mockResolvedValue({
        settings: { autonomy: 'supervised' },
        settingsRevision: null,
      }),
      update: jest.fn().mockResolvedValue({ outcome: 'updated' }),
    }),
    getWatchProjection: jest.fn(),
    getWorkflowsManagementClient: jest.fn(),
    logger: loggerMock.create(),
    router,
    ...overrides,
  } as unknown as RouteDependencies & { router: ReturnType<typeof mockRouter.create> };
};

const invoke = async (
  handler: (...args: unknown[]) => Promise<unknown>,
  {
    body,
    params,
    query,
  }: {
    body?: Record<string, unknown>;
    params?: Record<string, unknown>;
    query?: Record<string, unknown>;
  } = {}
) => {
  const request = httpServerMock.createKibanaRequest({ body, params, query });
  const response = httpServerMock.createResponseFactory();
  await handler({} as unknown, request, response);
  return response;
};

beforeEach(() => {
  jest.clearAllMocks();
  getScopedInternalUiSettingsClientMock.mockReturnValue({
    get: jest.fn().mockResolvedValue('supervised'),
    set: jest.fn().mockResolvedValue(undefined),
  });
  findAttackDiscoveryAlertsMock.mockResolvedValue([]);
});

describe('PND security regression — S1 (_respond/_auto_respond resume primitive)', () => {
  const createManagementClient = () => ({
    getWorkflowExecution: jest.fn().mockResolvedValue({
      context: {},
      id: 'run-1',
      stepExecutions: [
        {
          id: 'step-exec-1',
          status: 'waiting_for_input',
          stepId: PND_GATE_STEP_IDS.awaitOpenInvestigation,
        },
      ],
      workflowId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
    }),
    resumeWorkflowExecution: jest.fn().mockResolvedValue({ resumedBy: 'analyst' }),
  });

  const respondHandler = (managementClient: ReturnType<typeof createManagementClient>) => {
    const deps = createDeps({
      getWorkflowsManagementClient: jest.fn().mockReturnValue(managementClient),
    });
    registerRespondToProposalRoute(deps);
    return deps.router.versioned.getRoute('post', PND_PROPOSAL_RESPOND_URL_TEMPLATE).versions['1']
      .handler as unknown as (...args: unknown[]) => Promise<unknown>;
  };

  const respondBody = { input: { decision: 'approve', rationale: 'looks good' } };

  it('requires BOTH the PND respond privilege AND the Workflows execute privilege', () => {
    const deps = createDeps({ getWorkflowsManagementClient: jest.fn() });

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

  it('rejects a source id whose claimed workflow id is not an allow-listed PND watch', async () => {
    const managementClient = createManagementClient();

    const response = await invoke(respondHandler(managementClient), {
      body: respondBody,
      params: { sourceId: 'made-up-workflow:run-1:step-exec-1' },
    });

    expect(response.badRequest).toHaveBeenCalledTimes(1);
  });

  it('never reaches the workflows client for a non-allow-listed claimed workflow id', async () => {
    const managementClient = createManagementClient();

    await invoke(respondHandler(managementClient), {
      body: respondBody,
      params: { sourceId: 'made-up-workflow:run-1:step-exec-1' },
    });

    expect(managementClient.getWorkflowExecution).not.toHaveBeenCalled();
  });

  /**
   * F3: PND *installs* the detection-rule workers (`PND_INSTALLABLE_WORKFLOW_IDS`) but must never be
   * able to *resume* one. These cases are the route-boundary proof that widening the install list did
   * not widen the resume boundary — the install list and the resume allow-list are independent
   * arrays in two packages, and `managed_workflow_drift.test.ts` pins that at the constant layer.
   *
   * `system-security-rule-tuning` is the sharpest subject available: it PATCHes detection rules
   * straight from YAML, so resuming it would run that PATCH under the resumer's identity. It replaced
   * the lifecycle stub here when kibana-phf4.12 retired it.
   */
  it('rejects a source id claiming a detection-rule worker id (F3)', async () => {
    const managementClient = createManagementClient();

    const response = await invoke(respondHandler(managementClient), {
      body: respondBody,
      params: { sourceId: `${PND_RULE_TUNING_WORKFLOW_ID}:run-1:step-exec-1` },
    });

    expect(response.badRequest).toHaveBeenCalledTimes(1);
  });

  it('never reaches the workflows client for a detection-rule worker id (F3)', async () => {
    const managementClient = createManagementClient();

    await invoke(respondHandler(managementClient), {
      body: respondBody,
      params: { sourceId: `${PND_RULE_TUNING_WORKFLOW_ID}:run-1:step-exec-1` },
    });

    expect(managementClient.getWorkflowExecution).not.toHaveBeenCalled();
  });

  it('does not resume when the re-derived workflow is a detection-rule worker (F3)', async () => {
    const managementClient = createManagementClient();
    managementClient.getWorkflowExecution.mockResolvedValue({
      context: {},
      id: 'run-1',
      stepExecutions: [
        {
          id: 'step-exec-1',
          status: 'waiting_for_input',
          stepId: PND_GATE_STEP_IDS.awaitOpenInvestigation,
        },
      ],
      workflowId: PND_RULE_TUNING_WORKFLOW_ID,
    });

    await invoke(respondHandler(managementClient), {
      body: respondBody,
      params: { sourceId: `${SYSTEM_SECURITY_WATCH_FLOOR_ID}:run-1:step-exec-1` },
    });

    expect(managementClient.resumeWorkflowExecution).not.toHaveBeenCalled();
  });

  it('403s a forged source id whose persisted run belongs to a non-PND workflow (re-derivation)', async () => {
    const managementClient = createManagementClient();
    managementClient.getWorkflowExecution.mockResolvedValue({
      context: {},
      id: 'run-1',
      stepExecutions: [
        {
          id: 'step-exec-1',
          status: 'waiting_for_input',
          stepId: PND_GATE_STEP_IDS.awaitOpenInvestigation,
        },
      ],
      workflowId: 'some-other-workflow',
    });

    const response = await invoke(respondHandler(managementClient), {
      body: respondBody,
      params: { sourceId: `${SYSTEM_SECURITY_WATCH_FLOOR_ID}:run-1:step-exec-1` },
    });

    expect(response.forbidden).toHaveBeenCalledTimes(1);
  });

  it('does not resume when the re-derived workflow is not a PND watch', async () => {
    const managementClient = createManagementClient();
    managementClient.getWorkflowExecution.mockResolvedValue({
      context: {},
      id: 'run-1',
      stepExecutions: [
        {
          id: 'step-exec-1',
          status: 'waiting_for_input',
          stepId: PND_GATE_STEP_IDS.awaitOpenInvestigation,
        },
      ],
      workflowId: 'some-other-workflow',
    });

    await invoke(respondHandler(managementClient), {
      body: respondBody,
      params: { sourceId: `${SYSTEM_SECURITY_WATCH_FLOOR_ID}:run-1:step-exec-1` },
    });

    expect(managementClient.resumeWorkflowExecution).not.toHaveBeenCalled();
  });

  it('always resumes an allow-listed gate through resumeWorkflowExecution (never the engine)', async () => {
    const managementClient = createManagementClient();

    await invoke(respondHandler(managementClient), {
      body: respondBody,
      params: { sourceId: `${SYSTEM_SECURITY_WATCH_FLOOR_ID}:run-1:step-exec-1` },
    });

    expect(managementClient.resumeWorkflowExecution).toHaveBeenCalledTimes(1);
  });

  it('requires BOTH the autonomy-write privilege AND the Workflows execute privilege for `_auto_respond`', () => {
    const deps = createDeps({ getWorkflowsManagementClient: jest.fn() });

    registerAutoRespondToProposalsRoute(deps);

    expect(
      deps.router.versioned.getRoute('post', PND_PROPOSALS_AUTO_RESPOND_URL).config.security
    ).toEqual({
      authz: {
        requiredPrivileges: [
          PND_API_PRIVILEGE_AUTONOMY_WRITE,
          WorkflowsManagementApiActions.execute,
          WorkflowsManagementApiActions.readManaged,
          ...WorkflowsManagementOperationPrivileges.readManagedExecution,
        ],
      },
    });
  });

  /**
   * The `requiredPrivileges` a POST route declares, or `[]` when it opted out of authorization
   * entirely — an authz opt-out must never be how a resume route passes this suite.
   */
  const requiredPrivileges = (
    router: ReturnType<typeof mockRouter.create>,
    path: string
  ): readonly unknown[] => {
    const authz = router.versioned.getRoute('post', path).config.security?.authz;
    return authz != null && 'requiredPrivileges' in authz ? authz.requiredPrivileges : [];
  };

  it('never gates a resume or emit route on a PND privilege alone (D1)', () => {
    const deps = createDeps({ getWorkflowsManagementClient: jest.fn() });

    registerAutoRespondToProposalsRoute(deps);
    registerEmitDetectionChangeSignalRoute(deps);
    registerRespondToProposalRoute(deps);

    expect(
      [
        PND_PROPOSALS_AUTO_RESPOND_URL,
        PND_DETECTION_CHANGE_SIGNAL_EMIT_URL,
        PND_PROPOSAL_RESPOND_URL_TEMPLATE,
      ].map((path) =>
        requiredPrivileges(deps.router, path).includes(WorkflowsManagementApiActions.execute)
      )
    ).toEqual([true, true, true]);
  });

  it('requires BOTH the PND respond privilege AND the Workflows execute privilege for `_detection_change`', () => {
    const deps = createDeps({ getWorkflowsManagementClient: jest.fn() });

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
});

describe('PND security regression — execution reads require Workflows managed-execution read (D6 companion)', () => {
  const expectedAuthz = {
    authz: {
      requiredPrivileges: [
        PND_API_PRIVILEGE_READ,
        ...WorkflowsManagementOperationPrivileges.readManagedExecution,
      ],
    },
  };

  it('requires PND-read AND managed-execution read on the proposals queue', () => {
    const deps = createDeps({ getWorkflowsManagementClient: jest.fn() });

    registerListProposalsRoute(deps);

    expect(deps.router.versioned.getRoute('get', PND_PROPOSALS_URL).config.security).toEqual(
      expectedAuthz
    );
  });

  it('requires PND-read AND managed-execution read on proposal history', () => {
    const deps = createDeps({ getWorkflowsManagementClient: jest.fn() });

    registerListProposalHistoryRoute(deps);

    expect(
      deps.router.versioned.getRoute('get', PND_PROPOSALS_HISTORY_URL).config.security
    ).toEqual(expectedAuthz);
  });

  it('requires PND-read AND managed-execution read on investigation proposals', () => {
    const deps = createDeps({ getWorkflowsManagementClient: jest.fn() });

    registerListInvestigationProposalsRoute(deps);

    expect(
      deps.router.versioned.getRoute('get', PND_INVESTIGATION_PROPOSALS_URL_TEMPLATE).config
        .security
    ).toEqual(expectedAuthz);
  });

  it('requires PND-read AND managed-execution read on runs', () => {
    const deps = createDeps({ getWorkflowsManagementClient: jest.fn() });

    registerListRunsRoute(deps);

    expect(deps.router.versioned.getRoute('get', PND_RUNS_URL).config.security).toEqual(
      expectedAuthz
    );
  });

  it('requires PND-read AND managed-execution read on executions', () => {
    const deps = createDeps({ getWorkflowsManagementClient: jest.fn() });

    registerGetExecutionRoute(deps);

    expect(
      deps.router.versioned.getRoute('get', PND_EXECUTION_URL_TEMPLATE).config.security
    ).toEqual(expectedAuthz);
  });

  it('requires managed-execution read on `_auto_respond` so listing parked gates is not a side-channel', () => {
    const deps = createDeps({ getWorkflowsManagementClient: jest.fn() });

    registerAutoRespondToProposalsRoute(deps);

    const authz = deps.router.versioned.getRoute('post', PND_PROPOSALS_AUTO_RESPOND_URL).config
      .security?.authz;
    const required = authz != null && 'requiredPrivileges' in authz ? authz.requiredPrivileges : [];

    expect(required).toEqual(
      expect.arrayContaining(WorkflowsManagementOperationPrivileges.readManagedExecution)
    );
  });
});

describe('PND security regression — D2 (_respond fails open on a malformed decision)', () => {
  /**
   * Read the body validation `_respond` actually registered. `httpServerMock.createKibanaRequest`
   * skips validation, so the handler cannot be the subject here: the `400` is produced by the
   * validator, which is exactly the control D2 adds.
   */
  const rejection = (body: unknown) => {
    const deps = createDeps({ getWorkflowsManagementClient: jest.fn() });
    registerRespondToProposalRoute(deps);

    return validateRegisteredBody({
      body,
      route: deps.router.versioned.getRoute('post', PND_PROPOSAL_RESPOND_URL_TEMPLATE),
    });
  };

  it('rejects a body carrying only a rationale, which used to proceed as an approval', () => {
    expect(rejection({ input: { rationale: 'x' } })).toBeInstanceOf(RouteValidationError);
  });

  it('rejects a capitalized "Dismiss", which the YAMLs never match and which used to approve', () => {
    expect(rejection({ input: { decision: 'Dismiss', rationale: 'x' } })).toBeInstanceOf(
      RouteValidationError
    );
  });

  it('accepts only the two decisions the orchestrators branch on', () => {
    expect(
      ['approve', 'dismiss', 'defer'].map(
        (decision) => rejection({ input: { decision, rationale: 'x' } }) === undefined
      )
    ).toEqual([true, true, false]);
  });

  /**
   * `pnd.incidentClosed` is the lifecycle fact. Emitting it for a **declined** containment would
   * claim an incident closed when a human just said it was not. The coverage-gap claim is a
   * separate signal and is allowed to fire on that path.
   */
  it('never emits pnd.incidentClosed when the containment gate is dismissed', async () => {
    const emitEvent = jest.fn().mockResolvedValue(undefined);
    const managementClient = {
      getWorkflowExecution: jest.fn().mockResolvedValue({
        context: { event: { correlationId: 'ad-1' } },
        id: 'run-1',
        stepExecutions: [
          {
            id: 'step-exec-1',
            status: ExecutionStatus.WAITING_FOR_INPUT,
            stepId: PND_GATE_STEP_IDS.awaitIncidentContained,
          },
        ],
        workflowId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
      }),
      resumeWorkflowExecution: jest.fn().mockResolvedValue({ resumedBy: 'analyst' }),
    } as unknown as WatchWorkflowsManagementClient;
    const deps = createDeps({
      getStartServices: jest
        .fn()
        .mockResolvedValue([
          { http: {} },
          { workflowsExtensions: { getClient: jest.fn().mockResolvedValue({ emitEvent }) } },
        ]),
      getWorkflowsManagementClient: jest.fn().mockReturnValue(managementClient),
    });
    registerRespondToProposalRoute(deps);

    await invoke(
      deps.router.versioned.getRoute('post', PND_PROPOSAL_RESPOND_URL_TEMPLATE).versions['1']
        .handler as unknown as (...args: unknown[]) => Promise<unknown>,
      {
        body: { input: { decision: 'dismiss', rationale: 'containment did not hold' } },
        params: { sourceId: `${SYSTEM_SECURITY_WATCH_FLOOR_ID}:run-1:step-exec-1` },
      }
    );

    expect(
      emitEvent.mock.calls.filter(([id]: [string]) => id === PND_INCIDENT_CLOSED_TRIGGER_ID)
    ).toHaveLength(0);
  });
});

describe('PND security regression — B6a (`_apply` constrains what a tuning may write)', () => {
  const applyHandler = (fetch: jest.Mock) => {
    const deps = createDeps({
      getStartServices: jest
        .fn()
        .mockResolvedValue([{ http: { selfClient: { asScoped: () => ({ fetch }) } } }, {}]),
      getWorkflowsManagementClient: jest.fn().mockReturnValue({}),
    });
    registerApplyTuningRoute(deps);

    return deps.router.versioned.getRoute('post', PND_TUNING_APPLY_URL_TEMPLATE).versions['1']
      .handler as unknown as (...args: unknown[]) => Promise<unknown>;
  };

  /**
   * Whether the detection engine was **written to**, counting the rule PATCH only.
   *
   * A `query` change also triggers a confirming *read* of the rule (`findQueryChangeRefusal`, which
   * exists because the detection-engine route ignores a `query` on a non-`query` rule and still
   * answers `200`). Both calls go through the one self client and only the PATCH carries a `method`,
   * so counting every call would report a refused tuning as an applied one.
   */
  const applied = async (change: Record<string, unknown>, ruleType = 'query') => {
    const fetch = jest.fn().mockImplementation((_path: string, options?: { method?: string }) => ({
      response: {
        ok: true,
        status: 200,
        text: jest
          .fn()
          .mockResolvedValue(
            options?.method === 'PATCH' ? '{"id":"rule-1"}' : `{"id":"rule-1","type":"${ruleType}"}`
          ),
      },
    }));

    await invoke(applyHandler(fetch), {
      body: { change, id: 'rule-1', rationale: 'ok' },
      params: { proposalId: 'proposal-1' },
    });

    return fetch.mock.calls.some(([, options]) => options?.method === 'PATCH');
  };

  it('applies every field in the tunable set', async () => {
    const outcomes = await Promise.all(
      PND_TUNABLE_RULE_FIELDS.map((field) => applied({ [field]: 'value' }))
    );

    expect(outcomes).toEqual(PND_TUNABLE_RULE_FIELDS.map(() => true));
  });

  /**
   * The rules API is reached with the approving user's own credentials, so this is not about
   * privilege — it is about what a reviewer can judge. Alert suppression and `threshold` change how
   * a rule's alerts de-duplicate and group rather than which documents match, so the before/after
   * alert count the review flow measures does not describe what they did. `exceptions_list` is
   * excluded because a rule patch *replaces* that array, silently detaching every exception list
   * already attached to the rule.
   */
  it('never reaches the detection engine for a field outside the tunable set', async () => {
    const outcomes = await Promise.all(
      ['alert_suppression', 'threshold', 'exceptions_list', 'index', 'name'].map((field) =>
        applied({ [field]: 'value' })
      )
    );

    expect(outcomes).toEqual([false, false, false, false, false]);
  });

  it('refuses the whole patch when a disallowed field rides alongside an allowed one', async () => {
    expect(await applied({ note: '## guide', threshold: { value: 1 } })).toBe(false);
  });

  /**
   * `query` is tunable, but only on a rule whose `type` is `query`. The rule is re-fetched as the
   * approving user to confirm that, because the detection-engine route would otherwise ignore the
   * field and answer `200` — reporting `applied: true` for a rule whose detection logic never moved.
   */
  it.each(['eql', 'machine_learning', 'threshold', 'esql'])(
    'never reaches the detection engine with a query change aimed at a %s rule',
    async (ruleType) => {
      expect(await applied({ query: 'event.code : *' }, ruleType)).toBe(false);
    }
  );

  it('applies a query change to a query rule, which is what the review flow exists for', async () => {
    expect(await applied({ query: 'event.code : *' })).toBe(true);
  });
});

describe('PND security regression — B6a-adjacent (`_apply` binds to an approved tuning gate)', () => {
  it('never reaches the detection engine when the proposal is not an approved apply-tuning gate', async () => {
    resolveApprovedTuningTargetMock.mockResolvedValueOnce({ status: 'not_found' });
    const fetch = jest.fn().mockResolvedValue({
      response: { ok: true, status: 200, text: jest.fn().mockResolvedValue('{"id":"rule-1"}') },
    });
    const deps = createDeps({
      getStartServices: jest
        .fn()
        .mockResolvedValue([{ http: { selfClient: { asScoped: () => ({ fetch }) } } }, {}]),
      getWorkflowsManagementClient: jest.fn().mockReturnValue({}),
    });
    registerApplyTuningRoute(deps);
    const handler = deps.router.versioned.getRoute('post', PND_TUNING_APPLY_URL_TEMPLATE).versions[
      '1'
    ].handler as unknown as (...args: unknown[]) => Promise<unknown>;

    await invoke(handler, {
      body: { change: { enabled: false }, id: 'rule-1', rationale: 'ok' },
      params: { proposalId: 'proposal-1' },
    });

    expect(fetch.mock.calls.some(([, options]) => options?.method === 'PATCH')).toBe(false);
  });
});

describe('PND security regression — S3 (IDOR on content routes)', () => {
  const deriveHandler = () => {
    const deps = createDeps();
    registerDeriveConversationIdsRoute(deps);
    return deps.router.versioned.getRoute('get', PND_CONVERSATIONS_DERIVE_URL).versions['1']
      .handler as unknown as (...args: unknown[]) => Promise<unknown>;
  };

  const executionHandler = () => {
    const deps = createDeps({
      getWorkflowsManagementClient: jest.fn().mockReturnValue({
        getWorkflowExecution: jest.fn(),
        searchWorkflowExecutions: jest.fn(),
      }),
    });
    registerGetExecutionRoute(deps);
    return deps.router.versioned.getRoute('get', PND_EXECUTION_URL_TEMPLATE).versions['1']
      .handler as unknown as (...args: unknown[]) => Promise<unknown>;
  };

  it('`_derive` 404s when the caller cannot read the Attack Discovery', async () => {
    findAttackDiscoveryAlertsMock.mockResolvedValue([]);

    const response = await invoke(deriveHandler(), { query: { correlationId: 'ad-1' } });

    expect(response.notFound).toHaveBeenCalledTimes(1);
  });

  it('`_derive` resolves the discovery as the calling user (request + request space)', async () => {
    await invoke(deriveHandler(), { query: { correlationId: 'ad-1' } });

    expect(findAttackDiscoveryAlertsMock).toHaveBeenCalledWith(
      expect.objectContaining({ ids: ['ad-1'], spaceId: REQUEST_SPACE })
    );
  });

  it('`/executions/{adId}` 404s when the caller cannot read the Attack Discovery', async () => {
    findAttackDiscoveryAlertsMock.mockResolvedValue([]);

    const response = await invoke(executionHandler(), {
      params: { correlationId: 'ad-1' },
    });

    expect(response.notFound).toHaveBeenCalledTimes(1);
  });

  it('`/executions/{adId}` resolves the discovery as the calling user (request + request space)', async () => {
    await invoke(executionHandler(), { params: { correlationId: 'ad-1' } });

    expect(findAttackDiscoveryAlertsMock).toHaveBeenCalledWith(
      expect.objectContaining({ ids: ['ad-1'], spaceId: REQUEST_SPACE })
    );
  });

  const proposalsHandler = () => {
    const managementClient = createPendingGatesClient(
      [
        waitingStep({
          id: 'exec-open',
          runId: 'run-open',
          stepId: PND_GATE_STEP_IDS.awaitOpenInvestigation,
        }),
      ],
      'ad-1'
    );
    const deps = createDeps({
      getWorkflowsManagementClient: jest.fn().mockReturnValue(managementClient),
    });
    registerListProposalsRoute(deps);
    return deps.router.versioned.getRoute('get', PND_PROPOSALS_URL).versions['1']
      .handler as unknown as (...args: unknown[]) => Promise<unknown>;
  };

  it('the proposals queue omits a gate whose discovery the caller cannot read (D3)', async () => {
    findAttackDiscoveryAlertsMock.mockResolvedValue([]);

    const response = await invoke(proposalsHandler());

    expect(response.ok).toHaveBeenCalledWith(
      expect.objectContaining({ body: expect.objectContaining({ total: 0 }) })
    );
  });

  it('the proposals queue resolves its discoveries as the calling user (request space) (D3)', async () => {
    await invoke(proposalsHandler());

    expect(findAttackDiscoveryAlertsMock).toHaveBeenCalledWith(
      expect.objectContaining({ ids: ['ad-1'], spaceId: REQUEST_SPACE })
    );
  });

  /**
   * `/discovery-context` is the only PND route handed Attack Discovery ids by the client and the
   * only one that reads the detection alerts index, so both halves of its guard are asserted here:
   * the readability filter runs first, and the read itself is scoped to the caller.
   */
  const discoveryContextHandler = (search: jest.Mock) => {
    const deps = createDeps({
      getEsClient: jest
        .fn()
        .mockResolvedValue({ asCurrentUser: { search }, asInternalUser: { search: jest.fn() } }),
    });
    registerGetDiscoveryContextRoute(deps);
    return deps.router.versioned.getRoute('get', PND_DISCOVERY_CONTEXT_URL).versions['1']
      .handler as unknown as (...args: unknown[]) => Promise<unknown>;
  };

  it('`/discovery-context` never reads an alert for a discovery the caller cannot read', async () => {
    findAttackDiscoveryAlertsMock.mockResolvedValue([]);
    const search = jest.fn();

    await invoke(discoveryContextHandler(search), {
      query: { correlationIds: ['ad-1'] },
    });

    expect(search).not.toHaveBeenCalled();
  });

  it('`/discovery-context` resolves its discoveries as the calling user (request space)', async () => {
    findAttackDiscoveryAlertsMock.mockResolvedValue([{ alert_ids: ['alert-1'], id: 'ad-1' }]);

    await invoke(discoveryContextHandler(jest.fn().mockResolvedValue({})), {
      query: { correlationIds: ['ad-1'] },
    });

    expect(findAttackDiscoveryAlertsMock).toHaveBeenCalledWith(
      expect.objectContaining({ ids: ['ad-1'], spaceId: REQUEST_SPACE })
    );
  });
});

describe('PND security regression — D4 (listPendingPndGates is not a superset)', () => {
  it("never surfaces watch_officer's unregistered await_approval gate", async () => {
    findAttackDiscoveryAlertsMock.mockResolvedValue([{ id: 'ad-1' }]);
    const managementClient = createPendingGatesClient(
      [
        waitingStep({
          id: 'exec-officer',
          runId: 'run-officer',
          stepId: 'await_approval',
          workflowId: SYSTEM_SECURITY_WATCH_OFFICER_ID,
        }),
      ],
      'ad-1'
    );

    const { results } = await listPendingPndGates({
      logger: loggerMock.create(),
      managementClient: managementClient as unknown as WatchWorkflowsManagementClient,
      spaceId: REQUEST_SPACE,
    });

    expect(results).toEqual([]);
  });
});

describe('PND security regression — S4 (arbitrary-key write via autonomy)', () => {
  const autonomySetup = () => {
    const deps = createDeps();
    registerPutAutonomyRoute(deps);
    return {
      deps,
      handler: deps.router.versioned.getRoute('put', PND_AUTONOMY_URL).versions['1']
        .handler as unknown as (...args: unknown[]) => Promise<unknown>,
    };
  };

  it('rejects a watchId outside the managed set before writing template values', async () => {
    const { handler } = autonomySetup();
    const response = await invoke(handler, {
      body: { autonomyLevel: 'assisted', watchId: '../../evil' },
    });

    expect(response.badRequest).toHaveBeenCalledTimes(1);
  });

  it('does not write template values for a non-allow-listed watchId', async () => {
    const { deps, handler } = autonomySetup();
    await invoke(handler, {
      body: { autonomyLevel: 'assisted', watchId: '../../evil' },
    });

    expect(deps.getWatchesService).not.toHaveBeenCalled();
  });

  // Includes the legacy 1..3 ordinals: the dial is a name now, so an ordinal must be refused
  // rather than clamped, or a stale caller could raise autonomy by accident.
  it.each(['autonomous', 'Supervised', 1, 3, 2.5, null])(
    'rejects the level %p before any write',
    async (autonomyLevel) => {
      const { handler } = autonomySetup();
      const response = await invoke(handler, {
        body: { autonomyLevel, watchId: SYSTEM_SECURITY_WATCH_FLOOR_ID },
      });

      expect(response.badRequest).toHaveBeenCalledTimes(1);
    }
  );

  it('does not write when the level is outside the shared scale', async () => {
    const { deps, handler } = autonomySetup();
    await invoke(handler, {
      body: { autonomyLevel: 'autonomous', watchId: SYSTEM_SECURITY_WATCH_FLOOR_ID },
    });

    expect(deps.getWatchesService).not.toHaveBeenCalled();
  });
});

describe('PND security regression — S5 (`_auto_respond` re-enforces alwaysGate)', () => {
  const autoRespondHandler = (steps: Array<ReturnType<typeof waitingStep>>) => {
    const managementClient = {
      ...createPendingGatesClient(steps),
      resumeWorkflowExecution: jest.fn().mockResolvedValue({ resumedBy: 'analyst' }),
    };
    const deps = createDeps({
      getWorkflowsManagementClient: jest.fn().mockReturnValue(managementClient),
    });
    registerAutoRespondToProposalsRoute(deps);
    const handler = deps.router.versioned.getRoute('post', PND_PROPOSALS_AUTO_RESPOND_URL).versions[
      '1'
    ].handler as unknown as (...args: unknown[]) => Promise<unknown>;
    return { handler, managementClient };
  };

  it('never resumes `await_incident_contained`, even at the supervised level with it the only pending gate', async () => {
    getScopedInternalUiSettingsClientMock.mockReturnValue({
      get: jest.fn().mockResolvedValue('supervised'),
      set: jest.fn(),
    });
    const { handler, managementClient } = autoRespondHandler([
      waitingStep({
        id: 'exec-contain',
        runId: 'run-contain',
        stepId: PND_GATE_STEP_IDS.awaitIncidentContained,
      }),
    ]);

    await invoke(handler, { body: { origin: 'dial', watchId: SYSTEM_SECURITY_WATCH_FLOOR_ID } });

    expect(managementClient.resumeWorkflowExecution).not.toHaveBeenCalled();
  });

  it('leaves both alwaysGate gates in place at the supervised level while sweeping the reversible one', async () => {
    getScopedInternalUiSettingsClientMock.mockReturnValue({
      get: jest.fn().mockResolvedValue('supervised'),
      set: jest.fn(),
    });
    const { handler, managementClient } = autoRespondHandler([
      waitingStep({
        id: 'exec-contain',
        runId: 'run-contain',
        stepId: PND_GATE_STEP_IDS.awaitIncidentContained,
      }),
      waitingStep({
        id: 'exec-promote',
        runId: 'run-promote',
        stepId: PND_GATE_STEP_IDS.awaitPromoteIncident,
      }),
    ]);

    await invoke(handler, { body: { origin: 'dial', watchId: SYSTEM_SECURITY_WATCH_FLOOR_ID } });

    expect(managementClient.resumeWorkflowExecution).toHaveBeenCalledTimes(1);
  });

  it('never resumes the Detection watch `await_apply_tuning` gate, even at the supervised level', async () => {
    getScopedInternalUiSettingsClientMock.mockReturnValue({
      get: jest.fn().mockResolvedValue('supervised'),
      set: jest.fn(),
    });
    const { handler, managementClient } = autoRespondHandler([
      waitingStep({
        id: 'exec-tune',
        runId: 'run-tune',
        stepId: PND_GATE_STEP_IDS.awaitApplyTuning,
        workflowId: SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
      }),
    ]);

    await invoke(handler, {
      body: { origin: 'dial', watchId: SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID },
    });

    expect(managementClient.resumeWorkflowExecution).not.toHaveBeenCalled();
  });
});

/**
 * S5-b: the partition helper is now on the primary path, so it can no longer be the only
 * `alwaysGate` check. This block calls `approveGate` directly — the resume call site —
 * and asserts the compensating registry re-read still refuses, even though the partition
 * helper never ran.
 */
describe('PND security regression — S5-b (alwaysGate refused at the resume call site)', () => {
  const resumeWorkflowExecution = jest.fn();
  const ctx = {
    channel: 'pnd-autonomy-auto',
    managementClient: { resumeWorkflowExecution },
    rationale: 'bypass-partition',
    request: httpServerMock.createKibanaRequest(),
    spaceId: REQUEST_SPACE,
  };

  beforeEach(() => {
    resumeWorkflowExecution.mockReset();
  });

  it('never resumes await_incident_contained even when the partition helper is bypassed', async () => {
    await approveGate(
      {
        stepExecutionId: 'exec-contain',
        stepId: PND_GATE_STEP_IDS.awaitIncidentContained,
        workflowId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
        workflowRunId: 'run-contain',
      },
      ctx
    ).catch(() => undefined);

    expect(resumeWorkflowExecution).not.toHaveBeenCalled();
  });

  it('never resumes await_apply_tuning even when the partition helper is bypassed', async () => {
    await approveGate(
      {
        stepExecutionId: 'exec-tune',
        stepId: PND_GATE_STEP_IDS.awaitApplyTuning,
        workflowId: SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
        workflowRunId: 'run-tune',
      },
      ctx
    ).catch(() => undefined);

    expect(resumeWorkflowExecution).not.toHaveBeenCalled();
  });
});

/**
 * ⛔ D15 at the route boundary, and the reason this block exists as its own named describe.
 *
 * Bead kibana-phf4.33 deleted the Watch settings page's Approval gates table per the 2026-08-10
 * design. That table was the only surface that *told a customer* containment and apply-tuning always
 * require a human, so the invariant now lives entirely in code, in three places:
 *
 *   1. `alwaysGate` on the two registry rows — `gate_registry/index.test.ts` and, tied to the YAML,
 *      `managed_workflow_drift.test.ts`.
 *   2. No `if` wrapper around `await_incident_contained` / `await_apply_tuning` in the watch YAML —
 *      `managed_workflow_drift.test.ts`, `watch_floor.test.ts`, `watch_post_incident.test.ts`.
 *   3. `_auto_respond` refusing both **unconditionally, at every autonomy level** — asserted here,
 *      end to end through the route, in `partition_auto_respondable_gates/index.test.ts` for the
 *      primary filter, and in `approve_gate/index.test.ts` plus S5-b for the compensating re-read.
 *
 * The S5 block above covers the supervised level, which is where a regression would first show. This
 * one is exhaustive over the level scale so no level can acquire an exemption unnoticed, and it is
 * driven by the registry so a fifth `alwaysGate` gate is covered the day it is added.
 */
describe('PND security regression — D15 (`_auto_respond` refuses alwaysGate at every level)', () => {
  const autoRespond = async (gate: { stepId: string; workflowId: string }, level: string) => {
    getScopedInternalUiSettingsClientMock.mockReturnValue({
      get: jest.fn().mockResolvedValue(level),
      set: jest.fn(),
    });
    const managementClient = {
      ...createPendingGatesClient([
        waitingStep({
          id: `exec-${gate.stepId}`,
          runId: `run-${gate.stepId}`,
          stepId: gate.stepId,
          workflowId: gate.workflowId,
        }),
      ]),
      resumeWorkflowExecution: jest.fn().mockResolvedValue({ resumedBy: 'analyst' }),
    };
    const deps = createDeps({
      getWorkflowsManagementClient: jest.fn().mockReturnValue(managementClient),
    });
    registerAutoRespondToProposalsRoute(deps);
    const handler = deps.router.versioned.getRoute('post', PND_PROPOSALS_AUTO_RESPOND_URL).versions[
      '1'
    ].handler as unknown as (...args: unknown[]) => Promise<unknown>;

    await invoke(handler, { body: { origin: 'dial', watchId: gate.workflowId } });
    return managementClient;
  };

  describe.each(PND_GATE_REGISTRY.filter(({ alwaysGate }) => alwaysGate))('$gateId', (gate) => {
    it.each([...WATCH_AUTONOMY_LEVELS])('is never resumed at the %s level', async (level) => {
      const managementClient = await autoRespond(gate, level);

      expect(managementClient.resumeWorkflowExecution).not.toHaveBeenCalled();
    });
  });

  it('still flags both gates as alwaysGate in the registry `_auto_respond` re-reads', () => {
    expect(
      PND_GATE_REGISTRY.filter(({ alwaysGate }) => alwaysGate).map(({ gateId }) => ({
        gateId,
        isAlwaysGate: isAlwaysGate(gateId),
      }))
    ).toEqual([
      { gateId: PND_GATE_IDS.incidentContained, isAlwaysGate: true },
      { gateId: PND_GATE_IDS.applyTuning, isAlwaysGate: true },
    ]);
  });
});

describe('PND security regression — S9 (space confinement)', () => {
  it('`_auto_respond` lists waiting steps in the request space, never a client value', async () => {
    const managementClient = {
      ...createPendingGatesClient([]),
      resumeWorkflowExecution: jest.fn(),
    };
    const deps = createDeps({
      getWorkflowsManagementClient: jest.fn().mockReturnValue(managementClient),
    });
    registerAutoRespondToProposalsRoute(deps);
    const handler = deps.router.versioned.getRoute('post', PND_PROPOSALS_AUTO_RESPOND_URL).versions[
      '1'
    ].handler as unknown as (...args: unknown[]) => Promise<unknown>;

    await invoke(handler, { body: { origin: 'dial', watchId: SYSTEM_SECURITY_WATCH_FLOOR_ID } });

    expect(managementClient.getWorkflowExecutions).toHaveBeenCalledWith(
      expect.any(Object),
      REQUEST_SPACE,
      expect.any(Object)
    );
  });

  it('`_respond` resumes in the request space, never a client value', async () => {
    const managementClient = {
      getWorkflowExecution: jest.fn().mockResolvedValue({
        context: {},
        id: 'run-1',
        stepExecutions: [
          {
            id: 'step-exec-1',
            status: 'waiting_for_input',
            stepId: PND_GATE_STEP_IDS.awaitOpenInvestigation,
          },
        ],
        workflowId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
      }),
      resumeWorkflowExecution: jest.fn().mockResolvedValue({ resumedBy: 'analyst' }),
    };
    const deps = createDeps({
      getWorkflowsManagementClient: jest.fn().mockReturnValue(managementClient),
    });
    registerRespondToProposalRoute(deps);
    const handler = deps.router.versioned.getRoute('post', PND_PROPOSAL_RESPOND_URL_TEMPLATE)
      .versions['1'].handler as unknown as (...args: unknown[]) => Promise<unknown>;

    await invoke(handler, {
      body: { input: { decision: 'approve', rationale: 'ok' } },
      params: { sourceId: `${SYSTEM_SECURITY_WATCH_FLOOR_ID}:run-1:step-exec-1` },
    });

    expect(managementClient.resumeWorkflowExecution).toHaveBeenCalledWith(
      'run-1',
      REQUEST_SPACE,
      expect.any(Object),
      expect.anything(),
      expect.any(Object)
    );
  });

  it('the proposals list reads pending gates in the request space, never `*`', async () => {
    const managementClient = createPendingGatesClient([]);
    const deps = createDeps({
      getWorkflowsManagementClient: jest.fn().mockReturnValue(managementClient),
    });
    registerListProposalsRoute(deps);
    const handler = deps.router.versioned.getRoute('get', PND_PROPOSALS_URL).versions['1']
      .handler as unknown as (...args: unknown[]) => Promise<unknown>;

    await invoke(handler);

    expect(managementClient.getWorkflowExecutions).toHaveBeenCalledWith(
      expect.any(Object),
      REQUEST_SPACE
    );
  });
});

describe('PND security regression — kibana-idjb.21 (global managed watches are not invisible)', () => {
  const listProposals = (managementClient: unknown) => {
    const deps = createDeps({
      getWorkflowsManagementClient: jest.fn().mockReturnValue(managementClient),
    });
    registerListProposalsRoute(deps);
    return deps.router.versioned.getRoute('get', PND_PROPOSALS_URL).versions['1']
      .handler as unknown as (...args: unknown[]) => Promise<unknown>;
  };

  it('lists a pending gate whose parent watch lives in the global ("*") space', async () => {
    findAttackDiscoveryAlertsMock.mockResolvedValue([{ id: 'ad-1' }]);
    const managementClient = createPendingGatesClient(
      [
        waitingStep({
          id: 'exec-open',
          runId: 'run-open',
          stepId: PND_GATE_STEP_IDS.awaitOpenInvestigation,
        }),
      ],
      'ad-1'
    );

    const response = await invoke(listProposals(managementClient));

    expect(response.ok).toHaveBeenCalledWith(
      expect.objectContaining({ body: expect.objectContaining({ total: 1 }) })
    );
  });

  it('never routes the queue through the workflow-space-blind listWaitingForInputSteps', async () => {
    const managementClient = {
      ...createPendingGatesClient([]),
      listWaitingForInputSteps: jest.fn(),
    };

    await invoke(listProposals(managementClient));

    expect(managementClient.listWaitingForInputSteps).not.toHaveBeenCalled();
  });

  it('surfaces a failing queue read rather than reporting an empty queue', async () => {
    const managementClient = createPendingGatesClient([]);
    managementClient.getWorkflowExecutions.mockRejectedValue(new Error('boom'));

    const response = await invoke(listProposals(managementClient));

    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500 }));
  });
});

describe('PND security regression — S10 (duplicate proposals)', () => {
  it('collapses two pending gates for the same (correlationId, gateId) into one row', async () => {
    findAttackDiscoveryAlertsMock.mockResolvedValue([{ id: 'ad-1' }]);
    const steps = [
      waitingStep({
        id: 'exec-a',
        runId: 'run-a',
        startedAt: '2026-08-02T00:00:00.000Z',
        stepId: PND_GATE_STEP_IDS.awaitOpenInvestigation,
      }),
      waitingStep({
        id: 'exec-b',
        runId: 'run-b',
        startedAt: '2026-08-02T01:00:00.000Z',
        stepId: PND_GATE_STEP_IDS.awaitOpenInvestigation,
      }),
    ];
    // Both runs correlate to the same Attack Discovery, so both gates share the S10 key.
    const managementClient = createPendingGatesClient(steps, 'ad-1');
    const deps = createDeps({
      getWorkflowsManagementClient: jest.fn().mockReturnValue(managementClient),
    });
    registerListProposalsRoute(deps);
    const handler = deps.router.versioned.getRoute('get', PND_PROPOSALS_URL).versions['1']
      .handler as unknown as (...args: unknown[]) => Promise<unknown>;

    const response = await invoke(handler);

    expect(response.ok).toHaveBeenCalledWith(
      expect.objectContaining({ body: expect.objectContaining({ total: 1 }) })
    );
  });
});

describe('PND security regression — no unjustified internal-user client in pnd/server', () => {
  const serverRoot = join(__dirname, '..');

  /**
   * Every way `pnd/server` could obtain a client that runs as the Kibana **internal (system) user**
   * and therefore bypasses user-based security. Security finding D6: scanning for `asInternalUser`
   * alone was a false sense of safety — it is the Elasticsearch-client form, and the saved-objects
   * and request-level forms (which PND genuinely reaches for) went unchecked.
   */
  const INTERNAL_USER_IDENTIFIERS: readonly string[] = [
    'asInternalUser',
    'asSystemRequest',
    'createInternalRepository',
    'getUnsafeInternalClient',
  ];

  /**
   * The only internal-user uses PND is allowed, as `pnd/server`-relative path → identifiers.
   *
   * `scoped_internal_ui_settings_client` needs `getUnsafeInternalClient()` because the per-watch
   * autonomy level is a space-scoped uiSetting an analyst without `manage_advanced_settings` must
   * still be able to change: the route's own privilege check plus the
   * `PND_WATCH_WORKFLOW_IDS` key allow-list (S4) are the controls, not SO-level authz. Note
   * `createInternalRepository` is deliberately NOT justified anywhere — it has no spaces extension,
   * so `asScopedToNamespace` would silently collapse every space onto the default one.
   *
   * `get_proposals_activity` needs `asInternalUser` because `.workflows-step-executions` is a
   * Workflows **system index** the calling user has no privileges on, and the Workflows management
   * API exposes no aggregation method (adding one is a `@elastic/workflows-eng` CODEOWNERS change
   * outside this epic's scope). The controls are the four mitigations stated on the route and
   * pinned by `build_activity_query`'s own tests: `pnd_read`, a hard filter to
   * `PND_WATCH_WORKFLOW_IDS` **and** the four registry `stepId`s, a hard filter to the request's
   * space, and an aggregation-only read (`size: 0`, no `_source`) so only bucket counts ever leave
   * the server.
   */
  const JUSTIFIED_INTERNAL_USER_USES: Readonly<Record<string, readonly string[]>> = {
    'lib/scoped_internal_ui_settings_client/index.ts': ['getUnsafeInternalClient'],
    'routes/get/proposals_activity/get_proposals_activity.ts': ['asInternalUser'],
  };

  const tsFiles = (dir: string): string[] =>
    readdirSync(dir).flatMap((entry) => {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) return tsFiles(full);
      return entry.endsWith('.ts') && !entry.endsWith('.test.ts') ? [full] : [];
    });

  const isCommentLine = (line: string): boolean => {
    const trimmed = line.trim();
    return trimmed.startsWith('*') || trimmed.startsWith('//') || trimmed.startsWith('/*');
  };

  const relativeToServerRoot = (file: string): string => relative(serverRoot, file);

  const isJustified = (file: string, identifier: string): boolean =>
    (JUSTIFIED_INTERNAL_USER_USES[relativeToServerRoot(file)] ?? []).includes(identifier);

  /** `<pnd/server-relative path>:<identifier>` for every non-comment internal-user reference. */
  const internalUserReferences = (): string[] =>
    tsFiles(serverRoot).flatMap((file) =>
      readFileSync(file, 'utf8')
        .split('\n')
        .flatMap((line, index) =>
          isCommentLine(line)
            ? []
            : INTERNAL_USER_IDENTIFIERS.filter((identifier) => line.includes(identifier)).map(
                (identifier) => `${relativeToServerRoot(file)}:${index + 1}:${identifier}`
              )
        )
    );

  it('permits an internal-user client only where the use is recorded as justified (S3/D6)', () => {
    const offenders = tsFiles(serverRoot).flatMap((file) =>
      readFileSync(file, 'utf8')
        .split('\n')
        .flatMap((line, index) =>
          isCommentLine(line)
            ? []
            : INTERNAL_USER_IDENTIFIERS.filter(
                (identifier) => line.includes(identifier) && !isJustified(file, identifier)
              ).map((identifier) => `${relativeToServerRoot(file)}:${index + 1}:${identifier}`)
        )
    );

    expect(offenders).toEqual([]);
  });

  it('scans for every way to reach the internal user, not just the ES client (D6)', () => {
    expect(INTERNAL_USER_IDENTIFIERS).toEqual([
      'asInternalUser',
      'asSystemRequest',
      'createInternalRepository',
      'getUnsafeInternalClient',
    ]);
  });

  it('still finds each justified use, so the allow-list cannot rot (D6)', () => {
    const found = internalUserReferences().map((reference) => {
      const [file, , identifier] = reference.split(':');
      return `${file}:${identifier}`;
    });

    expect(found).toEqual(
      Object.entries(JUSTIFIED_INTERNAL_USER_USES).flatMap(([file, identifiers]) =>
        identifiers.map((identifier) => `${file}:${identifier}`)
      )
    );
  });
});
