/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import {
  SYSTEM_SECURITY_WATCH_DEEP_ID,
  SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
} from '@kbn/pnd-common';

import type { WatchWorkflowsManagementClient } from '../../../../../services/watches/watch_workflows_management_client';
import { correlateExecutions } from '.';

const listItem = (overrides: Record<string, unknown> = {}) => ({
  id: 'run-1',
  status: 'completed',
  startedAt: '2026-08-02T00:00:00.000Z',
  finishedAt: '2026-08-02T00:01:00.000Z',
  workflowId: 'wf-deep',
  ...overrides,
});

interface ClientOptions {
  executionsByWatch?: Record<string, unknown[]>;
  contextByRunId?: Record<string, Record<string, unknown> | undefined>;
  getWorkflowExecutions?: jest.Mock;
  getWorkflowExecution?: jest.Mock;
}

const createManagementClient = ({
  executionsByWatch = {},
  contextByRunId = {},
  getWorkflowExecutions,
  getWorkflowExecution,
}: ClientOptions = {}) =>
  ({
    getWorkflowExecutions:
      getWorkflowExecutions ??
      jest.fn(async ({ workflowId }: { workflowId: string }) => ({
        results: executionsByWatch[workflowId] ?? [],
        page: 1,
        size: 50,
        total: (executionsByWatch[workflowId] ?? []).length,
      })),
    getWorkflowExecution:
      getWorkflowExecution ??
      jest.fn(async (runId: string) => ({ context: { event: contextByRunId[runId] } })),
  } as unknown as jest.Mocked<
    Pick<WatchWorkflowsManagementClient, 'getWorkflowExecutions' | 'getWorkflowExecution'>
  >);

const baseParams = (managementClient: ReturnType<typeof createManagementClient>) => ({
  logger: loggerMock.create(),
  managementClient: managementClient as unknown as WatchWorkflowsManagementClient,
  size: 50,
  spaceId: 'agent-3',
  watchIds: [SYSTEM_SECURITY_WATCH_DEEP_ID, SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID] as const,
});

