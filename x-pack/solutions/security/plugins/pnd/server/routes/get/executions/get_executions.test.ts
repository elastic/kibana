/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockRouter } from '@kbn/core-http-router-server-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import {
  ORCHESTRATOR_STEP_IDS,
  PHASE_CATALOG,
  PND_EXECUTION_URL_TEMPLATE,
  PND_GATE_STEP_IDS,
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
  SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
} from '@kbn/pnd-common';
import { ExecutionStatus, WorkflowsManagementOperationPrivileges } from '@kbn/workflows';

import {
  PND_API_PRIVILEGE_READ,
  PND_EXECUTION_CORRELATED_HEADER,
} from '../../../../common/constants';
import type { RouteDependencies } from '../../register_routes';
import { correlateExecutions } from '../runs/helpers/correlate_executions';
import { findAttackDiscoveryAlerts } from '../conversations/helpers/find_attack_discovery_alerts';
import type { CorrelatedExecution } from '../runs/helpers/correlate_executions';
import { registerGetExecutionRoute } from './get_executions';

jest.mock('../runs/helpers/correlate_executions');
jest.mock('../conversations/helpers/find_attack_discovery_alerts');

const correlateExecutionsMock = correlateExecutions as jest.Mock;
const findAttackDiscoveryAlertsMock = findAttackDiscoveryAlerts as jest.Mock;

const http = { id: 'http' };

const AD_ID = 'ad-1';

const correlatedExecution = (overrides: {
  correlationId?: string;
  id?: string;
  startedAt?: string;
  watchId?: string;
}): CorrelatedExecution =>
  ({
    correlationId: overrides.correlationId ?? AD_ID,
    event: undefined,
    execution: {
      id: overrides.id ?? 'run-deep',
      startedAt: overrides.startedAt ?? '',
      status: 'waiting_for_input',
    },
    watchId: overrides.watchId ?? SYSTEM_SECURITY_WATCH_FLOOR_ID,
  } as unknown as CorrelatedExecution);

const stepExecution = (id: string, stepId: string, overrides: Record<string, unknown> = {}) => ({
  finishedAt: '2026-08-02T00:05:00.000Z',
  id,
  startedAt: '2026-08-02T00:00:00.000Z',
  status: ExecutionStatus.COMPLETED,
  stepExecutionIndex: 0,
  stepId,
  workflowId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
  workflowRunId: 'run-deep',
  ...overrides,
});

const createDeps = (getWorkflowExecution: jest.Mock = jest.fn().mockResolvedValue(null)) => {
  const router = mockRouter.create();
  const deps = {
    config: { enabled: true, ui: { useMockData: false } },
    getSpaceId: jest.fn().mockReturnValue('agent-3'),
    getStartServices: jest.fn().mockResolvedValue([{ http }, {}, {}]),
    getWatchProjection: jest.fn(),
    getWorkflowsManagementClient: jest.fn().mockReturnValue({ getWorkflowExecution }),
    logger: loggerMock.create(),
    router,
  } as unknown as RouteDependencies & { router: ReturnType<typeof mockRouter.create> };

  return deps;
};

const getHandler = (router: ReturnType<typeof mockRouter.create>) =>
  router.versioned.getRoute('get', PND_EXECUTION_URL_TEMPLATE).versions['1'].handler;

const invoke = async (handler: ReturnType<typeof getHandler>, correlationId: string = AD_ID) => {
  const request = httpServerMock.createKibanaRequest({ params: { correlationId } });
  const response = httpServerMock.createResponseFactory();
  const context = {} as unknown as Parameters<typeof handler>[0];

  await handler(context, request, response);

  return response;
};

