/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MAX_ID_LENGTH,
  NightshiftModelBlockedError,
  type QueryLink,
} from '@kbn/significant-events-schema';
import { forbidden } from '@hapi/boom';
import { DeepStrict } from '@kbn/zod-helpers';
import type { SignificantEventsMaintenanceState } from '../../../../../common/maintenance/state_machine';
import { KI_QUERY_GENERATION_AGENT_ID } from '../../../../agent_builder/agents/ki_query_generation';
import { internalKIQueriesRoutes } from './route';

jest.mock('../../../utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn().mockResolvedValue(undefined),
}));

const mockFetchQueryLinks = jest.fn();
const mockComputeOccurrences = jest.fn();
const mockGenerateKIQueries = jest.fn();
const mockCleanupStaleEvents = jest.fn();

jest.mock('../../../../lib/significant_events/fetch_query_occurrences_from_alerts', () => ({
  fetchQueryLinks: (...args: unknown[]) => mockFetchQueryLinks(...args),
  computeOccurrences: (...args: unknown[]) => mockComputeOccurrences(...args),
  toQueryWithOccurrences: ({ queryLink }: { queryLink: QueryLink }) => ({
    ...queryLink.query,
    source_id: queryLink.source_id,
    rule_backed: queryLink.rule_backed,
    occurrences: [],
    change_points: {},
  }),
}));

const mockGetLiveEntities = jest.fn();
jest.mock('../../../../lib/significant_events/entities/get_live_entities', () => ({
  getLiveEntities: (...args: unknown[]) => mockGetLiveEntities(...args),
}));

jest.mock('../../../../lib/significant_events/ki_queries_generation_service', () => ({
  generateKIQueries: (...args: unknown[]) => mockGenerateKIQueries(...args),
}));

jest.mock('../../../../lib/significant_events/events/cleanup_stale_events', () => ({
  cleanupStaleEvents: (...args: unknown[]) => mockCleanupStaleEvents(...args),
}));

jest.mock('../../../../lib/significant_events/create_significant_events_traced_es_client', () => ({
  createSignificantEventsTracedEsClient: jest.fn().mockReturnValue({}),
}));

const discoveryQueriesRoute = internalKIQueriesRoutes['GET /internal/streams/_queries'];
const bulkDeleteRoute = internalKIQueriesRoutes['POST /internal/streams/queries/_bulk_delete'];
const upsertQueryRoute =
  internalKIQueriesRoutes['PUT /internal/significant_events/queries/{queryId}'];

type DiscoveryHandlerParams = Parameters<typeof discoveryQueriesRoute.handler>[0];
type GenerateHandlerParams = Parameters<
  (typeof internalKIQueriesRoutes)['POST /internal/streams/{sourceId}/queries/_generate']['handler']
>[0];

const makeMaintenanceService = (state: SignificantEventsMaintenanceState = 'enabled') => ({
  getState: jest.fn().mockResolvedValue(state),
});

// Mirrors `IndicatorReader.getQueryLinks`: an empty source list yields no links, so a handler
// that forgets to name its sources finds nothing here, exactly as it does against the real client.
const makeGetQueryLinks = (links: QueryLink[]) =>
  jest.fn(async (sourceIds: string[]) =>
    links.filter((link) => sourceIds.includes(link.source_id))
  );

const makeSourcesList = (...ids: string[]) =>
  jest.fn().mockResolvedValue({
    sources: ids.map((id) => ({ id, enabled: true })),
    total: ids.length,
  });

const makeQueryLink = (id: string, severityScore: number, sourceId = 'logs.test'): QueryLink => ({
  query: {
    id,
    type: 'match',
    title: id,
    description: 'desc',
    esql: { query: `FROM logs-* | WHERE id == "${id}"` },
    severity_score: severityScore,
  },
  source_id: sourceId,
  rule_backed: true,
  rule_id: `rule-${id}`,
});

const makeServer = () =>
  ({
    core: {
      security: {
        authc: {
          getCurrentUser: jest.fn().mockReturnValue({ authentication_type: 'basic' }),
        },
      },
    },
  } as unknown as DiscoveryHandlerParams['server']);

// Handler tests call the route function directly (no Zod transform), so dates
// must already be `Date` instances — matching `makeIsoDateFromString` output.
const discoveryBaseQuery = {
  from: new Date('2024-01-01T00:00:00.000Z'),
  to: new Date('2024-01-02T00:00:00.000Z'),
  bucketSize: '1h',
};

