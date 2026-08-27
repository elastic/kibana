/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { ExecutionStatus } from '@kbn/workflows';
import {
  PND_WATCH_WORKFLOW_IDS,
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
  SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
  SYSTEM_SECURITY_WATCH_OFFICER_ID,
} from '@kbn/pnd-common';

import type { WatchWorkflowsManagementClient } from '../../services/watches/watch_workflows_management_client';
import { listPendingPndGates, PND_PENDING_GATES_MAX_RUNS } from '.';

const SPACE_ID = 'agent-3';
const floorDocumentId = `${SYSTEM_SECURITY_WATCH_FLOOR_ID}-${SPACE_ID}`;

const parkedRun = (overrides: Record<string, unknown> = {}) => ({
  id: 'run-1',
  startedAt: '2026-08-02T00:00:00.000Z',
  status: ExecutionStatus.WAITING_FOR_INPUT,
  workflowId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
  ...overrides,
});

const waitingStep = (overrides: Record<string, unknown> = {}) => ({
  id: 'step-exec-1',
  input: { message: 'Open an investigation?', schema: { type: 'object' } },
  startedAt: '2026-08-02T00:05:00.000Z',
  status: ExecutionStatus.WAITING_FOR_INPUT,
  stepId: 'await_open_investigation',
  workflowId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
  workflowRunId: 'run-1',
  ...overrides,
});

const reasoningStep = (overrides: Record<string, unknown> = {}) => ({
  finishedAt: '2026-08-02T00:04:00.000Z',
  id: 'step-exec-reason',
  output: { reasoning: { summary: 'Attack discovery ad-1 needs an investigation.' } },
  startedAt: '2026-08-02T00:03:00.000Z',
  status: ExecutionStatus.COMPLETED,
  stepId: 'reason_open_investigation',
  workflowId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
  workflowRunId: 'run-1',
  ...overrides,
});

/**
 * A management client whose executions listing behaves the way the live one does for a **global**
 * (`'*'`) managed watch: the execution documents carry the emitting space, so they resolve normally.
 */
const createManagementClient = ({
  runsByWatchId = { [floorDocumentId]: [parkedRun()] },
  stepExecutions = [reasoningStep(), waitingStep()],
  context = { event: { correlationId: 'ad-1' } },
}: {
  context?: Record<string, unknown>;
  runsByWatchId?: Record<string, Array<Record<string, unknown>>>;
  stepExecutions?: Array<Record<string, unknown>>;
} = {}) =>
  ({
    getWorkflowExecution: jest.fn().mockResolvedValue({ context, stepExecutions }),
    getWorkflowExecutions: jest
      .fn()
      .mockImplementation(async ({ workflowId }: { workflowId: string }) => ({
        results: runsByWatchId[workflowId] ?? [],
      })),
    listWaitingForInputSteps: jest.fn(),
  } as unknown as jest.Mocked<
    Pick<
      WatchWorkflowsManagementClient,
      'getWorkflowExecution' | 'getWorkflowExecutions' | 'listWaitingForInputSteps'
    >
  >);

const invoke = (
  managementClient: ReturnType<typeof createManagementClient>,
  overrides: Partial<Parameters<typeof listPendingPndGates>[0]> = {}
) =>
  listPendingPndGates({
    logger: loggerMock.create(),
    managementClient: managementClient as unknown as WatchWorkflowsManagementClient,
    spaceId: SPACE_ID,
    ...overrides,
  });

