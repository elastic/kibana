/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { ExecutionStatus } from '@kbn/workflows';
import {
  PND_GATE_IDS,
  SYSTEM_SECURITY_WATCH_DEEP_ID,
  SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
} from '@kbn/pnd-common';

import { createPendingGatesManagementClientMock } from '../../../../../lib/list_pending_pnd_gates/mocks';
import type { WatchWorkflowsManagementClient } from '../../../../../services/watches/watch_workflows_management_client';
import { findPndProposalRow } from '.';

const parkedGate = ({
  startedAt = '2026-08-02T00:05:00.000Z',
  stepId = 'await_apply_tuning',
  id = 'step-exec-1',
}: { id?: string; startedAt?: string; stepId?: string } = {}) => ({
  id,
  input: { message: 'Apply a tuning to detection rule "Endpoint Security"?' },
  startedAt,
  status: ExecutionStatus.WAITING_FOR_INPUT,
  stepId,
  workflowId:
    stepId === 'await_apply_tuning'
      ? SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID
      : SYSTEM_SECURITY_WATCH_DEEP_ID,
  workflowRunId: 'run-1',
});

const reasoningStep = (finishedAt = '2026-08-02T00:04:00.000Z') => ({
  finishedAt,
  id: 'step-exec-reason',
  output: { reasoning: { summary: 'Two false positives in seven days' } },
  startedAt: '2026-08-02T00:03:00.000Z',
  status: ExecutionStatus.COMPLETED,
  stepId: 'reason_apply_tuning',
  workflowId: SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
  workflowRunId: 'run-1',
});

const createClient = (runs: Parameters<typeof createPendingGatesManagementClientMock>[0]) =>
  createPendingGatesManagementClientMock(runs) as unknown as WatchWorkflowsManagementClient;

const logger = loggerMock.create();

describe('findPndProposalRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the parked proposal row for the requested (alert, gate) pair', async () => {
    const managementClient = createClient([
      {
        correlationId: 'ad-1',
        runId: 'run-1',
        stepExecutions: [reasoningStep(), parkedGate()],
        workflowId: SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
      },
    ]);

    const row = await findPndProposalRow({
      correlationId: 'ad-1',
      gateId: PND_GATE_IDS.applyTuning,
      logger,
      managementClient,
      spaceId: 'agent-1',
    });

    expect(row).toEqual(
      expect.objectContaining({
        correlationId: 'ad-1',
        gateId: PND_GATE_IDS.applyTuning,
        reasoning: 'Two false positives in seven days',
      })
    );
  });

  it('reads only the watch that owns the gate', async () => {
    const managementClient = createClient([
      {
        correlationId: 'ad-1',
        runId: 'run-1',
        stepExecutions: [parkedGate()],
        workflowId: SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
      },
    ]);

    await findPndProposalRow({
      correlationId: 'ad-1',
      gateId: PND_GATE_IDS.applyTuning,
      logger,
      managementClient,
      spaceId: 'agent-1',
    });

    expect(managementClient.getWorkflowExecutions).toHaveBeenCalledTimes(1);
    expect(managementClient.getWorkflowExecutions).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowId: `${SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID}-agent-1`,
      }),
      'agent-1'
    );
  });

  it('returns undefined when the gate has not parked yet — the normal eager case', async () => {
    const managementClient = createClient([]);

    expect(
      await findPndProposalRow({
        correlationId: 'ad-1',
        gateId: PND_GATE_IDS.applyTuning,
        logger,
        managementClient,
        spaceId: 'agent-1',
      })
    ).toBeUndefined();
  });

  it('never returns another discovery’s row', async () => {
    const managementClient = createClient([
      {
        correlationId: 'ad-2',
        runId: 'run-1',
        stepExecutions: [parkedGate()],
        workflowId: SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
      },
    ]);

    expect(
      await findPndProposalRow({
        correlationId: 'ad-1',
        gateId: PND_GATE_IDS.applyTuning,
        logger,
        managementClient,
        spaceId: 'agent-1',
      })
    ).toBeUndefined();
  });

  it('returns undefined for an unregistered gate id rather than guessing a watch', async () => {
    const managementClient = createClient([]);

    expect(
      await findPndProposalRow({
        correlationId: 'ad-1',
        gateId: 'not_a_gate',
        logger,
        managementClient,
        spaceId: 'agent-1',
      })
    ).toBeUndefined();
    expect(managementClient.getWorkflowExecutions).not.toHaveBeenCalled();
  });

  it('keeps the newest row when one pair parked more than once (security finding S10)', async () => {
    const managementClient = createClient([
      {
        correlationId: 'ad-1',
        runId: 'run-1',
        stepExecutions: [
          parkedGate({ id: 'step-exec-old', startedAt: '2026-08-01T00:00:00.000Z' }),
          parkedGate({ id: 'step-exec-new', startedAt: '2026-08-03T00:00:00.000Z' }),
        ],
        workflowId: SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
      },
    ]);

    const row = await findPndProposalRow({
      correlationId: 'ad-1',
      gateId: PND_GATE_IDS.applyTuning,
      logger,
      managementClient,
      spaceId: 'agent-1',
    });

    expect(row?.stepExecutionId).toEqual('step-exec-new');
  });
});