describe('correlateExecutions', () => {
  it('decodes the attack-discovery id from execution context', async () => {
    const managementClient = createManagementClient({
      executionsByWatch: { [SYSTEM_SECURITY_WATCH_DEEP_ID]: [listItem()] },
      contextByRunId: { 'run-1': { correlationId: 'ad-1' } },
    });

    const [correlated] = await correlateExecutions(baseParams(managementClient));

    expect(correlated.correlationId).toEqual('ad-1');
  });

  it('exposes the raw event object for downstream projection', async () => {
    const managementClient = createManagementClient({
      executionsByWatch: { [SYSTEM_SECURITY_WATCH_DEEP_ID]: [listItem()] },
      contextByRunId: { 'run-1': { correlationId: 'ad-1', spaceId: 'agent-3' } },
    });

    const [correlated] = await correlateExecutions(baseParams(managementClient));

    expect(correlated.event).toEqual({ correlationId: 'ad-1', spaceId: 'agent-3' });
  });

  it('tags each execution with the watch it was listed under', async () => {
    const managementClient = createManagementClient({
      executionsByWatch: {
        [SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID]: [listItem({ id: 'run-det' })],
      },
      contextByRunId: { 'run-det': { correlationId: 'ad-9' } },
    });

    const [correlated] = await correlateExecutions(baseParams(managementClient));

    expect(correlated.watchId).toEqual(SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID);
  });

  it('merges both watches and sorts newest-first', async () => {
    const managementClient = createManagementClient({
      executionsByWatch: {
        [SYSTEM_SECURITY_WATCH_DEEP_ID]: [
          listItem({ id: 'older', startedAt: '2026-08-01T00:00:00.000Z' }),
        ],
        [SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID]: [
          listItem({ id: 'newer', startedAt: '2026-08-02T00:00:00.000Z' }),
        ],
      },
    });

    const correlated = await correlateExecutions(baseParams(managementClient));

    expect(correlated.map((c) => c.execution.id)).toEqual(['newer', 'older']);
  });

  it('caps the merged result at size', async () => {
    const managementClient = createManagementClient({
      executionsByWatch: {
        [SYSTEM_SECURITY_WATCH_DEEP_ID]: [
          listItem({ id: 'a', startedAt: '2026-08-03T00:00:00.000Z' }),
          listItem({ id: 'b', startedAt: '2026-08-02T00:00:00.000Z' }),
          listItem({ id: 'c', startedAt: '2026-08-01T00:00:00.000Z' }),
        ],
      },
    });

    const correlated = await correlateExecutions({ ...baseParams(managementClient), size: 2 });

    expect(correlated.map((c) => c.execution.id)).toEqual(['a', 'b']);
  });

  it('caps the merged result at mergedSize when it is given', async () => {
    const managementClient = createManagementClient({
      executionsByWatch: {
        [SYSTEM_SECURITY_WATCH_DEEP_ID]: [
          listItem({ id: 'a', startedAt: '2026-08-03T00:00:00.000Z' }),
          listItem({ id: 'b', startedAt: '2026-08-02T00:00:00.000Z' }),
        ],
        [SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID]: [
          listItem({ id: 'c', startedAt: '2026-08-01T00:00:00.000Z' }),
        ],
      },
    });

    const correlated = await correlateExecutions({
      ...baseParams(managementClient),
      mergedSize: 2,
      size: 50,
    });

    expect(correlated.map((c) => c.execution.id)).toEqual(['a', 'b']);
  });

  it('keeps every watch in the window when mergedSize covers all of them', async () => {
    const managementClient = createManagementClient({
      executionsByWatch: {
        [SYSTEM_SECURITY_WATCH_DEEP_ID]: [
          listItem({ id: 'a', startedAt: '2026-08-03T00:00:00.000Z' }),
          listItem({ id: 'b', startedAt: '2026-08-02T00:00:00.000Z' }),
        ],
        [SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID]: [
          listItem({ id: 'c', startedAt: '2026-08-01T00:00:00.000Z' }),
        ],
      },
    });

    const correlated = await correlateExecutions({
      ...baseParams(managementClient),
      mergedSize: 4,
      size: 2,
    });

    expect(correlated.map((c) => c.execution.id)).toEqual(['a', 'b', 'c']);
  });

  it('still lists only `size` executions per watch when mergedSize is larger', async () => {
    const managementClient = createManagementClient({
      executionsByWatch: { [SYSTEM_SECURITY_WATCH_DEEP_ID]: [listItem()] },
    });

    await correlateExecutions({ ...baseParams(managementClient), mergedSize: 300, size: 100 });

    expect(managementClient.getWorkflowExecutions).toHaveBeenCalledWith(
      { page: 1, size: 100, workflowId: SYSTEM_SECURITY_WATCH_DEEP_ID },
      'agent-3'
    );
  });

  it('filters out executions started before the start bound', async () => {
    const managementClient = createManagementClient({
      executionsByWatch: {
        [SYSTEM_SECURITY_WATCH_DEEP_ID]: [
          listItem({ id: 'kept', startedAt: '2026-08-02T00:00:00.000Z' }),
          listItem({ id: 'dropped', startedAt: '2026-07-01T00:00:00.000Z' }),
        ],
      },
    });

    const correlated = await correlateExecutions({
      ...baseParams(managementClient),
      start: '2026-08-01T00:00:00.000Z',
    });

    expect(correlated.map((c) => c.execution.id)).toEqual(['kept']);
  });

  it('ignores a date-math bound it cannot parse', async () => {
    const managementClient = createManagementClient({
      executionsByWatch: {
        [SYSTEM_SECURITY_WATCH_DEEP_ID]: [listItem({ id: 'kept' })],
      },
    });

    const correlated = await correlateExecutions({
      ...baseParams(managementClient),
      start: 'now-1d',
    });

    expect(correlated.map((c) => c.execution.id)).toEqual(['kept']);
  });

  it('scopes each execution read to the resolved space (S9)', async () => {
    const managementClient = createManagementClient({
      executionsByWatch: { [SYSTEM_SECURITY_WATCH_DEEP_ID]: [listItem()] },
      contextByRunId: { 'run-1': { correlationId: 'ad-1' } },
    });

    await correlateExecutions(baseParams(managementClient));

    expect(managementClient.getWorkflowExecution).toHaveBeenCalledWith('run-1', 'agent-3');
  });

  it('degrades a failing per-watch listing to an empty contribution', async () => {
    const getWorkflowExecutions = jest.fn(async ({ workflowId }: { workflowId: string }) => {
      if (workflowId === SYSTEM_SECURITY_WATCH_DEEP_ID) {
        throw new Error('boom');
      }
      return {
        results: [listItem({ id: 'det' })],
        page: 1,
        size: 50,
        total: 1,
      };
    });
    const managementClient = createManagementClient({ getWorkflowExecutions });

    const correlated = await correlateExecutions(baseParams(managementClient));

    expect(correlated.map((c) => c.execution.id)).toEqual(['det']);
  });

  it('degrades a failing context decode to an empty correlation', async () => {
    const getWorkflowExecution = jest.fn().mockRejectedValue(new Error('boom'));
    const managementClient = createManagementClient({
      executionsByWatch: { [SYSTEM_SECURITY_WATCH_DEEP_ID]: [listItem()] },
      getWorkflowExecution,
    });

    const [correlated] = await correlateExecutions(baseParams(managementClient));

    expect(correlated.correlationId).toEqual('');
  });

  it('forwards the request on each execution listing when one is supplied', async () => {
    const managementClient = createManagementClient({
      executionsByWatch: { [SYSTEM_SECURITY_WATCH_DEEP_ID]: [listItem()] },
    });
    const request = { authzResult: {} } as never;

    await correlateExecutions({ ...baseParams(managementClient), request });

    expect(managementClient.getWorkflowExecutions).toHaveBeenCalledWith(
      { page: 1, size: 50, workflowId: SYSTEM_SECURITY_WATCH_DEEP_ID },
      'agent-3',
      request
    );
  });
});