describe('pause guard on rule-touching query routes', () => {
  const demoteRoute = internalKIQueriesRoutes['POST /internal/streams/queries/_demote'];
  const generateRoute =
    internalKIQueriesRoutes['POST /internal/streams/{sourceId}/queries/_generate'];

  // getKnowledgeIndicatorClient is the first rule-touching call in each handler and
  // runs only after the guard, so "not called" proves the guard short-circuits first.
  const expectPausedBeforeRuleWork = async <P>(
    handler: (params: P) => Promise<unknown>,
    params: Record<string, unknown>
  ) => {
    const getKnowledgeIndicatorClient = jest.fn();
    const handlerParams = {
      params,
      request: {},
      getScopedClients: jest.fn().mockResolvedValue({
        licensing: {},
        uiSettingsClient: {},
        getKnowledgeIndicatorClient,
      }),
      server: makeServer(),
      maintenanceService: makeMaintenanceService('paused'),
      logger: { warn: jest.fn(), get: jest.fn().mockReturnValue({ warn: jest.fn() }) },
      telemetry: {},
    } as unknown as P;

    await expect(handler(handlerParams)).rejects.toMatchObject({ output: { statusCode: 409 } });
    expect(getKnowledgeIndicatorClient).not.toHaveBeenCalled();
  };

  it('rejects _demote with 409 while paused', async () => {
    await expectPausedBeforeRuleWork(demoteRoute.handler, { body: { queryIds: ['q1'] } });
  });

  it('rejects _generate with 409 while paused', async () => {
    await expectPausedBeforeRuleWork(generateRoute.handler, {
      path: { sourceId: 'logs.test' },
      body: null,
    });
  });

  it('rejects upsert with 409 while paused', async () => {
    await expectPausedBeforeRuleWork(upsertQueryRoute.handler, {
      path: { queryId: 'q1' },
      body: {
        title: 'Error count',
        description: '',
        esql: { query: 'FROM logs.test | WHERE log.level == "error"' },
        source_id: 'logs.test',
      },
    });
  });
});

describe('demoteBackedQueriesRoute', () => {
  const demoteRoute = internalKIQueriesRoutes['POST /internal/streams/queries/_demote'];

  it('finds queries across the catalog sources and demotes them per source', async () => {
    const demoteQueries = jest.fn().mockResolvedValue({ demoted: 1 });
    const getQueryLinks = makeGetQueryLinks([
      makeQueryLink('q1', 40, 'logs.a'),
      makeQueryLink('q2', 40, 'logs.b'),
    ]);
    const handlerParams = {
      params: { body: { queryIds: ['q1', 'q2'] } },
      request: {},
      getScopedClients: jest.fn().mockResolvedValue({
        sourcesClient: { list: makeSourcesList('logs.a', 'logs.b') },
        licensing: {},
        getKnowledgeIndicatorClient: jest.fn().mockResolvedValue({ getQueryLinks, demoteQueries }),
      }),
      server: makeServer(),
      maintenanceService: makeMaintenanceService(),
      logger: { warn: jest.fn() },
    } as unknown as Parameters<typeof demoteRoute.handler>[0];

    await expect(demoteRoute.handler(handlerParams)).resolves.toEqual({ demoted: 2 });
    expect(getQueryLinks).toHaveBeenCalledWith(['logs.a', 'logs.b'], expect.anything());
    expect(demoteQueries).toHaveBeenCalledWith('logs.a', ['q1']);
    expect(demoteQueries).toHaveBeenCalledWith('logs.b', ['q2']);
  });
});