describe('listPendingPndGates', () => {
  it('lists the pending gate of a run started by a global ("*") managed watch (kibana-idjb.21)', async () => {
    const managementClient = createManagementClient();

    const { results } = await invoke(managementClient);

    expect(results).toEqual([expect.objectContaining({ id: 'step-exec-1' })]);
  });

  it('never routes the listing through the workflow-space-blind listWaitingForInputSteps', async () => {
    const managementClient = createManagementClient();

    await invoke(managementClient);

    expect(managementClient.listWaitingForInputSteps).not.toHaveBeenCalled();
  });

  it('asks for the parked runs of every PND watch by default', async () => {
    const managementClient = createManagementClient();

    await invoke(managementClient);

    expect(managementClient.getWorkflowExecutions).toHaveBeenCalledTimes(
      PND_WATCH_WORKFLOW_IDS.length
    );
  });

  it('asks only for runs already parked on an input wait', async () => {
    const managementClient = createManagementClient();

    await invoke(managementClient);

    expect(managementClient.getWorkflowExecutions).toHaveBeenCalledWith(
      expect.objectContaining({ statuses: [ExecutionStatus.WAITING_FOR_INPUT] }),
      SPACE_ID
    );
  });

  it('scopes the executions listing to the space resolved from the request (S9)', async () => {
    const managementClient = createManagementClient();

    await invoke(managementClient);

    expect(managementClient.getWorkflowExecutions).toHaveBeenCalledWith(
      expect.any(Object),
      SPACE_ID
    );
  });

  it('restricts the listing to the requested watch ids', async () => {
    const managementClient = createManagementClient();

    await invoke(managementClient, { watchIds: [SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID] });

    expect(managementClient.getWorkflowExecutions).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowId: `${SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID}-${SPACE_ID}`,
      }),
      SPACE_ID
    );
  });

  it('queries the per-space document id, not the catalog definition id', async () => {
    const managementClient = createManagementClient();

    await invoke(managementClient, { watchIds: [SYSTEM_SECURITY_WATCH_FLOOR_ID] });

    expect(managementClient.getWorkflowExecutions).toHaveBeenCalledWith(
      expect.objectContaining({ workflowId: `${SYSTEM_SECURITY_WATCH_FLOOR_ID}-${SPACE_ID}` }),
      SPACE_ID
    );
    expect(managementClient.getWorkflowExecutions).not.toHaveBeenCalledWith(
      expect.objectContaining({ workflowId: SYSTEM_SECURITY_WATCH_FLOOR_ID }),
      SPACE_ID
    );
  });

  it('lists a pending gate whose step.workflowId is the per-space document id', async () => {
    const documentId = `${SYSTEM_SECURITY_WATCH_FLOOR_ID}-${SPACE_ID}`;
    const managementClient = createManagementClient({
      runsByWatchId: { [documentId]: [parkedRun({ workflowId: documentId })] },
      stepExecutions: [waitingStep({ workflowId: documentId })],
    });

    const { results } = await invoke(managementClient, {
      watchIds: [SYSTEM_SECURITY_WATCH_FLOOR_ID],
    });

    expect(results).toEqual([
      expect.objectContaining({ id: 'step-exec-1', workflowId: documentId }),
    ]);
  });

  it('reads each parked run with its step inputs so the gate prompt survives', async () => {
    const managementClient = createManagementClient();

    await invoke(managementClient);

    expect(managementClient.getWorkflowExecution).toHaveBeenCalledWith('run-1', SPACE_ID, {
      includeInput: true,
      includeOutput: true,
    });
  });

  it('drops a settled wait step', async () => {
    const managementClient = createManagementClient({
      stepExecutions: [waitingStep({ finishedAt: '2026-08-02T00:06:00.000Z' })],
    });

    const { results } = await invoke(managementClient);

    expect(results).toEqual([]);
  });

  it('drops a wait step that has already been responded to', async () => {
    const managementClient = createManagementClient({
      stepExecutions: [waitingStep({ hitl: { respondedAt: '2026-08-02T00:06:00.000Z' } })],
    });

    const { results } = await invoke(managementClient);

    expect(results).toEqual([]);
  });

  it("drops watch_officer's unregistered await_approval gate (D4)", async () => {
    const managementClient = createManagementClient({
      runsByWatchId: {
        [`${SYSTEM_SECURITY_WATCH_OFFICER_ID}-${SPACE_ID}`]: [
          parkedRun({ workflowId: SYSTEM_SECURITY_WATCH_OFFICER_ID }),
        ],
      },
      stepExecutions: [
        waitingStep({ stepId: 'await_approval', workflowId: SYSTEM_SECURITY_WATCH_OFFICER_ID }),
      ],
    });

    const { results } = await invoke(managementClient);

    expect(results).toEqual([]);
  });

  it('drops a wait step whose step id is not a registered gate (D4)', async () => {
    const managementClient = createManagementClient({
      stepExecutions: [waitingStep({ stepId: 'some_other_wait' })],
    });

    const { results } = await invoke(managementClient);

    expect(results).toEqual([]);
  });

  it('drops a wait step whose workflow is not the gate owner (D4)', async () => {
    const managementClient = createManagementClient({
      stepExecutions: [waitingStep({ workflowId: SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID })],
    });

    const { results } = await invoke(managementClient);

    expect(results).toEqual([]);
  });

  it('does not resolve reasoning for an unregistered wait step (D4)', async () => {
    const managementClient = createManagementClient({
      stepExecutions: [reasoningStep(), waitingStep({ stepId: 'await_approval' })],
    });

    const { reasoningByStepId } = await invoke(managementClient, { includeReasoning: true });

    expect(reasoningByStepId.size).toBe(0);
  });

  it('drops a step that is not waiting for input', async () => {
    const managementClient = createManagementClient({
      stepExecutions: [waitingStep({ status: ExecutionStatus.RUNNING })],
    });

    const { results } = await invoke(managementClient);

    expect(results).toEqual([]);
  });

  it('de-duplicates step executions that appear under more than one listed run', async () => {
    const managementClient = createManagementClient({
      runsByWatchId: {
        [floorDocumentId]: [parkedRun(), parkedRun({ id: 'run-1' })],
      },
    });

    const { results } = await invoke(managementClient);

    expect(results).toHaveLength(1);
  });

  it('correlates each parked run to its attack discovery id', async () => {
    const managementClient = createManagementClient();

    const { attackDiscoveryIdByRunId } = await invoke(managementClient);

    expect(attackDiscoveryIdByRunId.get('run-1')).toBe('ad-1');
  });

  it('correlates an uncorrelated run to an empty id', async () => {
    const managementClient = createManagementClient({ context: {} });

    const { attackDiscoveryIdByRunId } = await invoke(managementClient);

    expect(attackDiscoveryIdByRunId.get('run-1')).toBe('');
  });

  it('resolves the reasoning of the step that finished last before the gate opened (C12)', async () => {
    const managementClient = createManagementClient();

    const { reasoningByStepId } = await invoke(managementClient, { includeReasoning: true });

    expect(reasoningByStepId.get('step-exec-1')).toEqual({
      summary: 'Attack discovery ad-1 needs an investigation.',
    });
  });

  it('ignores a candidate that finished after the gate opened (C12)', async () => {
    const managementClient = createManagementClient({
      stepExecutions: [reasoningStep({ finishedAt: '2026-08-02T00:09:00.000Z' }), waitingStep()],
    });

    const { reasoningByStepId } = await invoke(managementClient, { includeReasoning: true });

    expect(reasoningByStepId.has('step-exec-1')).toBe(false);
  });

  it('prefers the latest of several completed predecessors (C12)', async () => {
    const managementClient = createManagementClient({
      stepExecutions: [
        reasoningStep({
          finishedAt: '2026-08-02T00:01:00.000Z',
          id: 'step-exec-older',
          output: { reasoning: { summary: 'stale' } },
        }),
        reasoningStep(),
        waitingStep(),
      ],
    });

    const { reasoningByStepId } = await invoke(managementClient, { includeReasoning: true });

    expect(reasoningByStepId.get('step-exec-1')).toEqual({
      summary: 'Attack discovery ad-1 needs an investigation.',
    });
  });

  it('does not resolve reasoning when it was not requested', async () => {
    const managementClient = createManagementClient();

    const { reasoningByStepId } = await invoke(managementClient);

    expect(reasoningByStepId.size).toBe(0);
  });

  it('propagates a failing executions listing rather than reporting an empty queue', async () => {
    const managementClient = createManagementClient();
    managementClient.getWorkflowExecutions.mockRejectedValue(new Error('boom'));

    await expect(invoke(managementClient)).rejects.toThrow('boom');
  });

  it('propagates a failing run read rather than reporting an empty queue', async () => {
    const managementClient = createManagementClient();
    managementClient.getWorkflowExecution.mockRejectedValue(new Error('boom'));

    await expect(invoke(managementClient)).rejects.toThrow('boom');
  });

  it('bounds the number of parked runs it reads', async () => {
    const runs = Array.from({ length: PND_PENDING_GATES_MAX_RUNS + 10 }, (_unused, index) =>
      parkedRun({ id: `run-${index}` })
    );
    const managementClient = createManagementClient({
      runsByWatchId: { [floorDocumentId]: runs },
    });

    await invoke(managementClient);

    expect(managementClient.getWorkflowExecution).toHaveBeenCalledTimes(PND_PENDING_GATES_MAX_RUNS);
  });

  it('does not thread a request into execution reads when none was provided', async () => {
    const managementClient = createManagementClient();

    await invoke(managementClient);

    expect(managementClient.getWorkflowExecutions).toHaveBeenCalledWith(
      expect.any(Object),
      SPACE_ID
    );
    expect(managementClient.getWorkflowExecution).toHaveBeenCalledWith('run-1', SPACE_ID, {
      includeInput: true,
      includeOutput: true,
    });
  });

  it('forwards the caller request into execution reads so managed-execution authz can assert', async () => {
    const managementClient = createManagementClient();
    const request = httpServerMock.createKibanaRequest();

    await invoke(managementClient, { request, watchIds: [SYSTEM_SECURITY_WATCH_FLOOR_ID] });

    expect(managementClient.getWorkflowExecutions).toHaveBeenCalledWith(
      expect.any(Object),
      SPACE_ID,
      request
    );
    expect(managementClient.getWorkflowExecution).toHaveBeenCalledWith('run-1', SPACE_ID, {
      includeInput: true,
      includeOutput: true,
      request,
    });
  });
});