describe('registerGetExecutionRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    correlateExecutionsMock.mockResolvedValue([]);
    findAttackDiscoveryAlertsMock.mockResolvedValue([{ id: AD_ID }]);
  });

  it('gates the route on the read privilege', () => {
    const deps = createDeps();

    registerGetExecutionRoute(deps);

    expect(
      deps.router.versioned.getRoute('get', PND_EXECUTION_URL_TEMPLATE).config.security
    ).toEqual({
      authz: {
        requiredPrivileges: [
          PND_API_PRIVILEGE_READ,
          ...WorkflowsManagementOperationPrivileges.readManagedExecution,
        ],
      },
    });
  });

  it('returns a 503 when the workflows management client is unavailable', async () => {
    const deps = createDeps();
    (deps.getWorkflowsManagementClient as jest.Mock).mockReturnValue(undefined);
    registerGetExecutionRoute(deps);

    const response = await invoke(getHandler(deps.router));

    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 503 }));
  });

  it('resolves the discovery as the calling user (S3) and 404s when it is not readable', async () => {
    findAttackDiscoveryAlertsMock.mockResolvedValue([]);
    const deps = createDeps();
    registerGetExecutionRoute(deps);

    const response = await invoke(getHandler(deps.router));

    expect(findAttackDiscoveryAlertsMock).toHaveBeenCalledWith(
      expect.objectContaining({ http, ids: [AD_ID], spaceId: 'agent-3' })
    );
    expect(response.notFound).toHaveBeenCalled();
    expect(correlateExecutionsMock).not.toHaveBeenCalled();
  });

  it('correlates both orchestrators, and nothing else, in the request space', async () => {
    const deps = createDeps();
    registerGetExecutionRoute(deps);

    await invoke(getHandler(deps.router));

    expect(correlateExecutionsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        spaceId: 'agent-3',
        watchIds: [SYSTEM_SECURITY_WATCH_FLOOR_ID, SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID],
      })
    );
  });

  it('caps the correlation window per workflow rather than across both', async () => {
    const deps = createDeps();
    registerGetExecutionRoute(deps);

    await invoke(getHandler(deps.router));

    const { mergedSize, size } = correlateExecutionsMock.mock.calls[0][0];
    expect(mergedSize).toBe(size * 2);
  });

  describe('nothing has run yet', () => {
    it('returns the always-complete skeleton with no live status', async () => {
      const deps = createDeps();
      registerGetExecutionRoute(deps);

      const response = await invoke(getHandler(deps.router));

      const body = (response.ok as jest.Mock).mock.calls[0][0].body;
      expect(body.correlationId).toBe(AD_ID);
      expect(body.steps).toHaveLength(PHASE_CATALOG.length);
      expect(body.steps.map((s: { phaseStepId: string }) => s.phaseStepId)).toEqual(
        PHASE_CATALOG.map((entry) => entry.id)
      );
      const stepOneOne = body.steps.find(
        (s: { phaseStepId: string }) => s.phaseStepId === 'step-1-1'
      );
      expect(stepOneOne).toEqual({ phaseStepId: 'step-1-1', status: 'not_started' });
    });

    it('stamps the correlation signal false so an empty skeleton is not a blank one', async () => {
      const deps = createDeps();
      registerGetExecutionRoute(deps);

      const response = await invoke(getHandler(deps.router));

      expect((response.ok as jest.Mock).mock.calls[0][0].headers).toEqual({
        [PND_EXECUTION_CORRELATED_HEADER]: 'false',
      });
    });
  });

  describe('Watch Floor parked at the first gate', () => {
    const getWorkflowExecution = jest.fn().mockResolvedValue({
      stepExecutions: [
        stepExecution('se-derive', ORCHESTRATOR_STEP_IDS.deriveIds),
        stepExecution('se-open', ORCHESTRATOR_STEP_IDS.openInvestigation, {
          finishedAt: '',
          status: ExecutionStatus.RUNNING,
        }),
        stepExecution('se-gate', PND_GATE_STEP_IDS.awaitPromoteIncident, {
          finishedAt: '',
          status: ExecutionStatus.WAITING_FOR_INPUT,
        }),
      ],
    });

    beforeEach(() => {
      correlateExecutionsMock.mockResolvedValue([correlatedExecution({ id: 'run-deep' })]);
    });

    it('shows phase 1 complete, step 2.1 in progress, the gate pending, and upstream rows upstream', async () => {
      const deps = createDeps(getWorkflowExecution);
      registerGetExecutionRoute(deps);

      const response = await invoke(getHandler(deps.router));

      const body: {
        steps: Array<{ phaseStepId: string; status: string; deepLinkPath?: string }>;
      } = (response.ok as jest.Mock).mock.calls[0][0].body;
      const byId = new Map(body.steps.map((s) => [s.phaseStepId, s]));

      expect(byId.get('step-1-1')?.status).toBe('completed');
      expect(byId.get('step-1-1')?.deepLinkPath).toBe(
        `/${SYSTEM_SECURITY_WATCH_FLOOR_ID}?tab=executions&executionId=run-deep&stepExecutionId=se-derive`
      );
      expect(byId.get('step-2-1')?.status).toBe('running');
      expect(byId.get('step-2-7')?.status).toBe('waiting_for_input');
      expect(byId.get('gate-promote-incident')?.status).toBe('waiting_for_input');
      expect(byId.get('step-1-2')?.status).toBe('upstream');
      expect(byId.get('step-2-6')?.status).toBe('not_started');
    });

    it('stamps the correlation signal true once a run correlated', async () => {
      const deps = createDeps(getWorkflowExecution);
      registerGetExecutionRoute(deps);

      const response = await invoke(getHandler(deps.router));

      expect((response.ok as jest.Mock).mock.calls[0][0].headers).toEqual({
        [PND_EXECUTION_CORRELATED_HEADER]: 'true',
      });
    });
  });

  // kibana-phf4.12 retired the lifecycle stub, so nothing in a correlated run can realize an upstream
  // row: Attack Discovery does that work before PND is invoked. The row is resolved from the catalog.
  describe('an upstream row with a same-named step in the correlated run', () => {
    const getWorkflowExecution = jest.fn().mockResolvedValue({
      stepExecutions: [
        stepExecution('se-derive', ORCHESTRATOR_STEP_IDS.deriveIds),
        stepExecution('se-upstream', 'step-1-2'),
      ],
    });

    beforeEach(() => {
      correlateExecutionsMock.mockResolvedValue([
        correlatedExecution({ id: 'run-deep', watchId: SYSTEM_SECURITY_WATCH_FLOOR_ID }),
      ]);
    });

    it('still reads upstream, with no step-level link to open', async () => {
      const deps = createDeps(getWorkflowExecution);
      registerGetExecutionRoute(deps);

      const response = await invoke(getHandler(deps.router));

      const body: {
        steps: Array<{ deepLinkPath?: string; phaseStepId: string; status: string }>;
      } = (response.ok as jest.Mock).mock.calls[0][0].body;
      const byId = new Map(body.steps.map((s) => [s.phaseStepId, s]));

      expect(byId.get('step-1-2')).toEqual({ phaseStepId: 'step-1-2', status: 'upstream' });
    });
  });

  describe('an answered gate is the waitForInput step itself', () => {
    const getWorkflowExecution = jest.fn().mockResolvedValue({
      stepExecutions: [
        stepExecution('se-derive', ORCHESTRATOR_STEP_IDS.deriveIds),
        stepExecution('se-gate-open', PND_GATE_STEP_IDS.awaitOpenInvestigation),
      ],
    });

    beforeEach(() => {
      correlateExecutionsMock.mockResolvedValue([correlatedExecution({ id: 'run-deep' })]);
    });

    it('reads completed for the answered gate', async () => {
      const deps = createDeps(getWorkflowExecution);
      registerGetExecutionRoute(deps);

      const response = await invoke(getHandler(deps.router));

      const body: { steps: Array<{ phaseStepId: string; status: string }> } = (
        response.ok as jest.Mock
      ).mock.calls[0][0].body;
      const byId = new Map(body.steps.map((s) => [s.phaseStepId, s]));

      expect(byId.get('gate-open-investigation')?.status).toBe('completed');
    });
  });

  describe('the discovery was re-triggered', () => {
    it('reads step executions from the newest run of each workflow only', async () => {
      correlateExecutionsMock.mockResolvedValue([
        correlatedExecution({ id: 'run-deep-new', startedAt: '2026-08-02T00:00:00.000Z' }),
        correlatedExecution({ id: 'run-deep-stale', startedAt: '2026-08-01T00:00:00.000Z' }),
      ]);
      const getWorkflowExecution = jest.fn().mockResolvedValue({ stepExecutions: [] });
      const deps = createDeps(getWorkflowExecution);
      registerGetExecutionRoute(deps);

      await invoke(getHandler(deps.router));

      expect(getWorkflowExecution).toHaveBeenCalledTimes(1);
      expect(getWorkflowExecution).toHaveBeenCalledWith('run-deep-new', 'agent-3', {
        request: expect.any(Object),
      });
    });
  });

  describe('both orchestrators complete', () => {
    it('aggregates Detection Watch steps under phase 4 in the same response', async () => {
      correlateExecutionsMock.mockResolvedValue([
        correlatedExecution({ id: 'run-deep', watchId: SYSTEM_SECURITY_WATCH_FLOOR_ID }),
        correlatedExecution({
          id: 'run-detection',
          watchId: SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
        }),
      ]);
      const getWorkflowExecution = jest.fn(async (runId: string) =>
        runId === 'run-detection'
          ? {
              stepExecutions: [
                stepExecution('se-draft', ORCHESTRATOR_STEP_IDS.draftTuning, {
                  workflowId: SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
                  workflowRunId: 'run-detection',
                }),
                stepExecution('se-apply', ORCHESTRATOR_STEP_IDS.tuningApplied, {
                  workflowId: SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
                  workflowRunId: 'run-detection',
                }),
              ],
            }
          : { stepExecutions: [stepExecution('se-derive', ORCHESTRATOR_STEP_IDS.deriveIds)] }
      );
      const deps = createDeps(getWorkflowExecution);
      registerGetExecutionRoute(deps);

      const response = await invoke(getHandler(deps.router));

      const body: { steps: Array<{ phaseStepId: string; status: string; workflowId?: string }> } = (
        response.ok as jest.Mock
      ).mock.calls[0][0].body;
      const byId = new Map(body.steps.map((s) => [s.phaseStepId, s]));

      expect(byId.get('step-4-2')?.status).toBe('completed');
      expect(byId.get('step-4-2')?.workflowId).toBe(SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID);
      expect(byId.get('step-4-4')?.status).toBe('completed');
      expect(byId.get('step-4-4')?.workflowId).toBe(SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID);
      expect(byId.get('step-1-1')?.status).toBe('completed');
    });
  });

  // The per-action containment ledger rides the same projection: the Watch Floor's
  // `collect_executed_actions` data.set step publishes it under `containment_executed_actions`,
  // and the route surfaces it as `containmentActions`. Fail-open to absence — a run that has not
  // reached the collector (or recorded an unexpected shape) yields no key, never an error.
  describe('containment action ledger', () => {
    const LEDGER = [
      { action_type: 'isolate_host', status: 'submitted', title: 'Isolate host-1' },
      { action_type: 'create_case', status: 'succeeded', title: 'Open a case for the incident' },
    ];

    beforeEach(() => {
      correlateExecutionsMock.mockResolvedValue([correlatedExecution({ id: 'run-deep' })]);
    });

    const bodyFor = async (stepExecutions: unknown[]) => {
      const getWorkflowExecution = jest.fn().mockResolvedValue({ stepExecutions });
      const deps = createDeps(getWorkflowExecution);
      registerGetExecutionRoute(deps);

      const response = await invoke(getHandler(deps.router));

      return (response.ok as jest.Mock).mock.calls[0][0].body as {
        containmentActions?: Array<Record<string, unknown>>;
      };
    };

    it('projects the ledger from the collector step output', async () => {
      const body = await bodyFor([
        stepExecution('se-derive', ORCHESTRATOR_STEP_IDS.deriveIds),
        stepExecution('se-collect', ORCHESTRATOR_STEP_IDS.executeActions, {
          output: { containment_executed_actions: LEDGER },
        }),
      ]);

      expect(body.containmentActions).toEqual(LEDGER);
    });

    it('omits the key entirely when the run has not reached the collector', async () => {
      const body = await bodyFor([stepExecution('se-derive', ORCHESTRATOR_STEP_IDS.deriveIds)]);

      expect(body).not.toHaveProperty('containmentActions');
    });

    it('degrades to absence when the collector output carries no array ledger', async () => {
      const body = await bodyFor([
        stepExecution('se-collect', ORCHESTRATOR_STEP_IDS.executeActions, {
          output: { containment_executed_actions: 'not-a-ledger' },
        }),
      ]);

      expect(body).not.toHaveProperty('containmentActions');
    });

    it('reads the newest collector when a re-triggered run recorded two', async () => {
      const body = await bodyFor([
        stepExecution('se-collect-old', ORCHESTRATOR_STEP_IDS.executeActions, {
          output: { containment_executed_actions: [{ action_type: 'stale' }] },
          startedAt: '2026-08-01T00:00:00.000Z',
        }),
        stepExecution('se-collect-new', ORCHESTRATOR_STEP_IDS.executeActions, {
          output: { containment_executed_actions: LEDGER },
          startedAt: '2026-08-02T00:00:00.000Z',
        }),
      ]);

      expect(body.containmentActions).toEqual(LEDGER);
    });
  });

  it('ignores correlated runs for a different discovery', async () => {
    correlateExecutionsMock.mockResolvedValue([
      correlatedExecution({ correlationId: 'ad-other', id: 'run-other' }),
    ]);
    const getWorkflowExecution = jest.fn().mockResolvedValue({ stepExecutions: [] });
    const deps = createDeps(getWorkflowExecution);
    registerGetExecutionRoute(deps);

    await invoke(getHandler(deps.router));

    expect(getWorkflowExecution).not.toHaveBeenCalled();
  });

  it('returns a 500 when correlation throws', async () => {
    correlateExecutionsMock.mockRejectedValue(new Error('boom'));
    const deps = createDeps();
    registerGetExecutionRoute(deps);

    const response = await invoke(getHandler(deps.router));

    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500 }));
  });
});