describe('bulkDeleteQueriesRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('triggers stale event cleanup only for deleted backing rules', async () => {
    const eventClient = {};
    const rulesClient = {};
    const sigEventsLogger = { error: jest.fn() };
    const deleteQueries = jest.fn().mockResolvedValue(undefined);
    const handlerParams = {
      params: { body: { queryIds: ['q1', 'q2'] } },
      request: {},
      getScopedClients: jest.fn().mockResolvedValue({
        sourcesClient: {
          list: makeSourcesList('logs.test'),
          get: jest.fn().mockResolvedValue({ source: { id: 'logs.test', enabled: true } }),
        },
        licensing: {},
        getKnowledgeIndicatorClient: jest.fn().mockResolvedValue({
          getQueryLinks: makeGetQueryLinks([
            makeQueryLink('q1', 40),
            { ...makeQueryLink('q2', 40), rule_backed: false },
          ]),
          deleteQueries,
        }),
        getEventSearchClient: () => eventClient,
        getSignificantEventsAlertingContext: jest.fn().mockResolvedValue({ rulesClient }),
      }),
      server: makeServer(),
      logger: {
        warn: jest.fn(),
        get: jest.fn().mockReturnValue(sigEventsLogger),
      },
    } as never;

    await expect(bulkDeleteRoute.handler(handlerParams)).resolves.toEqual({
      succeeded: 2,
      failed: 0,
      skipped: 0,
    });
    expect(deleteQueries).toHaveBeenCalled();
    expect(mockCleanupStaleEvents).toHaveBeenCalledWith({
      eventSearchClient: eventClient,
      rulesClient,
      candidateRuleIds: ['rule-q1'],
    });
  });

  it('excludes backing rules from streams whose deletion failed', async () => {
    const eventClient = {};
    const rulesClient = {};
    const sigEventsLogger = { error: jest.fn() };
    const deleteQueries = jest
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('storage write failed'));
    const handlerParams = {
      params: { body: { queryIds: ['q1', 'q2'] } },
      request: {},
      getScopedClients: jest.fn().mockResolvedValue({
        sourcesClient: {
          list: makeSourcesList('logs.success', 'logs.failed'),
          get: jest.fn().mockImplementation((id: string) => Promise.resolve({ source: { id } })),
        },
        licensing: {},
        getKnowledgeIndicatorClient: jest.fn().mockResolvedValue({
          getQueryLinks: makeGetQueryLinks([
            makeQueryLink('q1', 40, 'logs.success'),
            makeQueryLink('q2', 40, 'logs.failed'),
          ]),
          deleteQueries,
        }),
        getEventSearchClient: () => eventClient,
        getSignificantEventsAlertingContext: jest.fn().mockResolvedValue({ rulesClient }),
      }),
      server: makeServer(),
      logger: {
        warn: jest.fn(),
        get: jest.fn().mockReturnValue(sigEventsLogger),
      },
    } as never;

    await expect(bulkDeleteRoute.handler(handlerParams)).resolves.toEqual({
      succeeded: 1,
      failed: 1,
      skipped: 0,
    });
    expect(mockCleanupStaleEvents).toHaveBeenCalledWith({
      eventSearchClient: eventClient,
      rulesClient,
      candidateRuleIds: ['rule-q1'],
    });
  });
});

