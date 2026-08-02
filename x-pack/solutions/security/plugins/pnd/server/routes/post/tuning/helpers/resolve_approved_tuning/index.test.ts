/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscoveryApiAlert } from '@kbn/elastic-assistant-common';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import {
  PND_GATE_STEP_IDS,
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
  SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
} from '@kbn/pnd-common';
import { ExecutionStatus } from '@kbn/workflows';

import type { WatchWorkflowsManagementClient } from '../../../../../services/watches/watch_workflows_management_client';
import { listAnsweredPndGates } from '../../../../../lib/list_answered_pnd_gates';
import { findAttackDiscoveryAlerts } from '../../../../get/conversations/helpers/find_attack_discovery_alerts';
import { resolveApprovedTuningTarget } from '.';

jest.mock('../../../../../lib/list_answered_pnd_gates');
jest.mock('../../../../get/conversations/helpers/find_attack_discovery_alerts');

const listAnsweredPndGatesMock = listAnsweredPndGates as jest.MockedFunction<
  typeof listAnsweredPndGates
>;
const findAttackDiscoveryAlertsMock = findAttackDiscoveryAlerts as jest.MockedFunction<
  typeof findAttackDiscoveryAlerts
>;

const request = httpServerMock.createKibanaRequest();
const http = {} as never;
const logger = loggerMock.create();

const SOURCE_ID = `${SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID}:run-1:step-exec-1`;

const approvedStep = (overrides: Record<string, unknown> = {}) => ({
  finishedAt: '2026-08-02T00:10:00.000Z',
  hitl: { respondedAt: '2026-08-02T00:10:00.000Z', respondedBy: 'analyst' },
  id: 'step-exec-1',
  output: { response: { decision: 'approve', rationale: 'tune it' } },
  startedAt: '2026-08-02T00:05:00.000Z',
  status: ExecutionStatus.COMPLETED,
  stepId: PND_GATE_STEP_IDS.awaitApplyTuning,
  workflowId: SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
  workflowRunId: 'run-1',
  ...overrides,
});

const postIncidentExecution = (overrides: Record<string, unknown> = {}) => ({
  context: { event: { attackDiscoveryAlertId: 'ad-1' } },
  id: 'run-1',
  stepExecutions: [approvedStep()],
  workflowId: SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
  ...overrides,
});

const createManagementClient = (execution: unknown) =>
  ({
    getWorkflowExecution: jest.fn().mockResolvedValue(execution),
  } as unknown as WatchWorkflowsManagementClient);

const resolve = (overrides: Record<string, unknown> = {}) =>
  resolveApprovedTuningTarget({
    http,
    logger,
    managementClient: createManagementClient(postIncidentExecution()),
    proposalId: SOURCE_ID,
    request,
    spaceId: 'agent-3',
    ...overrides,
  });

describe('resolveApprovedTuningTarget', () => {
  beforeEach(() => {
    findAttackDiscoveryAlertsMock.mockResolvedValue([
      { id: 'ad-1' } as unknown as AttackDiscoveryApiAlert,
    ]);
    listAnsweredPndGatesMock.mockResolvedValue({
      answerByStepId: new Map(),
      attackDiscoveryIdByRunId: new Map(),
      reasoningByStepId: new Map(),
      results: [],
    });
  });

  it('resolves an approved Post-Incident apply-tuning gate addressed by source id', async () => {
    const result = await resolve();

    expect(result).toEqual({ status: 'ok' });
  });

  it('fetches the execution in the request space (S9)', async () => {
    const managementClient = createManagementClient(postIncidentExecution());

    await resolve({ managementClient });

    expect(managementClient.getWorkflowExecution).toHaveBeenCalledWith('run-1', 'agent-3', {
      includeInput: true,
      includeOutput: true,
    });
  });

  it('returns not_found when the execution is absent', async () => {
    const result = await resolve({ managementClient: createManagementClient(null) });

    expect(result.status).toBe('not_found');
  });

  it('rejects a source id that names a non-Post-Incident workflow', async () => {
    const result = await resolve({
      managementClient: createManagementClient(
        postIncidentExecution({ workflowId: SYSTEM_SECURITY_WATCH_FLOOR_ID })
      ),
    });

    expect(result.status).toBe('forbidden_workflow');
  });

  it('returns not_found when the step is not await_apply_tuning', async () => {
    const result = await resolve({
      managementClient: createManagementClient(
        postIncidentExecution({
          stepExecutions: [approvedStep({ stepId: PND_GATE_STEP_IDS.awaitOpenInvestigation })],
        })
      ),
    });

    expect(result.status).toBe('not_found');
  });

  it('returns not_approved when the gate was dismissed', async () => {
    const result = await resolve({
      managementClient: createManagementClient(
        postIncidentExecution({
          stepExecutions: [
            approvedStep({
              output: { response: { decision: 'dismiss', rationale: 'nope' } },
            }),
          ],
        })
      ),
    });

    expect(result.status).toBe('not_approved');
  });

  it('returns not_approved when the gate is still pending', async () => {
    const result = await resolve({
      managementClient: createManagementClient(
        postIncidentExecution({
          stepExecutions: [
            approvedStep({
              finishedAt: undefined,
              hitl: undefined,
              output: undefined,
              status: ExecutionStatus.WAITING_FOR_INPUT,
            }),
          ],
        })
      ),
    });

    expect(result.status).toBe('not_approved');
  });

  it('rejects when the caller cannot read the correlated discovery (S3)', async () => {
    findAttackDiscoveryAlertsMock.mockResolvedValue([]);

    const result = await resolve();

    expect(result.status).toBe('unreadable_discovery');
  });

  it('resolves a correlation id against an approved Post-Incident apply-tuning gate', async () => {
    listAnsweredPndGatesMock.mockResolvedValue({
      answerByStepId: new Map([['step-exec-1', { decision: 'approve', respondedAt: 't' }]]),
      attackDiscoveryIdByRunId: new Map([['run-1', 'ad-1']]),
      reasoningByStepId: new Map(),
      results: [approvedStep() as never],
    });

    const result = await resolve({ proposalId: 'ad-1' });

    expect(result.status).toBe('ok');
  });

  it('scopes the correlation-id search to the Post-Incident watch', async () => {
    await resolve({ proposalId: 'ad-1' });

    expect(listAnsweredPndGatesMock).toHaveBeenCalledWith({
      logger,
      managementClient: expect.any(Object),
      spaceId: 'agent-3',
      watchIds: [SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID],
    });
  });

  it('returns not_found when no approved apply-tuning gate maps to the correlation id', async () => {
    const result = await resolve({ proposalId: 'ad-1' });

    expect(result.status).toBe('not_found');
  });
});
