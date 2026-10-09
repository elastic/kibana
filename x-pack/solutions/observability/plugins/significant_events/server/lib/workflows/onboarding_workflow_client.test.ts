/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'yaml';
import { httpServerMock } from '@kbn/core/server/mocks';
import { SignificantEventsWorkflowStatus } from '@kbn/significant-events-schema';
import { ExecutionStatus } from '@kbn/workflows';
import {
  getManagedWorkflowDefinition,
  SIGNIFICANT_EVENTS_KI_FEATURES_IDENTIFICATION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_QUERIES_GENERATION_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import {
  SignificantEventsKIsOnboardingClient,
  buildConcurrencyKey,
  parseSourceSlugFromConcurrencyKey,
  parseSourceSlugFromKiConcurrencyKey,
} from './onboarding_workflow_client';
const statusRequest = httpServerMock.createKibanaRequest();

const createMockManagementApi = (overrides: Record<string, jest.Mock> = {}) => {
  const api = {
    getWorkflow: jest.fn().mockResolvedValue({
      id: SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID,
      name: 'onboarding',
      enabled: true,
      definition: {},
      yaml: '',
    }),
    runWorkflow: jest.fn().mockResolvedValue('execution-id'),
    getWorkflowExecutions: jest.fn().mockResolvedValue({ results: [], total: 0 }),
    getWorkflowExecution: jest.fn().mockResolvedValue(null),
    cancelWorkflowExecution: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  return { ...api, getClient: jest.fn(() => api) };
};

const slugOf = (sourceId: string): string => `${sourceId}-slug`;

const createClient = (overrides: Record<string, jest.Mock> = {}) => {
  const managementApi = createMockManagementApi(overrides);
  const telemetry = { trackOnboardingScheduled: jest.fn() } as never;
  const sourcesClientGet = jest.fn(async (sourceId: string) => ({
    source: { id: sourceId, slug: slugOf(sourceId), enabled: true, esql_updated_at: 'revision-2' },
  }));
  const getSourcesClient = jest.fn().mockResolvedValue({ get: sourcesClientGet });
  const client = new SignificantEventsKIsOnboardingClient({
    managementApi: managementApi as never,
    telemetry,
    getSourcesClient,
  });
  return { client, managementApi, telemetry };
};

describe('SignificantEventsKIsOnboardingClient', () => {
  describe('buildConcurrencyKey', () => {
    it('prepends the prefix to the source slug', () => {
      expect(buildConcurrencyKey('my-source')).toBe('nightshift-source-onboarding-my-source');
    });
  });

  describe('parseSourceSlugFromConcurrencyKey', () => {
    it('extracts the source slug from a valid key', () => {
      expect(parseSourceSlugFromConcurrencyKey('nightshift-source-onboarding-my-source')).toBe(
        'my-source'
      );
    });

    it('returns null for keys with a different prefix', () => {
      expect(parseSourceSlugFromConcurrencyKey('other-prefix-my-source')).toBeNull();
    });

    it('round-trips with buildConcurrencyKey', () => {
      const sourceSlug = 'logs.nginx';
      expect(parseSourceSlugFromConcurrencyKey(buildConcurrencyKey(sourceSlug))).toBe(sourceSlug);
    });
  });

  describe('parseSourceSlugFromKiConcurrencyKey', () => {
    it.each([
      'nightshift-source-onboarding-',
      'nightshift-source-features-identification-',
      'nightshift-source-queries-generation-',
    ])('extracts the slug from a key with the %s prefix', (prefix) => {
      expect(parseSourceSlugFromKiConcurrencyKey(`${prefix}my-source`)).toBe('my-source');
    });

    it('returns null for keys of other workflows', () => {
      expect(parseSourceSlugFromKiConcurrencyKey('significant-events-ki-sync')).toBeNull();
    });
  });

  describe('concurrency key sync with onboarding YAML', () => {
    it('buildConcurrencyKey produces keys that match the YAML concurrency template', () => {
      const definition = getManagedWorkflowDefinition(SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID);
      expect(definition).toBeDefined();
      expect(definition!.yaml).toBeDefined();

      const parsed = parse(definition!.yaml!) as {
        settings: { concurrency: { key: string } };
      };
      const yamlTemplate = parsed.settings.concurrency.key;

      const sourceSlug = 'test-source';
      const expectedKey = yamlTemplate.replace('{{ inputs.sourceSlug }}', sourceSlug);

      expect(buildConcurrencyKey(sourceSlug)).toBe(expectedKey);
    });
  });

  describe('run', () => {
    it('rejects a queued revision that changed before scheduling', async () => {
      const { client, managementApi } = createClient();
      await expect(
        client.run({
          request: statusRequest,
          inputs: {
            sourceId: 'source-id',
            sourceRevision: 'revision-1',
            features: { skip: false, start: 1, end: 2 },
            queries: { skip: false },
          },
        })
      ).rejects.toThrow('Source query changed');
      expect(managementApi.runWorkflow).not.toHaveBeenCalled();
    });

    it('fetches the workflow definition and runs it and returns executionId', async () => {
      const { client, managementApi } = createClient();
      const request = httpServerMock.createKibanaRequest();

      const result = await client.run({
        inputs: {
          sourceId: 'logs.nginx',
          features: { skip: false, start: 1000, end: 2000 },
          queries: { skip: false },
        },
        request,
      });

      expect(result).toEqual({ executionId: 'execution-id' });
      expect(managementApi.getWorkflow).toHaveBeenCalledWith(
        SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID,
        '*'
      );
      expect(managementApi.runWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({ id: SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID }),
        'default',
        expect.objectContaining({
          sourceId: 'logs.nginx',
          sourceSlug: slugOf('logs.nginx'),
          sourceRevision: 'revision-2',
        }),
        request
      );
    });

    it('throws when the workflow is not found', async () => {
      const { client } = createClient({
        getWorkflow: jest.fn().mockResolvedValue(null),
      });
      const request = httpServerMock.createKibanaRequest();

      await expect(
        client.run({
          inputs: {
            sourceId: 'logs.nginx',
            features: { skip: false, start: 1000, end: 2000 },
            queries: { skip: false },
          },
          request,
        })
      ).rejects.toThrow(/not found/);
    });

    it('throws when the workflow has no definition', async () => {
      const { client } = createClient({
        getWorkflow: jest.fn().mockResolvedValue({ id: 'wf', definition: null }),
      });
      const request = httpServerMock.createKibanaRequest();

      await expect(
        client.run({
          inputs: {
            sourceId: 'logs.nginx',
            features: { skip: false, start: 1000, end: 2000 },
            queries: { skip: false },
          },
          request,
        })
      ).rejects.toThrow(/not found/);
    });
  });

  describe('getStatus', () => {
    it('returns NotStarted when no executions exist', async () => {
      const { client } = createClient();

      const result = await client.getStatus({ request: statusRequest, sourceId: 'logs.nginx' });

      expect(result).toEqual({
        status: SignificantEventsWorkflowStatus.NotStarted,
        executionId: null,
      });
    });

    it('ignores a run that started before the current query, or before the source existed', async () => {
      const { client } = createClient({
        getWorkflowExecutions: jest.fn().mockResolvedValue({
          results: [
            {
              id: 'exec-of-deleted-source',
              status: ExecutionStatus.COMPLETED,
              startedAt: '2026-09-01T00:00:00.000Z',
            },
          ],
        }),
      });

      const result = await client.getStatus({
        request: statusRequest,
        sourceId: 'logs.nginx',
        queryUpdatedAt: '2026-09-02T00:00:00.000Z',
      });

      expect(result).toEqual({
        status: SignificantEventsWorkflowStatus.NotStarted,
        executionId: null,
      });
    });

    it('returns InProgress for a running execution', async () => {
      const { client } = createClient({
        getWorkflowExecutions: jest.fn().mockResolvedValue({
          results: [{ id: 'exec-1', status: ExecutionStatus.RUNNING }],
        }),
      });

      const result = await client.getStatus({ request: statusRequest, sourceId: 'logs.nginx' });

      expect(result).toEqual({
        status: SignificantEventsWorkflowStatus.InProgress,
        executionId: 'exec-1',
      });
    });

    it('returns Completed with output details for a completed execution', async () => {
      const { client } = createClient({
        getWorkflowExecutions: jest.fn().mockResolvedValue({
          results: [{ id: 'exec-1', status: ExecutionStatus.COMPLETED }],
        }),
        getWorkflowExecution: jest.fn().mockResolvedValue({
          context: {
            output: {
              featuresSkipped: false,
              discoveredFeatures: ['f1', 'f2'],
              featuresConnectorUsed: 'connector-1',
              featuresTokensUsed: { prompt: 100, completion: 50 },
              queriesSkipped: true,
              persistedQueries: [],
              queriesConnectorUsed: '',
              queriesTokensUsed: {},
            },
          },
        }),
      });

      const result = await client.getStatus({ request: statusRequest, sourceId: 'logs.nginx' });

      expect(result).toEqual({
        status: SignificantEventsWorkflowStatus.Completed,
        executionId: 'exec-1',
        features: {
          skipped: false,
          discovered: ['f1', 'f2'],
          connectorUsed: 'connector-1',
          tokensUsed: { prompt: 100, completion: 50 },
        },
        queries: {
          skipped: true,
          persisted: [],
          connectorUsed: '',
          tokensUsed: {},
        },
        keepAlive: { refreshed: 0 },
      });
    });

    it('returns Completed with defaults when full execution fetch returns null', async () => {
      const { client } = createClient({
        getWorkflowExecutions: jest.fn().mockResolvedValue({
          results: [{ id: 'exec-1', status: ExecutionStatus.COMPLETED }],
        }),
        getWorkflowExecution: jest.fn().mockResolvedValue(null),
      });

      const result = await client.getStatus({ request: statusRequest, sourceId: 'logs.nginx' });

      expect(result).toEqual({
        status: SignificantEventsWorkflowStatus.Completed,
        executionId: 'exec-1',
        features: {
          skipped: false,
          discovered: [],
          connectorUsed: '',
          tokensUsed: { prompt: 0, completion: 0, total: 0 },
        },
        queries: {
          skipped: false,
          persisted: [],
          connectorUsed: '',
          tokensUsed: { prompt: 0, completion: 0, total: 0 },
        },
        keepAlive: { refreshed: 0 },
      });
    });

    it('returns Failed with error message for a failed execution', async () => {
      const { client } = createClient({
        getWorkflowExecutions: jest.fn().mockResolvedValue({
          results: [
            {
              id: 'exec-1',
              status: ExecutionStatus.FAILED,
              error: { message: 'something broke' },
            },
          ],
        }),
      });

      const result = await client.getStatus({ request: statusRequest, sourceId: 'logs.nginx' });

      expect(result).toEqual({
        status: SignificantEventsWorkflowStatus.Failed,
        executionId: 'exec-1',
        error: 'something broke',
      });
    });

    it('returns Failed with timeout message for a timed-out execution', async () => {
      const { client } = createClient({
        getWorkflowExecutions: jest.fn().mockResolvedValue({
          results: [{ id: 'exec-1', status: ExecutionStatus.TIMED_OUT, error: null }],
        }),
      });

      const result = await client.getStatus({ request: statusRequest, sourceId: 'logs.nginx' });

      expect(result).toEqual({
        status: SignificantEventsWorkflowStatus.Failed,
        executionId: 'exec-1',
        error: 'Workflow system-streams-ki-onboarding timed out',
      });
    });

    it('returns Canceled for a cancelled execution', async () => {
      const { client } = createClient({
        getWorkflowExecutions: jest.fn().mockResolvedValue({
          results: [{ id: 'exec-1', status: ExecutionStatus.CANCELLED }],
        }),
      });

      const result = await client.getStatus({ request: statusRequest, sourceId: 'logs.nginx' });

      expect(result).toEqual({
        status: SignificantEventsWorkflowStatus.Canceled,
        executionId: 'exec-1',
      });
    });

    it('queries with the correct concurrency group key', async () => {
      const { client, managementApi } = createClient();

      await client.getStatus({ request: statusRequest, sourceId: 'logs.nginx' });

      expect(managementApi.getWorkflowExecutions).toHaveBeenCalledWith(
        expect.objectContaining({
          concurrencyGroupKey: `nightshift-source-onboarding-${slugOf('logs.nginx')}`,
          size: 1,
        }),
        'default'
      );
    });
  });

  describe('getStatuses', () => {
    const source = (id: string) => ({ id, slug: slugOf(id) });

    it('returns an empty map and skips the query for no sources', async () => {
      const { client, managementApi } = createClient();

      const result = await client.getStatuses({ request: statusRequest, sources: [] });

      expect(result).toEqual({});
      expect(managementApi.getWorkflowExecutions).not.toHaveBeenCalled();
    });

    it('fetches executions collapsed by concurrencyGroupKey in a single query', async () => {
      const { client, managementApi } = createClient();

      await client.getStatuses({
        request: statusRequest,
        sources: [source('logs.nginx'), source('logs.apache')],
      });

      expect(managementApi.getWorkflowExecutions).toHaveBeenCalledTimes(1);
      expect(managementApi.getWorkflowExecutions).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowId: SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID,
          size: 10000,
          sortField: 'createdAt',
          sortOrder: 'desc',
          collapse: 'concurrencyGroupKey',
        }),
        'default'
      );
    });

    it('maps each execution to a status keyed by source id and fills missing sources with NotStarted', async () => {
      const { client } = createClient({
        getWorkflowExecutions: jest.fn().mockResolvedValue({
          results: [
            {
              id: 'exec-1',
              status: ExecutionStatus.RUNNING,
              concurrencyGroupKey: `nightshift-source-onboarding-${slugOf('logs.nginx')}`,
            },
            {
              id: 'exec-2',
              status: ExecutionStatus.COMPLETED,
              concurrencyGroupKey: `nightshift-source-onboarding-${slugOf('logs.apache')}`,
            },
            {
              id: 'exec-3',
              status: ExecutionStatus.FAILED,
              error: { message: 'boom' },
              concurrencyGroupKey: `nightshift-source-onboarding-${slugOf('logs.haproxy')}`,
            },
          ],
        }),
      });

      const result = await client.getStatuses({
        request: statusRequest,
        sources: [
          source('logs.nginx'),
          source('logs.apache'),
          source('logs.haproxy'),
          source('logs.envoy'),
        ],
      });

      expect(result).toEqual({
        'logs.nginx': { status: SignificantEventsWorkflowStatus.InProgress, executionId: 'exec-1' },
        'logs.apache': { status: SignificantEventsWorkflowStatus.Completed, executionId: 'exec-2' },
        'logs.haproxy': {
          status: SignificantEventsWorkflowStatus.Failed,
          executionId: 'exec-3',
          error: 'boom',
        },
        'logs.envoy': { status: SignificantEventsWorkflowStatus.NotStarted, executionId: null },
      });
    });

    it('does not fetch the completed output for completed executions', async () => {
      const getWorkflowExecution = jest.fn().mockResolvedValue(null);
      const { client } = createClient({
        getWorkflowExecutions: jest.fn().mockResolvedValue({
          results: [
            {
              id: 'exec-1',
              status: ExecutionStatus.COMPLETED,
              concurrencyGroupKey: `nightshift-source-onboarding-${slugOf('logs.nginx')}`,
            },
          ],
        }),
        getWorkflowExecution,
      });

      const result = await client.getStatuses({
        request: statusRequest,
        sources: [source('logs.nginx')],
      });

      expect(result).toEqual({
        'logs.nginx': { status: SignificantEventsWorkflowStatus.Completed, executionId: 'exec-1' },
      });
      expect(getWorkflowExecution).not.toHaveBeenCalled();
    });

    it('ignores executions whose concurrency group key is unknown or unrequested', async () => {
      const { client } = createClient({
        getWorkflowExecutions: jest.fn().mockResolvedValue({
          results: [
            { id: 'exec-1', status: ExecutionStatus.RUNNING, concurrencyGroupKey: undefined },
            {
              id: 'exec-2',
              status: ExecutionStatus.RUNNING,
              concurrencyGroupKey: 'nightshift-source-onboarding-not-requested',
            },
          ],
        }),
      });

      const result = await client.getStatuses({
        request: statusRequest,
        sources: [source('logs.nginx')],
      });

      expect(result).toEqual({
        'logs.nginx': { status: SignificantEventsWorkflowStatus.NotStarted, executionId: null },
      });
    });

    it('ignores the run of an earlier source that had the same slug', async () => {
      const { client } = createClient({
        getWorkflowExecutions: jest.fn().mockResolvedValue({
          results: [
            {
              id: 'exec-of-deleted-source',
              status: ExecutionStatus.FAILED,
              startedAt: '2026-09-01T00:00:00.000Z',
              concurrencyGroupKey: `nightshift-source-onboarding-${slugOf('logs.nginx')}`,
            },
          ],
        }),
      });

      const result = await client.getStatuses({
        request: statusRequest,
        sources: [{ ...source('logs.nginx'), esql_updated_at: '2026-09-02T00:00:00.000Z' }],
      });

      expect(result).toEqual({
        'logs.nginx': { status: SignificantEventsWorkflowStatus.NotStarted, executionId: null },
      });
    });
  });

  describe('cancel', () => {
    it('cancels the latest execution for the stream', async () => {
      const { client, managementApi } = createClient({
        getWorkflowExecutions: jest.fn().mockResolvedValue({
          results: [{ id: 'exec-1', status: ExecutionStatus.RUNNING }],
        }),
      });
      const request = httpServerMock.createKibanaRequest();

      await client.cancel({ sourceId: 'logs.nginx', request });

      expect(managementApi.cancelWorkflowExecution).toHaveBeenCalledWith(
        'exec-1',
        'default',
        request
      );
    });

    it('does nothing when no execution exists', async () => {
      const { client, managementApi } = createClient();
      const request = httpServerMock.createKibanaRequest();

      await client.cancel({ sourceId: 'logs.nginx', request });

      expect(managementApi.cancelWorkflowExecution).not.toHaveBeenCalled();
    });
  });

  describe('cancelBySourceSlug', () => {
    // A cancelled parent leaves its sub-workflow running for a while. The sub-workflows use
    // `drop` concurrency keyed by slug, so a replacement run is dropped until they have stopped.
    const runningExecutionOf = (workflowId: string, concurrencyGroupKey: string) => {
      const ids: Record<string, string> = {
        [SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID]: 'onboarding-exec',
        [SIGNIFICANT_EVENTS_KI_FEATURES_IDENTIFICATION_WORKFLOW_ID]: 'features-exec',
        [SIGNIFICANT_EVENTS_KI_QUERIES_GENERATION_WORKFLOW_ID]: 'queries-exec',
      };
      return {
        results: [{ id: ids[workflowId], status: ExecutionStatus.RUNNING, concurrencyGroupKey }],
      };
    };

    it('cancels the onboarding run, then the feature identification and query generation runs of the slug', async () => {
      const getWorkflowExecutions = jest.fn(
        async ({
          workflowId,
          concurrencyGroupKey,
        }: {
          workflowId: string;
          concurrencyGroupKey: string;
        }) => runningExecutionOf(workflowId, concurrencyGroupKey)
      );
      const { client, managementApi } = createClient({ getWorkflowExecutions });
      const request = httpServerMock.createKibanaRequest();

      await expect(client.cancelBySourceSlug({ sourceSlug: 'nginx', request })).resolves.toBe(
        'onboarding-exec'
      );

      expect(getWorkflowExecutions).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowId: SIGNIFICANT_EVENTS_KI_FEATURES_IDENTIFICATION_WORKFLOW_ID,
          concurrencyGroupKey: 'nightshift-source-features-identification-nginx',
        }),
        'default'
      );
      expect(getWorkflowExecutions).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowId: SIGNIFICANT_EVENTS_KI_QUERIES_GENERATION_WORKFLOW_ID,
          concurrencyGroupKey: 'nightshift-source-queries-generation-nginx',
        }),
        'default'
      );
      expect(managementApi.cancelWorkflowExecution.mock.calls.map(([id]) => id)).toEqual([
        'onboarding-exec',
        'features-exec',
        'queries-exec',
      ]);
    });

    it('cancels the sub-workflow runs even when no onboarding run is active', async () => {
      const getWorkflowExecutions = jest.fn(async ({ workflowId }: { workflowId: string }) =>
        workflowId === SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID
          ? { results: [] }
          : runningExecutionOf(workflowId, 'key')
      );
      const { client, managementApi } = createClient({ getWorkflowExecutions });
      const request = httpServerMock.createKibanaRequest();

      await expect(client.cancelBySourceSlug({ sourceSlug: 'nginx', request })).resolves.toBeNull();

      expect(managementApi.cancelWorkflowExecution.mock.calls.map(([id]) => id)).toEqual([
        'features-exec',
        'queries-exec',
      ]);
    });
  });

  describe('getNonTerminalExecutions', () => {
    it('includes the sub-workflow runs that still hold a source concurrency slot', async () => {
      const getWorkflowExecutions = jest.fn(async ({ workflowId }: { workflowId: string }) => ({
        results: [{ id: `${workflowId}-exec`, status: ExecutionStatus.RUNNING }],
      }));
      const { client } = createClient({ getWorkflowExecutions });
      const request = httpServerMock.createKibanaRequest();

      const executions = await client.getNonTerminalExecutions({ request });

      expect(executions.map(({ id }) => id)).toEqual([
        `${SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID}-exec`,
        `${SIGNIFICANT_EVENTS_KI_FEATURES_IDENTIFICATION_WORKFLOW_ID}-exec`,
        `${SIGNIFICANT_EVENTS_KI_QUERIES_GENERATION_WORKFLOW_ID}-exec`,
      ]);
    });
  });

  describe('cancelAllRunning', () => {
    it('cancels all non-terminal onboarding executions', async () => {
      const { client, managementApi } = createClient({
        getWorkflowExecutions: jest.fn().mockResolvedValue({
          results: [
            { id: 'exec-1', status: ExecutionStatus.RUNNING },
            { id: 'exec-2', status: ExecutionStatus.PENDING },
          ],
        }),
      });
      const request = httpServerMock.createKibanaRequest();

      await expect(client.cancelAllRunning({ request })).resolves.toBe(2);

      expect(managementApi.cancelWorkflowExecution).toHaveBeenCalledTimes(2);
      expect(managementApi.cancelWorkflowExecution).toHaveBeenCalledWith(
        'exec-1',
        'default',
        request
      );
      expect(managementApi.cancelWorkflowExecution).toHaveBeenCalledWith(
        'exec-2',
        'default',
        request
      );
    });

    it('does nothing when no running executions exist', async () => {
      const { client } = createClient();
      const request = httpServerMock.createKibanaRequest();

      await expect(client.cancelAllRunning({ request })).resolves.toBe(0);
    });
  });

  describe('getRecentExecutions', () => {
    it('returns one execution per source collapsed by concurrencyGroupKey', async () => {
      const executions = [
        { id: 'exec-1', status: ExecutionStatus.COMPLETED },
        { id: 'exec-2', status: ExecutionStatus.RUNNING },
      ];
      const { client, managementApi } = createClient({
        getWorkflowExecutions: jest.fn().mockResolvedValue({ results: executions }),
      });

      const result = await client.getRecentExecutions(statusRequest);

      expect(result).toEqual(executions);
      expect(managementApi.getWorkflowExecutions).toHaveBeenCalledWith(
        expect.objectContaining({
          sortField: 'createdAt',
          sortOrder: 'desc',
          size: 10000,
          collapse: 'concurrencyGroupKey',
        }),
        'default'
      );
    });

    it('returns empty array when no executions exist', async () => {
      const { client } = createClient();

      const result = await client.getRecentExecutions(statusRequest);

      expect(result).toEqual([]);
    });
  });
});