describe('getDiscoveryQueriesRoute source resolution', () => {
  const list = jest.fn().mockResolvedValue({
    sources: [{ id: 'logs.a' }, { id: 'logs.b' }],
    total: 2,
    page: 1,
    per_page: 100,
  });
  const kiClient = {};
  const findRuleEnabledStates = jest.fn().mockResolvedValue(new Map<string, boolean>());
  const assertReadable = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    findRuleEnabledStates.mockResolvedValue(new Map<string, boolean>());
    assertReadable.mockResolvedValue(undefined);
    list.mockResolvedValue({
      sources: [{ id: 'logs.a' }, { id: 'logs.b' }],
      total: 2,
      page: 1,
      per_page: 100,
    });
    mockFetchQueryLinks.mockResolvedValue([makeQueryLink('q1', 80)]);
    mockComputeOccurrences.mockResolvedValue({
      sparseByRule: new Map(),
      aggregatedOccurrences: [],
      timeline: [],
    });
  });

  const makeDiscoveryHandlerParams = (query: Record<string, unknown>): DiscoveryHandlerParams =>
    ({
      params: { query },
      request: {},
      getScopedClients: jest.fn().mockResolvedValue({
        sourcesClient: { list, assertReadable },
        licensing: {},
        scopedClusterClient: { asCurrentUser: {} },
        getKnowledgeIndicatorClient: jest.fn().mockResolvedValue(kiClient),
        getSignificantEventsAlertingContext: jest.fn().mockResolvedValue({
          alertsReader: {},
          rulesClient: { findRuleEnabledStates },
        }),
      }),
      getSpaceId: jest.fn().mockResolvedValue('default'),
      server: makeServer(),
      logger: { warn: jest.fn() },
    } as unknown as DiscoveryHandlerParams);

  it('lists streams then searches when query is set and sourceIds is omitted', async () => {
    await discoveryQueriesRoute.handler(
      makeDiscoveryHandlerParams({ ...discoveryBaseQuery, query: 'checkout' })
    );

    expect(list).toHaveBeenCalled();
    expect(mockFetchQueryLinks).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceIds: ['logs.a', 'logs.b'],
        query: 'checkout',
      }),
      kiClient
    );
  });

  it('passes explicit source ids through without listing the catalog', async () => {
    await discoveryQueriesRoute.handler(
      makeDiscoveryHandlerParams({
        ...discoveryBaseQuery,
        query: 'checkout',
        sourceIds: ['logs.only'],
      })
    );

    expect(list).not.toHaveBeenCalled();
    expect(mockFetchQueryLinks).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceIds: ['logs.only'],
        query: 'checkout',
      }),
      kiClient
    );
  });

  it('resolves streams for the unfiltered list path when sourceIds is omitted', async () => {
    await discoveryQueriesRoute.handler(makeDiscoveryHandlerParams({ ...discoveryBaseQuery }));

    expect(list).toHaveBeenCalled();
    expect(mockFetchQueryLinks).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceIds: ['logs.a', 'logs.b'],
        query: undefined,
      }),
      kiClient
    );
  });

  it('narrows the read to the requested query ids', async () => {
    await discoveryQueriesRoute.handler(
      makeDiscoveryHandlerParams({ ...discoveryBaseQuery, queryIds: ['q1'] })
    );

    expect(mockFetchQueryLinks).toHaveBeenCalledWith(
      expect.objectContaining({ filters: expect.objectContaining({ queryIds: ['q1'] }) }),
      kiClient
    );
  });

  it('searches only the sources the caller can read', async () => {
    assertReadable.mockImplementation(async (id: string) => {
      if (id === 'logs.b') {
        throw forbidden('no access');
      }
    });

    await discoveryQueriesRoute.handler(
      makeDiscoveryHandlerParams({ ...discoveryBaseQuery, query: 'checkout' })
    );

    expect(mockFetchQueryLinks).toHaveBeenCalledWith(
      expect.objectContaining({ sourceIds: ['logs.a'] }),
      expect.anything()
    );
  });

  it('drops an unreadable source from a caller-provided id list', async () => {
    assertReadable.mockImplementation(async (id: string) => {
      if (id === 'logs.b') {
        throw forbidden('no access');
      }
    });

    await discoveryQueriesRoute.handler(
      makeDiscoveryHandlerParams({ ...discoveryBaseQuery, sourceIds: ['logs.a', 'logs.b'] })
    );

    expect(mockFetchQueryLinks).toHaveBeenCalledWith(
      expect.objectContaining({ sourceIds: ['logs.a'] }),
      expect.anything()
    );
  });
  it('reports enabled states for live rules and false for missing rules', async () => {
    mockFetchQueryLinks.mockResolvedValue([makeQueryLink('q1', 80), makeQueryLink('q2', 60)]);
    findRuleEnabledStates.mockResolvedValue(new Map([['rule-q1', true]]));
    const result = await discoveryQueriesRoute.handler(
      makeDiscoveryHandlerParams(discoveryBaseQuery)
    );
    expect(findRuleEnabledStates).toHaveBeenCalledWith(['rule-q1', 'rule-q2']);
    expect(result.queries.map(({ rule_enabled }) => rule_enabled)).toEqual([true, false]);
  });

  describe('entity selection', () => {
    const linkTo = (id: string, entityId: string): QueryLink => {
      const link = makeQueryLink(id, 50);
      return { ...link, query: { ...link.query, features: [{ id: entityId, run_id: 'run' }] } };
    };

    beforeEach(() => {
      mockFetchQueryLinks.mockResolvedValue([
        linkTo('q1', 'checkout'),
        linkTo('q2', 'payment'),
        linkTo('q3', 'expired'),
      ]);
      mockGetLiveEntities.mockResolvedValue({
        entities: [{ id: 'checkout' }, { id: 'payment' }],
        truncated: false,
      });
    });

    it.each([
      ['a selected entity', { entityIds: ['checkout'] }, ['q1']],
      ['Unassigned', { unassignedEntities: true }, ['q3']],
      [
        'an entity plus Unassigned',
        { entityIds: ['checkout'], unassignedEntities: true },
        ['q1', 'q3'],
      ],
    ])('keeps queries for %s before paging', async (_, selection, ids) => {
      const result = await discoveryQueriesRoute.handler(
        makeDiscoveryHandlerParams({ ...discoveryBaseQuery, ...selection })
      );
      expect(result.queries.map(({ id }) => id)).toEqual(ids);
      expect(result.total).toBe(ids.length);
    });

    it('filters before paging, so a match past the first unfiltered page is returned', async () => {
      const result = await discoveryQueriesRoute.handler(
        makeDiscoveryHandlerParams({
          ...discoveryBaseQuery,
          page: 1,
          perPage: 1,
          entityIds: ['expired'],
        })
      );
      expect(result.queries.map(({ id }) => id)).toEqual(['q3']);
      expect(result.total).toBe(1);
    });

    it('ignores Unassigned when the live entity list is truncated', async () => {
      mockGetLiveEntities.mockResolvedValue({ entities: [{ id: 'checkout' }], truncated: true });
      const result = await discoveryQueriesRoute.handler(
        makeDiscoveryHandlerParams({ ...discoveryBaseQuery, unassignedEntities: true })
      );
      expect(result.total).toBe(3);
    });
  });

  it('returns the list without enabled states if the lookup fails', async () => {
    findRuleEnabledStates.mockRejectedValue(new Error('no permission'));
    const params = makeDiscoveryHandlerParams(discoveryBaseQuery);
    const result = await discoveryQueriesRoute.handler(params);
    expect(result.queries[0]).not.toHaveProperty('rule_enabled');
    expect(params.logger.warn).toHaveBeenCalled();
  });
});

