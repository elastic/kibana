/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { ExecutionStatus } from '@kbn/workflows';
import { SYSTEM_SECURITY_WATCH_FLOOR_ID } from '@kbn/pnd-common';

import type { WatchWorkflowsManagementClient } from '../../services/watches/watch_workflows_management_client';
import { listAnsweredPndGates } from '.';

const SPACE_ID = 'agent-3';
const DOCUMENT_ID = `${SYSTEM_SECURITY_WATCH_FLOOR_ID}-${SPACE_ID}`;

const answeredStep = (overrides: Record<string, unknown> = {}) => ({
  finishedAt: '2026-08-02T00:10:00.000Z',
  hitl: { respondedAt: '2026-08-02T00:10:00.000Z', respondedBy: 'analyst' },
  id: 'step-exec-1',
  input: { message: 'Open an investigation?', schema: { type: 'object' } },
  output: { response: { decision: 'approve', rationale: 'The narrative holds up' } },
  startedAt: '2026-08-02T00:05:00.000Z',
  status: ExecutionStatus.COMPLETED,
  stepId: 'await_open_investigation',
  workflowId: DOCUMENT_ID,
  workflowRunId: 'run-1',
  ...overrides,
});

const createManagementClient = () =>
  ({
    getWorkflowExecution: jest.fn().mockResolvedValue({
      context: { event: { correlationId: 'ad-1' } },
      stepExecutions: [answeredStep()],
    }),
    getWorkflowExecutions: jest.fn().mockResolvedValue({
      results: [
        {
          id: 'run-1',
          startedAt: '2026-08-02T00:00:00.000Z',
          status: ExecutionStatus.COMPLETED,
          workflowId: DOCUMENT_ID,
        },
      ],
    }),
  } as unknown as jest.Mocked<
    Pick<WatchWorkflowsManagementClient, 'getWorkflowExecution' | 'getWorkflowExecutions'>
  >);

describe('listAnsweredPndGates', () => {
  it('queries the per-space document id, not the catalog definition id', async () => {
    const managementClient = createManagementClient();

    await listAnsweredPndGates({
      logger: loggerMock.create(),
      managementClient: managementClient as unknown as WatchWorkflowsManagementClient,
      spaceId: SPACE_ID,
      watchIds: [SYSTEM_SECURITY_WATCH_FLOOR_ID],
    });

    expect(managementClient.getWorkflowExecutions).toHaveBeenCalledWith(
      expect.objectContaining({ workflowId: DOCUMENT_ID }),
      SPACE_ID
    );
    expect(managementClient.getWorkflowExecutions).not.toHaveBeenCalledWith(
      expect.objectContaining({ workflowId: SYSTEM_SECURITY_WATCH_FLOOR_ID }),
      SPACE_ID
    );
  });

  it('lists an answered gate whose step.workflowId is the per-space document id', async () => {
    const managementClient = createManagementClient();

    const { results } = await listAnsweredPndGates({
      logger: loggerMock.create(),
      managementClient: managementClient as unknown as WatchWorkflowsManagementClient,
      spaceId: SPACE_ID,
      watchIds: [SYSTEM_SECURITY_WATCH_FLOOR_ID],
    });

    expect(results).toEqual([
      expect.objectContaining({ id: 'step-exec-1', workflowId: DOCUMENT_ID }),
    ]);
  });
});
