/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { ExecutionStatus } from '@kbn/workflows';
import { SYSTEM_SECURITY_WATCH_FLOOR_ID } from '@kbn/pnd-common';

import { createPendingGatesManagementClientMock } from '../../../../../lib/list_pending_pnd_gates/mocks';
import type { WatchWorkflowsManagementClient } from '../../../../../services/watches/watch_workflows_management_client';
import { resolvePendingGateStepExecutionIds } from '.';

const gateStep = (overrides: Record<string, unknown> = {}) => ({
  id: 'step-exec-1',
  startedAt: '2026-08-02T00:05:00.000Z',
  status: ExecutionStatus.WAITING_FOR_INPUT,
  stepId: 'await_open_investigation',
  workflowId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
  workflowRunId: 'run-1',
  ...overrides,
});

const invoke = (managementClient: { getWorkflowExecutions: jest.Mock }) =>
  resolvePendingGateStepExecutionIds({
    logger: loggerMock.create(),
    managementClient: managementClient as unknown as WatchWorkflowsManagementClient,
    spaceId: 'agent-3',
  });

describe('resolvePendingGateStepExecutionIds', () => {
  it('addresses the single gate a run is parked at', async () => {
    const managementClient = createPendingGatesManagementClientMock([
      { runId: 'run-1', stepExecutions: [gateStep()] },
    ]);

    const byRunId = await invoke(managementClient);

    expect(byRunId.get('run-1')).toEqual(['step-exec-1']);
  });

  it('collects every gate parked on the same run', async () => {
    const managementClient = createPendingGatesManagementClientMock([
      {
        runId: 'run-1',
        stepExecutions: [
          gateStep({ id: 'step-exec-1', stepId: 'await_open_investigation' }),
          gateStep({ id: 'step-exec-2', stepId: 'await_promote_incident' }),
        ],
      },
    ]);

    const byRunId = await invoke(managementClient);

    expect(byRunId.get('run-1')).toEqual(['step-exec-1', 'step-exec-2']);
  });

  it('collects gates owned by a global ("*") managed watch (kibana-idjb.21)', async () => {
    const managementClient = createPendingGatesManagementClientMock([
      { runId: 'run-1', stepExecutions: [gateStep()] },
    ]);

    const byRunId = await invoke(managementClient);

    expect(byRunId.size).toEqual(1);
  });

  it('scopes the listing to the resolved space (S9)', async () => {
    const managementClient = createPendingGatesManagementClientMock([
      { runId: 'run-1', stepExecutions: [gateStep()] },
    ]);

    await invoke(managementClient);

    expect(managementClient.getWorkflowExecutions).toHaveBeenCalledWith(
      expect.objectContaining({ size: 200 }),
      'agent-3'
    );
  });

  it('ignores steps that are not registered PND gates', async () => {
    const managementClient = createPendingGatesManagementClientMock([
      {
        runId: 'run-1',
        stepExecutions: [gateStep({ stepId: 'some_other_wait' })],
      },
    ]);

    const byRunId = await invoke(managementClient);

    expect(byRunId.size).toEqual(0);
  });

  it('degrades a failing listing to an empty map', async () => {
    const managementClient = createPendingGatesManagementClientMock([
      { runId: 'run-1', stepExecutions: [gateStep()] },
    ]);
    managementClient.getWorkflowExecutions.mockRejectedValue(new Error('boom'));

    const byRunId = await invoke(managementClient);

    expect(byRunId.size).toEqual(0);
  });
});