describe('promoteUnbackedQueriesRoute', () => {
  const promoteRoute = internalKIQueriesRoutes['POST /internal/streams/queries/_promote'];

  it('offers only enabled sources for promotion, so disabled sources get no live rules', async () => {
    const promoteUnbackedQueries = jest
      .fn()
      .mockResolvedValue({ promoted: 1, skipped_stats: 0, skipped_ineligible: 0 });
    const list = jest.fn().mockResolvedValue({ sources: [{ id: 'enabled-source' }], total: 1 });
    const handlerParams = {
      params: { body: { queryIds: ['q1'] } },
      request: {},
      getScopedClients: jest.fn().mockResolvedValue({
        sourcesClient: { list },
        licensing: {},
        getKnowledgeIndicatorClient: jest.fn().mockResolvedValue({ promoteUnbackedQueries }),
      }),
      server: {},
      maintenanceService: makeMaintenanceService(),
    } as unknown as Parameters<typeof promoteRoute.handler>[0];

    await promoteRoute.handler(handlerParams);

    expect(list).toHaveBeenCalledWith(expect.objectContaining({ enabled: true }));
    expect(promoteUnbackedQueries).toHaveBeenCalledWith(
      expect.objectContaining({ queryIds: ['q1'], sourceIds: ['enabled-source'] })
    );
  });
});

describe('persistQueriesRoute', () => {
  const persistRoute =
    internalKIQueriesRoutes['POST /internal/streams/{sourceId}/queries/_persist'];

  it('rejects a disabled source, which would get a live rule', async () => {
    const handlerParams = {
      params: { path: { sourceId: 'logs.test' }, body: { queries: [] } },
      request: {},
      getScopedClients: jest.fn().mockResolvedValue({
        sourcesClient: {
          get: jest.fn().mockResolvedValue({
            source: { id: 'logs.test', view_name: 'logs.test', enabled: false },
          }),
        },
        licensing: {},
        getKnowledgeIndicatorClient: jest.fn().mockResolvedValue({}),
      }),
      server: makeServer(),
      maintenanceService: makeMaintenanceService(),
    } as unknown as Parameters<typeof persistRoute.handler>[0];

    await expect(persistRoute.handler(handlerParams)).rejects.toMatchObject({
      output: { statusCode: 409 },
    });
  });
});

