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
  getNightshiftBoundKiOnboardingWorkflowId,
  SIGNIFICANT_EVENTS_KI_FEATURES_IDENTIFICATION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_QUERIES_GENERATION_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import {
  SignificantEventsKIsOnboardingClient,
  buildConcurrencyKey,
  parseSourceFromConcurrencyKey,
  parseSourceFromKiConcurrencyKey,
} from './onboarding_workflow_client';
const statusRequest = httpServerMock.createKibanaRequest();

const ENTRY_POINT_ID = getNightshiftBoundKiOnboardingWorkflowId('default');

// With `entryPointExecutions`, the management API answers the executions of the entry point from
// them and those of every other workflow from the `getWorkflowExecutions` override. Without, the
// override answers for every workflow.
const createMockManagementApi = (
  overrides: Record<string, jest.Mock> = {},
  entryPointExecutions?: Array<Record<string, unknown>>
) => {
  const { getWorkflowExecutions: workflowExecutions, ...otherOverrides } = overrides;
  const executions = workflowExecutions ?? jest.fn().mockResolvedValue({ results: [], total: 0 });
  const getWorkflowExecutions =
    entryPointExecutions === undefined
      ? executions
      : jest.fn(async (params: { workflowId: string }, spaceId: string) =>
          params.workflowId === ENTRY_POINT_ID
            ? { results: entryPointExecutions, total: entryPointExecutions.length }
            : executions(params, spaceId)
        );
  const api = {
    getWorkflow: jest.fn().mockResolvedValue({
      id: ENTRY_POINT_ID,
      name: 'onboarding',
      enabled: true,
      definition: { settings: { run_as: 'service-account-id' } },
      yaml: '',
    }),
    runWorkflow: jest.fn().mockResolvedValue('execution-id'),
    getWorkflowExecutions,
    getWorkflowExecution: jest.fn().mockResolvedValue(null),
    cancelWorkflowExecution: jest.fn().mockResolvedValue(undefined),
    ...otherOverrides,
  };
  return { ...api, getClient: jest.fn(() => api) };
};

const slugOf = (sourceId: string): string => `${sourceId}-slug`;
const onboardingKeyOf = (sourceId: string): string =>
  `nightshift-source-onboarding-${slugOf(sourceId)}:${sourceId}`;
const entryPointKeyOf = (sourceId: string): string =>
  `nightshift-source-onboarding-bound-${slugOf(sourceId)}:${sourceId}`;

const createClient = (
  overrides: Record<string, jest.Mock> = {},
  isServiceAccountsEnabled = true,
  entryPointExecutions?: Array<Record<string, unknown>>
) => {
  const managementApi = createMockManagementApi(overrides, entryPointExecutions);
  const telemetry = { trackOnboardingScheduled: jest.fn() } as never;
  const sourcesClientGet = jest.fn(async (sourceId: string) => ({
    source: { id: sourceId, slug: slugOf(sourceId), enabled: true, esql_updated_at: 'revision-2' },
  }));
  const getSourcesClient = jest.fn().mockResolvedValue({ get: sourcesClientGet });
  const client = new SignificantEventsKIsOnboardingClient({
    isServiceAccountsEnabled: async () => isServiceAccountsEnabled,
    managementApi: managementApi as never,
    telemetry,
    getSourcesClient,
  });
  return { client, managementApi, telemetry };
};

// The runs of one source, the onboarding workflow's and the entry point's, which starts it.
const onboardingRun = (overrides: Record<string, unknown> = {}) => ({
  id: 'onboarding-1',
  concurrencyGroupKey: onboardingKeyOf('logs.nginx'),
  startedAt: '2026-10-30T10:00:05.000Z',
  status: ExecutionStatus.RUNNING,
  ...overrides,
});
const entryPointRun = (overrides: Record<string, unknown> = {}) => ({
  id: 'entry-1',
  concurrencyGroupKey: entryPointKeyOf('logs.nginx'),
  startedAt: '2026-10-30T10:00:00.000Z',
  status: ExecutionStatus.RUNNING,
  ...overrides,
});
const withOnboardingRuns = (...results: Array<Record<string, unknown>>) => ({
  getWorkflowExecutions: jest.fn().mockResolvedValue({ results, total: results.length }),
});

