/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { ExecutionStatus } from '@kbn/workflows';
import { SYSTEM_SECURITY_WATCH_FLOOR_ID } from '@kbn/pnd-common';

import { createPendingGatesManagementClientMock } from '../../../../../lib/list_pending_pnd_gates/mocks';
import { findAttackDiscoveryAlerts } from '../../../conversations/helpers/find_attack_discovery_alerts';
import { listAgentBuilderConversations } from '../../../conversations/helpers/list_agent_builder_conversations';
import { readPendingProposalRows } from '.';

jest.mock('../../../conversations/helpers/find_attack_discovery_alerts');
jest.mock('../../../conversations/helpers/list_agent_builder_conversations');

const findAttackDiscoveryAlertsMock = findAttackDiscoveryAlerts as jest.Mock;
const listAgentBuilderConversationsMock = listAgentBuilderConversations as jest.Mock;

/** The `[Thread]` conversation id derived from (`ad-1`, `open_investigation`). */
const THREAD_CONVERSATION_ID = 'a1c2022a-57ea-5afa-a7fa-c85ff30b0001';

const http = { id: 'http' };

const createStartServices = (adWorkflowsEnabled: boolean) => {
  const get = jest.fn().mockResolvedValue(adWorkflowsEnabled);
  const uiSettings = { asScopedToClient: jest.fn().mockReturnValue({ get }) };
  const savedObjects = {
    getUnsafeInternalClient: jest
      .fn()
      .mockReturnValue({ asScopedToNamespace: jest.fn().mockReturnValue({}) }),
  };
  return jest.fn().mockResolvedValue([{ http, savedObjects, uiSettings }, {}, {}]);
};

const pendingStep = (overrides = {}) => ({
  id: 'step-exec-1',
  input: { message: 'Open an investigation?', schema: { type: 'object' } },
  startedAt: '2026-08-02T00:05:00.000Z',
  status: ExecutionStatus.WAITING_FOR_INPUT,
  stepId: 'await_open_investigation',
  workflowId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
  workflowRunId: 'run-1',
  ...overrides,
});

const reasoningStep = (overrides = {}) => ({
  finishedAt: '2026-08-02T00:04:00.000Z',
  id: 'step-exec-reason',
  output: { reasoning: { summary: 'Approve opening an investigation?' } },
  startedAt: '2026-08-02T00:03:00.000Z',
  status: ExecutionStatus.COMPLETED,
  stepId: 'reason_open_investigation',
  workflowId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
  workflowRunId: 'run-1',
  ...overrides,
});

const createManagementClient = () =>
  createPendingGatesManagementClientMock([
    {
      correlationId: 'ad-1',
      runId: 'run-1',
      stepExecutions: [reasoningStep(), pendingStep()],
    },
  ]);

const read = ({
  adWorkflowsEnabled = true,
  managementClient,
}: {
  adWorkflowsEnabled?: boolean;
  managementClient: ReturnType<typeof createManagementClient> | undefined;
}) =>
  readPendingProposalRows({
    getStartServices: createStartServices(adWorkflowsEnabled) as never,
    getWorkflowsManagementClient: jest.fn().mockReturnValue(managementClient),
    logger: loggerMock.create(),
    request: httpServerMock.createKibanaRequest(),
    spaceId: 'agent-3',
  });

describe('readPendingProposalRows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    findAttackDiscoveryAlertsMock.mockResolvedValue([{ id: 'ad-1' }]);
    listAgentBuilderConversationsMock.mockResolvedValue([]);
  });

  it('projects the space’s parked gates into proposal rows', async () => {
    const result = await read({ managementClient: createManagementClient() });

    expect(result).toEqual({
      outcome: 'ok',
      rows: [
        expect.objectContaining({
          correlationId: 'ad-1',
          gateId: 'open_investigation',
          reasoning: 'Approve opening an investigation?',
          recommendedAction: 'investigate',
          threadConversationId: THREAD_CONVERSATION_ID,
        }),
      ],
    });
  });

  it('reports the AD-2.0-disabled outcome without reading the queue', async () => {
    const managementClient = createManagementClient();

    const result = await read({ adWorkflowsEnabled: false, managementClient });

    expect(result).toEqual({ outcome: 'ad_workflows_disabled' });
    expect(managementClient.getWorkflowExecutions).not.toHaveBeenCalled();
  });

  it('reports the workflows-unavailable outcome when there is no management client', async () => {
    const result = await read({ managementClient: undefined });

    expect(result).toEqual({ outcome: 'workflows_unavailable' });
  });

  it('scopes the listing to the space it was given (S9)', async () => {
    const managementClient = createManagementClient();

    await read({ managementClient });

    expect(managementClient.getWorkflowExecutions).toHaveBeenCalledWith(
      expect.any(Object),
      'agent-3'
    );
  });

  it('de-duplicates re-triggered gates by (correlationId, gateId) (S10)', async () => {
    const managementClient = createPendingGatesManagementClientMock([
      {
        correlationId: 'ad-1',
        runId: 'run-1',
        startedAt: '2026-08-02T00:00:00.000Z',
        stepExecutions: [pendingStep({ id: 'step-exec-1', workflowRunId: 'run-1' })],
      },
      {
        correlationId: 'ad-1',
        runId: 'run-2',
        startedAt: '2026-08-02T01:00:00.000Z',
        stepExecutions: [
          pendingStep({
            id: 'step-exec-2',
            startedAt: '2026-08-02T01:05:00.000Z',
            workflowRunId: 'run-2',
          }),
        ],
      },
    ]);

    const result = await read({ managementClient });

    expect(result).toEqual({
      outcome: 'ok',
      rows: [expect.objectContaining({ stepExecutionId: 'step-exec-2' })],
    });
  });

  it('omits a gate whose attack discovery the caller cannot read (S3/D3)', async () => {
    findAttackDiscoveryAlertsMock.mockResolvedValue([]);

    const result = await read({ managementClient: createManagementClient() });

    expect(result).toEqual({ outcome: 'ok', rows: [] });
  });

  it('resolves the paired thread’s title onto each row (D9)', async () => {
    listAgentBuilderConversationsMock.mockResolvedValue([
      { id: THREAD_CONVERSATION_ID, title: 'Lateral movement on host-7' },
    ]);

    const result = await read({ managementClient: createManagementClient() });

    expect(result).toEqual({
      outcome: 'ok',
      rows: [expect.objectContaining({ threadTitle: 'Lateral movement on host-7' })],
    });
  });

  it('still returns the rows when the thread-title enrichment fails', async () => {
    listAgentBuilderConversationsMock.mockRejectedValue(new Error('boom'));

    const result = await read({ managementClient: createManagementClient() });

    expect(result).toEqual({
      outcome: 'ok',
      rows: [expect.objectContaining({ gateId: 'open_investigation' })],
    });
  });
});