describe('generateQueriesRoute', () => {
  const generateRoute =
    internalKIQueriesRoutes['POST /internal/streams/{sourceId}/queries/_generate'];
  const strictGenerateParams = DeepStrict(generateRoute.params);

  beforeEach(() => {
    mockGenerateKIQueries.mockReset();
    mockGenerateKIQueries.mockResolvedValue({
      queries: [],
      tokensUsed: { prompt: 0, completion: 0, total: 0 },
      connectorId: 'test-connector',
    });
  });

  const makeAgentBuilder = () => ({
    agents: { ensure: jest.fn().mockResolvedValue(undefined) },
  });

  const makeHandlerParams = ({
    agentBuilder,
    body = { connectorId: 'test-connector' },
  }: {
    agentBuilder: unknown;
    body?: Record<string, unknown>;
  }) =>
    ({
      params: { path: { sourceId: 'logs.test' }, body },
      request: { spaceId: 'space-a', events: { aborted$: { subscribe: jest.fn() } } },
      getScopedClients: jest.fn().mockResolvedValue({
        sourcesClient: {
          get: jest.fn().mockResolvedValue({
            source: { id: 'logs.test', view_name: '$.nightshift.sources.default.logs' },
          }),
        },
        licensing: {},
        getKnowledgeIndicatorClient: jest.fn().mockResolvedValue({}),
      }),
      server: {
        core: {
          featureFlags: {},
        },
        agentBuilder,
      },
      maintenanceService: makeMaintenanceService(),
      logger: {
        warn: jest.fn(),
        get: jest.fn().mockReturnValue({ warn: jest.fn(), debug: jest.fn(), trace: jest.fn() }),
      },
      telemetry: {},
    } as unknown as GenerateHandlerParams);

  it('retains valid run ids and rejects blank or overlong run ids during route validation', () => {
    const parsed = strictGenerateParams.safeParse({
      path: { sourceId: 'logs.test' },
      body: { runId: 'run-1' },
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.body?.runId).toBe('run-1');
    }
    expect(
      strictGenerateParams.safeParse({
        path: { sourceId: 'logs.test' },
        body: { runId: '   ' },
      }).success
    ).toBe(false);
    expect(
      strictGenerateParams.safeParse({
        path: { sourceId: 'logs.test' },
        body: { runId: 'x'.repeat(MAX_ID_LENGTH + 1) },
      }).success
    ).toBe(false);
  });

  it('accepts bounded existing-query context limits and defaults omission to 50', () => {
    for (const value of [0, 10, 50]) {
      expect(
        strictGenerateParams.safeParse({
          path: { sourceId: 'logs.test' },
          body: { maxExistingQueriesForContext: value },
        }).success
      ).toBe(true);
    }

    const omitted = strictGenerateParams.safeParse({
      path: { sourceId: 'logs.test' },
      body: {},
    });
    expect(omitted.success).toBe(true);
    if (omitted.success) {
      expect(omitted.data.body?.maxExistingQueriesForContext).toBe(50);
    }

    for (const value of [-1, 51, 1.5]) {
      expect(
        strictGenerateParams.safeParse({
          path: { sourceId: 'logs.test' },
          body: { maxExistingQueriesForContext: value },
        }).success
      ).toBe(false);
    }
  });

  it('delegates to query generation and returns its result', async () => {
    const result = await generateRoute.handler(
      makeHandlerParams({
        agentBuilder: makeAgentBuilder(),
        body: {
          connectorId: 'test-connector',
          runId: 'run-1',
          maxExistingQueriesForContext: 10,
        },
      })
    );

    expect(mockGenerateKIQueries).toHaveBeenCalledWith(
      expect.objectContaining({
        source: { id: 'logs.test', view_name: '$.nightshift.sources.default.logs' },
        connectorId: 'test-connector',
        runId: 'run-1',
        maxExistingQueriesForContext: 10,
      }),
      expect.any(Object)
    );
    expect(result).toEqual({
      queries: [],
      tokensUsed: { prompt: 0, completion: 0, total: 0 },
      connectorId: 'test-connector',
    });
  });

  it('installs the KI query generation agent in the request space before generating', async () => {
    const agentBuilder = makeAgentBuilder();

    await generateRoute.handler(makeHandlerParams({ agentBuilder }));

    expect(agentBuilder.agents.ensure).toHaveBeenCalledWith(
      expect.objectContaining({
        spaceId: 'space-a',
        agent: expect.objectContaining({ id: KI_QUERY_GENERATION_AGENT_ID }),
      })
    );
    expect(agentBuilder.agents.ensure.mock.invocationCallOrder[0]).toBeLessThan(
      mockGenerateKIQueries.mock.invocationCallOrder[0]
    );
  });

  it('generates a run id when one is not provided', async () => {
    await generateRoute.handler(makeHandlerParams({ agentBuilder: makeAgentBuilder() }));

    const { runId, maxExistingQueriesForContext } = mockGenerateKIQueries.mock.calls[0][0];
    expect(runId).toEqual(expect.any(String));
    expect(runId).not.toBe('');
    expect(maxExistingQueriesForContext).toBe(50);
  });

  it('fails when agent builder is unavailable', async () => {
    await expect(
      generateRoute.handler(makeHandlerParams({ agentBuilder: undefined }))
    ).rejects.toThrow('Agent Builder is required');
    expect(mockGenerateKIQueries).not.toHaveBeenCalled();
  });

  it('maps a blocked model to a 400 response', async () => {
    mockGenerateKIQueries.mockRejectedValueOnce(
      new NightshiftModelBlockedError('custom-model', 'default-model')
    );

    await expect(
      generateRoute.handler(
        makeHandlerParams({
          agentBuilder: makeAgentBuilder(),
          body: { connectorId: 'custom-model' },
        })
      )
    ).rejects.toMatchObject({ output: { statusCode: 400 } });
  });
});