// A client whose entry point has the given runs, none by default: the status lookups look for them.
const createStatusClient = (
  overrides: Record<string, jest.Mock> = {},
  entryPointExecutions: Array<Record<string, unknown>> = []
) => createClient(overrides, true, entryPointExecutions);

describe('SignificantEventsKIsOnboardingClient', () => {
  describe('buildConcurrencyKey', () => {
    it('joins the slug and the source id after the prefix', () => {
      expect(buildConcurrencyKey({ sourceSlug: 'my-source', sourceId: 'id-1' })).toBe(
        'nightshift-source-onboarding-my-source:id-1'
      );
    });

    it('gives a recreated source with the same slug a different key', () => {
      expect(buildConcurrencyKey({ sourceSlug: 'my-source', sourceId: 'id-2' })).not.toBe(
        buildConcurrencyKey({ sourceSlug: 'my-source', sourceId: 'id-1' })
      );
    });
  });

  describe('parseSourceFromConcurrencyKey', () => {
    it('extracts the slug and the id from a valid key', () => {
      expect(parseSourceFromConcurrencyKey('nightshift-source-onboarding-my-source:id-1')).toEqual({
        sourceSlug: 'my-source',
        sourceId: 'id-1',
      });
    });

    it('returns null for keys with a different prefix', () => {
      expect(parseSourceFromConcurrencyKey('other-prefix-my-source:id-1')).toBeNull();
    });

    it('returns null for a key written before the id was added', () => {
      expect(parseSourceFromConcurrencyKey('nightshift-source-onboarding-my-source')).toBeNull();
    });

    it('round-trips with buildConcurrencyKey', () => {
      const identity = {
        sourceSlug: 'logs.nginx',
        sourceId: '0b6f9a44-3c1e-4b7a-9d52-1f8e3c7a2b10',
      };
      expect(parseSourceFromConcurrencyKey(buildConcurrencyKey(identity))).toEqual(identity);
    });
  });

  describe('parseSourceFromKiConcurrencyKey', () => {
    it.each([
      'nightshift-source-onboarding-',
      'nightshift-source-features-identification-',
      'nightshift-source-queries-generation-',
    ])('extracts the slug and the id from a key with the %s prefix', (prefix) => {
      expect(parseSourceFromKiConcurrencyKey(`${prefix}my-source:id-1`)).toEqual({
        sourceSlug: 'my-source',
        sourceId: 'id-1',
      });
    });

    it('returns null for keys of other workflows', () => {
      expect(parseSourceFromKiConcurrencyKey('significant-events-ki-sync')).toBeNull();
    });
  });

  describe('concurrency key sync with the workflow YAML', () => {
    const yamlKeyTemplate = (workflowId: Parameters<typeof getManagedWorkflowDefinition>[0]) => {
      const definition = getManagedWorkflowDefinition(workflowId);
      expect(definition?.yaml).toBeDefined();
      return (parse(definition!.yaml!) as { settings: { concurrency: { key: string } } }).settings
        .concurrency.key;
    };
    const fillTemplate = (template: string) =>
      template
        .replace('{{ inputs.sourceSlug }}', 'test-source')
        .replace('{{ inputs.sourceId }}', 'source-id-1');

    it('buildConcurrencyKey produces keys that match the onboarding YAML concurrency template', () => {
      expect(buildConcurrencyKey({ sourceSlug: 'test-source', sourceId: 'source-id-1' })).toBe(
        fillTemplate(yamlKeyTemplate(SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID))
      );
    });

    it.each([
      ['features identification', SIGNIFICANT_EVENTS_KI_FEATURES_IDENTIFICATION_WORKFLOW_ID],
      ['queries generation', SIGNIFICANT_EVENTS_KI_QUERIES_GENERATION_WORKFLOW_ID],
    ] as const)('the %s YAML key carries the slug and the id the parser reads', (_, workflowId) => {
      expect(parseSourceFromKiConcurrencyKey(fillTemplate(yamlKeyTemplate(workflowId)))).toEqual({
        sourceSlug: 'test-source',
        sourceId: 'source-id-1',
      });
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

    it('runs the space entry point and returns the execution id', async () => {
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
      expect(managementApi.getWorkflow).toHaveBeenCalledWith(ENTRY_POINT_ID, 'default');
      expect(managementApi.runWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({ id: ENTRY_POINT_ID }),
        'default',
        expect.objectContaining({
          sourceId: 'logs.nginx',
          sourceSlug: slugOf('logs.nginx'),
          sourceRevision: 'revision-2',
        }),
        request,
        expect.anything()
      );
    });

    it.each([
      ['the entry point is not installed', { getWorkflow: jest.fn().mockResolvedValue(null) }],
      [
        'the entry point is not bound to a service account',
        {
          getWorkflow: jest
            .fn()
            .mockResolvedValue({ id: ENTRY_POINT_ID, enabled: true, definition: {} }),
        },
      ],
      [
        'the entry point is disabled',
        {
          getWorkflow: jest.fn().mockResolvedValue({
            id: ENTRY_POINT_ID,
            enabled: false,
            definition: { settings: { run_as: 'service-account-id' } },
          }),
        },
      ],
    ])('is refused with a 503 when %s', async (_, overrides) => {
      const { client, managementApi } = createClient(overrides);

      await expect(
        client.run({
          inputs: {
            sourceId: 'logs.nginx',
            features: { skip: false, start: 1000, end: 2000 },
            queries: { skip: false },
          },
          request: httpServerMock.createKibanaRequest(),
        })
      ).rejects.toMatchObject({ statusCode: 503 });
      expect(managementApi.runWorkflow).not.toHaveBeenCalled();
    });

    it('is refused with a 503 when service accounts are off', async () => {
      const { client, managementApi } = createClient({}, false);

      await expect(
        client.run({
          inputs: {
            sourceId: 'logs.nginx',
            features: { skip: false, start: 1000, end: 2000 },
            queries: { skip: false },
          },
          request: httpServerMock.createKibanaRequest(),
        })
      ).rejects.toMatchObject({ statusCode: 503 });
      expect(managementApi.runWorkflow).not.toHaveBeenCalled();
    });
  });

  describe('getStatus', () => {
    it('returns NotStarted when no executions exist', async () => {
      const { client } = createStatusClient();

      const result = await client.getStatus({ request: statusRequest, sourceId: 'logs.nginx' });

      expect(result).toEqual({
        status: SignificantEventsWorkflowStatus.NotStarted,
        executionId: null,
      });
    });

    it('ignores a run that started before the current query, or before the source existed', async () => {
      const { client } = createStatusClient({
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
      const { client } = createStatusClient({
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
      const { client } = createStatusClient({
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
      const { client } = createStatusClient({
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
      const { client } = createStatusClient({
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
      const { client } = createStatusClient({
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
      const { client } = createStatusClient({
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
      const { client, managementApi } = createStatusClient();

      await client.getStatus({ request: statusRequest, sourceId: 'logs.nginx' });

      expect(managementApi.getWorkflowExecutions).toHaveBeenCalledWith(
        expect.objectContaining({
          concurrencyGroupKey: onboardingKeyOf('logs.nginx'),
          size: 1,
        }),
        'default'
      );
    });

    describe('with a run of the space entry point', () => {
      it('reports a run that has not started the onboarding yet, whatever the previous run was', async () => {
        const { client } = createStatusClient(
          withOnboardingRuns(
            onboardingRun({
              startedAt: '2026-10-29T10:00:00.000Z',
              status: ExecutionStatus.COMPLETED,
            })
          ),
          [entryPointRun({ status: ExecutionStatus.QUEUED })]
        );

        const result = await client.getStatus({ request: statusRequest, sourceId: 'logs.nginx' });

        expect(result).toEqual({
          status: SignificantEventsWorkflowStatus.InProgress,
          executionId: 'entry-1',
        });
      });

      it('reports a run that failed before it started the onboarding', async () => {
        const { client } = createStatusClient(
          withOnboardingRuns(
            onboardingRun({
              startedAt: '2026-10-29T10:00:00.000Z',
              status: ExecutionStatus.COMPLETED,
            })
          ),
          [
            entryPointRun({
              status: ExecutionStatus.FAILED,
              error: { message: 'Error occurred during service account token exchange' },
            }),
          ]
        );

        const result = await client.getStatus({ request: statusRequest, sourceId: 'logs.nginx' });

        expect(result).toEqual({
          status: SignificantEventsWorkflowStatus.Failed,
          executionId: 'entry-1',
          error: 'Error occurred during service account token exchange',
        });
      });

      it('reports a run that failed with nothing to compare it to, when the source never ran', async () => {
        const { client } = createStatusClient({}, [
          entryPointRun({ status: ExecutionStatus.FAILED, error: { message: 'boom' } }),
        ]);

        const result = await client.getStatus({ request: statusRequest, sourceId: 'logs.nginx' });

        expect(result).toMatchObject({
          status: SignificantEventsWorkflowStatus.Failed,
          executionId: 'entry-1',
        });
      });

      it('reports the onboarding run once it has started', async () => {
        const { client } = createStatusClient(withOnboardingRuns(onboardingRun()), [
          entryPointRun(),
        ]);

        const result = await client.getStatus({ request: statusRequest, sourceId: 'logs.nginx' });

        expect(result).toEqual({
          status: SignificantEventsWorkflowStatus.InProgress,
          executionId: 'onboarding-1',
        });
      });

      it('reports a run of the onboarding that started after the entry point run, such as a continuous one', async () => {
        const { client } = createStatusClient(
          withOnboardingRuns(onboardingRun({ startedAt: '2026-10-30T11:00:00.000Z' })),
          [entryPointRun({ status: ExecutionStatus.FAILED, error: { message: 'old' } })]
        );

        const result = await client.getStatus({ request: statusRequest, sourceId: 'logs.nginx' });

        expect(result).toMatchObject({ executionId: 'onboarding-1' });
      });

      it('ignores a run that started before the current query', async () => {
        const { client } = createStatusClient({}, [entryPointRun()]);

        const result = await client.getStatus({
          request: statusRequest,
          sourceId: 'logs.nginx',
          queryUpdatedAt: '2026-10-30T09:00:00.000Z',
        });
        const afterwards = await client.getStatus({
          request: statusRequest,
          sourceId: 'logs.nginx',
          queryUpdatedAt: '2026-10-30T10:30:00.000Z',
        });

        expect(result).toMatchObject({ executionId: 'entry-1' });
        expect(afterwards).toEqual({
          status: SignificantEventsWorkflowStatus.NotStarted,
          executionId: null,
        });
      });

      it('does not count a run the concurrency limit dropped, which started nothing', async () => {
        const { client, managementApi } = createStatusClient(withOnboardingRuns(onboardingRun()));

        await client.getStatus({ request: statusRequest, sourceId: 'logs.nginx' });

        expect(managementApi.getWorkflowExecutions).toHaveBeenCalledWith(
          expect.objectContaining({
            workflowId: ENTRY_POINT_ID,
            concurrencyGroupKey: entryPointKeyOf('logs.nginx'),
            statuses: expect.not.arrayContaining([ExecutionStatus.SKIPPED]),
          }),
          'default'
        );
      });
    });
  });

  describe('getStatuses', () => {
    const source = (id: string) => ({ id, slug: slugOf(id) });

    it('returns an empty map and skips the query for no sources', async () => {
      const { client, managementApi } = createStatusClient();

      const result = await client.getStatuses({ request: statusRequest, sources: [] });

      expect(result).toEqual({});
      expect(managementApi.getWorkflowExecutions).not.toHaveBeenCalled();
    });

    it('fetches the onboarding and the entry point executions, each collapsed by concurrencyGroupKey', async () => {
      const { client, managementApi } = createStatusClient();

      await client.getStatuses({
        request: statusRequest,
        sources: [source('logs.nginx'), source('logs.apache')],
      });

      expect(managementApi.getWorkflowExecutions).toHaveBeenCalledTimes(2);
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
      expect(managementApi.getWorkflowExecutions).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowId: ENTRY_POINT_ID,
          size: 10000,
          collapse: 'concurrencyGroupKey',
          statuses: expect.not.arrayContaining([ExecutionStatus.SKIPPED]),
        }),
        'default'
      );
    });

    it('ignores a run of a deleted source that had the same slug as a live one', async () => {
      const { client } = createStatusClient({
        getWorkflowExecutions: jest.fn().mockResolvedValue({
          results: [
            {
              id: 'exec-of-deleted-source',
              status: ExecutionStatus.COMPLETED,
              concurrencyGroupKey: `nightshift-source-onboarding-${slugOf(
                'logs.nginx'
              )}:deleted-id`,
            },
          ],
        }),
      });

      const result = await client.getStatuses({
        request: statusRequest,
        sources: [source('logs.nginx')],
      });

      expect(result['logs.nginx']).toEqual({
        status: SignificantEventsWorkflowStatus.NotStarted,
        executionId: null,
      });
    });

    it('maps each execution to a status keyed by source id and fills missing sources with NotStarted', async () => {
      const { client } = createStatusClient({
        getWorkflowExecutions: jest.fn().mockResolvedValue({
          results: [
            {
              id: 'exec-1',
              status: ExecutionStatus.RUNNING,
              concurrencyGroupKey: onboardingKeyOf('logs.nginx'),
            },
            {
              id: 'exec-2',
              status: ExecutionStatus.COMPLETED,
              concurrencyGroupKey: onboardingKeyOf('logs.apache'),
            },
            {
              id: 'exec-3',
              status: ExecutionStatus.FAILED,
              error: { message: 'boom' },
              concurrencyGroupKey: onboardingKeyOf('logs.haproxy'),
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
      const { client } = createStatusClient({
        getWorkflowExecutions: jest.fn().mockResolvedValue({
          results: [
            {
              id: 'exec-1',
              status: ExecutionStatus.COMPLETED,
              concurrencyGroupKey: onboardingKeyOf('logs.nginx'),
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
      const { client } = createStatusClient({
        getWorkflowExecutions: jest.fn().mockResolvedValue({
          results: [
            { id: 'exec-1', status: ExecutionStatus.RUNNING, concurrencyGroupKey: undefined },
            {
              id: 'exec-2',
              status: ExecutionStatus.RUNNING,
              concurrencyGroupKey: 'nightshift-source-onboarding-not-requested:not-requested',
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
      const { client } = createStatusClient({
        getWorkflowExecutions: jest.fn().mockResolvedValue({
          results: [
            {
              id: 'exec-of-deleted-source',
              status: ExecutionStatus.FAILED,
              startedAt: '2026-09-01T00:00:00.000Z',
              concurrencyGroupKey: onboardingKeyOf('logs.nginx'),
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

    it('reports a run of the entry point that has not started the onboarding', async () => {
      const { client } = createStatusClient(
        withOnboardingRuns(
          onboardingRun({
            startedAt: '2026-10-29T10:00:00.000Z',
            status: ExecutionStatus.COMPLETED,
          })
        ),
        [entryPointRun({ status: ExecutionStatus.QUEUED })]
      );

      const result = await client.getStatuses({
        request: statusRequest,
        sources: [source('logs.nginx'), source('logs.apache')],
      });

      expect(result['logs.nginx']).toEqual({
        status: SignificantEventsWorkflowStatus.InProgress,
        executionId: 'entry-1',
      });
      expect(result['logs.apache']).toEqual({
        status: SignificantEventsWorkflowStatus.NotStarted,
        executionId: null,
      });
    });

    it('reports the onboarding run once it has started', async () => {
      const { client } = createStatusClient(withOnboardingRuns(onboardingRun()), [entryPointRun()]);

      const result = await client.getStatuses({
        request: statusRequest,
        sources: [source('logs.nginx')],
      });

      expect(result['logs.nginx']).toMatchObject({ executionId: 'onboarding-1' });
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

  describe('cancelBySource', () => {
    // A cancelled parent leaves its sub-workflow running for a while. The sub-workflows use
    // `drop` concurrency keyed by slug and id, so a replacement run is dropped until they have stopped.
    const runningExecutionOf = (workflowId: string, concurrencyGroupKey: string) => {
      const ids: Record<string, string> = {
        [ENTRY_POINT_ID]: 'entry-exec',
        [SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID]: 'onboarding-exec',
        [SIGNIFICANT_EVENTS_KI_FEATURES_IDENTIFICATION_WORKFLOW_ID]: 'features-exec',
        [SIGNIFICANT_EVENTS_KI_QUERIES_GENERATION_WORKFLOW_ID]: 'queries-exec',
      };
      return {
        results: [{ id: ids[workflowId], status: ExecutionStatus.RUNNING, concurrencyGroupKey }],
      };
    };

    it('cancels the onboarding run, then the feature identification and query generation runs of the source', async () => {
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

      await expect(
        client.cancelBySource({ sourceId: 'nginx-id', sourceSlug: 'nginx', request })
      ).resolves.toBe('onboarding-exec');

      expect(getWorkflowExecutions).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowId: SIGNIFICANT_EVENTS_KI_FEATURES_IDENTIFICATION_WORKFLOW_ID,
          concurrencyGroupKey: 'nightshift-source-features-identification-nginx:nginx-id',
        }),
        'default'
      );
      expect(getWorkflowExecutions).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowId: SIGNIFICANT_EVENTS_KI_QUERIES_GENERATION_WORKFLOW_ID,
          concurrencyGroupKey: 'nightshift-source-queries-generation-nginx:nginx-id',
        }),
        'default'
      );
      expect(managementApi.cancelWorkflowExecution.mock.calls.map(([id]) => id)).toEqual([
        'entry-exec',
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

      await expect(
        client.cancelBySource({ sourceId: 'nginx-id', sourceSlug: 'nginx', request })
      ).resolves.toBeNull();

      expect(managementApi.cancelWorkflowExecution.mock.calls.map(([id]) => id)).toEqual([
        'entry-exec',
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
        `${ENTRY_POINT_ID}-exec`,
        `${SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID}-exec`,
        `${SIGNIFICANT_EVENTS_KI_FEATURES_IDENTIFICATION_WORKFLOW_ID}-exec`,
        `${SIGNIFICANT_EVENTS_KI_QUERIES_GENERATION_WORKFLOW_ID}-exec`,
      ]);
    });
  });

  describe('waitForSourceRunsToStop', () => {
    const runningChild = {
      id: 'child-exec',
      status: ExecutionStatus.RUNNING,
      concurrencyGroupKey: 'nightshift-source-features-identification-logs:source-1',
    };

    it('waits until the sub-workflow of the source has stopped', async () => {
      const getWorkflowExecutions = jest
        .fn()
        .mockResolvedValueOnce({ results: [runningChild] })
        .mockResolvedValue({ results: [] });
      const { client } = createClient({ getWorkflowExecutions });
      const request = httpServerMock.createKibanaRequest();

      await expect(
        client.waitForSourceRunsToStop({ sourceId: 'source-1', request, pollIntervalMs: 1 })
      ).resolves.toBe(true);
      // Three workflows are listed per poll, so a second poll means the child was seen running.
      expect(getWorkflowExecutions.mock.calls.length).toBeGreaterThan(3);
    });

    it('ignores the runs of other sources', async () => {
      const getWorkflowExecutions = jest.fn().mockResolvedValue({
        results: [
          {
            ...runningChild,
            concurrencyGroupKey: 'nightshift-source-features-identification-other:source-2',
          },
        ],
      });
      const { client } = createClient({ getWorkflowExecutions });
      const request = httpServerMock.createKibanaRequest();

      await expect(
        client.waitForSourceRunsToStop({ sourceId: 'source-1', request, pollIntervalMs: 1 })
      ).resolves.toBe(true);
    });

    it('gives up after the timeout while a run is still going', async () => {
      const getWorkflowExecutions = jest.fn().mockResolvedValue({ results: [runningChild] });
      const { client } = createClient({ getWorkflowExecutions });
      const request = httpServerMock.createKibanaRequest();

      await expect(
        client.waitForSourceRunsToStop({
          sourceId: 'source-1',
          request,
          timeoutMs: 20,
          pollIntervalMs: 5,
        })
      ).resolves.toBe(false);
    });
  });

  describe('cancelAllRunning', () => {
    it('cancels all non-terminal onboarding executions, and the entry point runs that wait for them', async () => {
      const { client, managementApi } = createClient({
        getWorkflowExecutions: jest.fn(async ({ workflowId }: { workflowId: string }) =>
          workflowId === ENTRY_POINT_ID
            ? { results: [{ id: 'entry-exec', status: ExecutionStatus.RUNNING }] }
            : {
                results: [
                  { id: 'exec-1', status: ExecutionStatus.RUNNING },
                  { id: 'exec-2', status: ExecutionStatus.PENDING },
                ],
              }
        ),
      });
      const request = httpServerMock.createKibanaRequest();

      await expect(client.cancelAllRunning({ request })).resolves.toBe(3);

      expect(managementApi.cancelWorkflowExecution).toHaveBeenCalledTimes(3);
      expect(managementApi.cancelWorkflowExecution).toHaveBeenCalledWith(
        'entry-exec',
        'default',
        request
      );
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

  it('lets a run of the entry point that started after the onboarding run stand for it', async () => {
    const { client } = createStatusClient(
      withOnboardingRuns(
        onboardingRun({ startedAt: '2026-10-29T10:00:00.000Z', status: ExecutionStatus.COMPLETED })
      ),
      [entryPointRun({ status: ExecutionStatus.QUEUED })]
    );

    const result = await client.getRecentExecutions(statusRequest);

    expect(result).toEqual([
      expect.objectContaining({
        id: 'entry-1',
        concurrencyGroupKey: onboardingKeyOf('logs.nginx'),
      }),
    ]);
  });

  it('adds the run of the entry point of a source that has no onboarding run', async () => {
    const { client } = createStatusClient({}, [entryPointRun()]);

    const result = await client.getRecentExecutions(statusRequest);

    expect(result).toEqual([
      expect.objectContaining({
        id: 'entry-1',
        concurrencyGroupKey: onboardingKeyOf('logs.nginx'),
      }),
    ]);
  });

  it('keeps the onboarding run when it started after the run of the entry point', async () => {
    const { client } = createStatusClient(withOnboardingRuns(onboardingRun()), [entryPointRun()]);

    const result = await client.getRecentExecutions(statusRequest);

    expect(result).toEqual([expect.objectContaining({ id: 'onboarding-1' })]);
  });
});