describe('upsertQueryRoute', () => {
  const source = { id: 'logs.test', view_name: 'logs.test, logs.test.*', enabled: true };
  const disabledSource = { ...source, enabled: false };
  const upsertBody = {
    title: 'Error count',
    description: '',
    esql: { query: 'FROM logs.test, logs.test.* | WHERE log.level == "error"' },
  };

  it('upserts against the provided source_id', async () => {
    const upsertQuery = jest.fn().mockResolvedValue(undefined);
    const getQueryLinks = makeGetQueryLinks([]);
    const handlerParams = {
      params: { path: { queryId: 'q1' }, body: { ...upsertBody, source_id: 'logs.test' } },
      request: {},
      getScopedClients: jest.fn().mockResolvedValue({
        sourcesClient: {
          list: makeSourcesList('logs.test', 'logs.other'),
          get: jest.fn().mockResolvedValue({ source }),
        },
        licensing: {},
        getKnowledgeIndicatorClient: jest.fn().mockResolvedValue({ upsertQuery, getQueryLinks }),
      }),
      server: makeServer(),
      maintenanceService: makeMaintenanceService(),
    } as unknown as Parameters<typeof upsertQueryRoute.handler>[0];

    await expect(upsertQueryRoute.handler(handlerParams)).resolves.toEqual({ acknowledged: true });
    expect(upsertQuery).toHaveBeenCalledWith(
      'logs.test',
      expect.objectContaining({
        id: 'q1',
        type: 'match',
        title: 'Error count',
        esql: upsertBody.esql,
      })
    );
  });

  it('upserts when source_id matches the source that owns the existing query', async () => {
    const upsertQuery = jest.fn().mockResolvedValue(undefined);
    const handlerParams = {
      params: { path: { queryId: 'q1' }, body: { ...upsertBody, source_id: 'logs.test' } },
      request: {},
      getScopedClients: jest.fn().mockResolvedValue({
        sourcesClient: {
          list: makeSourcesList('logs.test', 'logs.other'),
          get: jest.fn().mockResolvedValue({ source }),
        },
        licensing: {},
        getKnowledgeIndicatorClient: jest.fn().mockResolvedValue({
          upsertQuery,
          getQueryLinks: makeGetQueryLinks([makeQueryLink('q1', 40)]),
        }),
      }),
      server: makeServer(),
      maintenanceService: makeMaintenanceService(),
    } as unknown as Parameters<typeof upsertQueryRoute.handler>[0];

    await expect(upsertQueryRoute.handler(handlerParams)).resolves.toEqual({ acknowledged: true });
    expect(upsertQuery).toHaveBeenCalledWith('logs.test', expect.objectContaining({ id: 'q1' }));
  });

  it('edits the query of source_id when another source holds the same query id', async () => {
    const upsertQuery = jest.fn().mockResolvedValue(undefined);
    const handlerParams = {
      params: { path: { queryId: 'q1' }, body: { ...upsertBody, source_id: 'logs.test' } },
      request: {},
      getScopedClients: jest.fn().mockResolvedValue({
        sourcesClient: {
          list: makeSourcesList('logs.test', 'logs.other'),
          get: jest.fn().mockResolvedValue({ source }),
        },
        licensing: {},
        getKnowledgeIndicatorClient: jest.fn().mockResolvedValue({
          upsertQuery,
          // The other source's link comes first, which used to win the lookup.
          getQueryLinks: makeGetQueryLinks([
            makeQueryLink('q1', 40, 'logs.other'),
            makeQueryLink('q1', 40, 'logs.test'),
          ]),
        }),
      }),
      server: makeServer(),
      maintenanceService: makeMaintenanceService(),
    } as unknown as Parameters<typeof upsertQueryRoute.handler>[0];

    await expect(upsertQueryRoute.handler(handlerParams)).resolves.toEqual({ acknowledged: true });
    expect(upsertQuery).toHaveBeenCalledWith('logs.test', expect.objectContaining({ id: 'q1' }));
  });

  it('throws 404 when the query belongs to a different source than source_id', async () => {
    const upsertQuery = jest.fn();
    const sourcesGet = jest.fn();
    const handlerParams = {
      params: { path: { queryId: 'q1' }, body: { ...upsertBody, source_id: 'logs.other' } },
      request: {},
      getScopedClients: jest.fn().mockResolvedValue({
        sourcesClient: { list: makeSourcesList('logs.test', 'logs.other'), get: sourcesGet },
        licensing: {},
        getKnowledgeIndicatorClient: jest.fn().mockResolvedValue({
          upsertQuery,
          getQueryLinks: makeGetQueryLinks([makeQueryLink('q1', 40)]),
        }),
      }),
      server: makeServer(),
      maintenanceService: makeMaintenanceService(),
    } as unknown as Parameters<typeof upsertQueryRoute.handler>[0];

    await expect(upsertQueryRoute.handler(handlerParams)).rejects.toMatchObject({
      output: { statusCode: 404 },
    });
    expect(sourcesGet).not.toHaveBeenCalled();
    expect(upsertQuery).not.toHaveBeenCalled();
  });

  it('resolves the source from an existing query when source_id is omitted', async () => {
    const upsertQuery = jest.fn().mockResolvedValue(undefined);
    const handlerParams = {
      params: { path: { queryId: 'q1' }, body: upsertBody },
      request: {},
      getScopedClients: jest.fn().mockResolvedValue({
        sourcesClient: {
          list: makeSourcesList('logs.test', 'logs.other'),
          get: jest.fn().mockResolvedValue({ source }),
        },
        licensing: {},
        getKnowledgeIndicatorClient: jest.fn().mockResolvedValue({
          upsertQuery,
          getQueryLinks: makeGetQueryLinks([makeQueryLink('q1', 40)]),
        }),
      }),
      server: makeServer(),
      maintenanceService: makeMaintenanceService(),
    } as unknown as Parameters<typeof upsertQueryRoute.handler>[0];

    await expect(upsertQueryRoute.handler(handlerParams)).resolves.toEqual({ acknowledged: true });
    expect(upsertQuery).toHaveBeenCalledWith('logs.test', expect.objectContaining({ id: 'q1' }));
  });

  it('throws 404 when the query is missing and no source_id is provided', async () => {
    const upsertQuery = jest.fn();
    const handlerParams = {
      params: { path: { queryId: 'missing' }, body: upsertBody },
      request: {},
      getScopedClients: jest.fn().mockResolvedValue({
        sourcesClient: { list: makeSourcesList('logs.test'), get: jest.fn() },
        licensing: {},
        getKnowledgeIndicatorClient: jest.fn().mockResolvedValue({
          upsertQuery,
          getQueryLinks: makeGetQueryLinks([]),
        }),
      }),
      server: makeServer(),
      maintenanceService: makeMaintenanceService(),
    } as unknown as Parameters<typeof upsertQueryRoute.handler>[0];

    await expect(upsertQueryRoute.handler(handlerParams)).rejects.toMatchObject({
      output: { statusCode: 404 },
    });
    expect(upsertQuery).not.toHaveBeenCalled();
  });

  it('rejects every upsert for a disabled source, which would get a live rule', async () => {
    const upsertQuery = jest.fn();
    const handlerParams = {
      params: { path: { queryId: 'q1' }, body: upsertBody },
      request: {},
      getScopedClients: jest.fn().mockResolvedValue({
        sourcesClient: {
          list: makeSourcesList('logs.test'),
          get: jest.fn().mockResolvedValue({ source: disabledSource }),
        },
        licensing: {},
        getKnowledgeIndicatorClient: jest.fn().mockResolvedValue({
          upsertQuery,
          getQueryLinks: makeGetQueryLinks([makeQueryLink('q1', 40)]),
        }),
      }),
      server: makeServer(),
      maintenanceService: makeMaintenanceService(),
    } as unknown as Parameters<typeof upsertQueryRoute.handler>[0];

    await expect(upsertQueryRoute.handler(handlerParams)).rejects.toMatchObject({
      output: { statusCode: 409 },
    });
    expect(upsertQuery).not.toHaveBeenCalled();
  });

  it('does not persist when ES|QL is invalid', async () => {
    const upsertQuery = jest.fn();
    const handlerParams = {
      params: {
        path: { queryId: 'q1' },
        body: { ...upsertBody, esql: { query: 'NOT VALID' }, source_id: 'logs.test' },
      },
      request: {},
      getScopedClients: jest.fn().mockResolvedValue({
        sourcesClient: {
          list: makeSourcesList('logs.test', 'logs.other'),
          get: jest.fn().mockResolvedValue({ source }),
        },
        licensing: {},
        getKnowledgeIndicatorClient: jest
          .fn()
          .mockResolvedValue({ upsertQuery, getQueryLinks: makeGetQueryLinks([]) }),
      }),
      server: makeServer(),
      maintenanceService: makeMaintenanceService(),
    } as unknown as Parameters<typeof upsertQueryRoute.handler>[0];

    await expect(upsertQueryRoute.handler(handlerParams)).rejects.toMatchObject({
      output: { statusCode: 400 },
    });
    expect(upsertQuery).not.toHaveBeenCalled();
  });
});
