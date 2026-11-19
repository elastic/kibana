/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import {
  elasticsearchServiceMock,
  loggingSystemMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import {
  IncompleteClusterStateError,
  deriveStage,
  fetchAnalyticsClusterState,
  pickTimeField,
} from './analytics_cluster_state';

const SAMPLE_DASHBOARD_IDS = ['sample-logs-dashboard', 'sample-ecommerce-dashboard'];

interface ResolvedIndex {
  name: string;
  attributes?: string[];
  data_stream?: string;
}

interface ResolvedDataStream {
  name: string;
  backing_indices: string[];
  timestamp_field?: string;
}

interface StoredDashboard {
  id: string;
  title: string;
  originId?: string;
}

const createEsError = (statusCode: number): errors.ResponseError =>
  new errors.ResponseError({
    statusCode,
    body: { error: { type: 'security_exception' } },
    warnings: [],
    headers: {},
    meta: {} as never,
  });

describe('fetchAnalyticsClusterState', () => {
  const setup = ({
    indices = [],
    dataStreams = [],
    countsByIndex = {},
    failedShards = 0,
    dateFieldsBySource = {},
    dashboards = [],
    sampleDashboardIds = SAMPLE_DASHBOARD_IDS,
  }: {
    indices?: ResolvedIndex[];
    dataStreams?: ResolvedDataStream[];
    countsByIndex?: Record<string, number>;
    failedShards?: number;
    dateFieldsBySource?: Record<string, Record<string, string>>;
    /** Newest first, as the saved objects client returns them. */
    dashboards?: StoredDashboard[];
    sampleDashboardIds?: string[];
  } = {}) => {
    const client = elasticsearchServiceMock.createScopedClusterClient();
    const savedObjectsClient = savedObjectsClientMock.create();
    const logger = loggingSystemMock.createLogger();
    const total = Object.values(countsByIndex).reduce((sum, count) => sum + count, 0);

    client.asCurrentUser.indices.resolveIndex.mockResolvedValue({
      indices: indices.map(({ attributes = ['open'], ...index }) => ({ attributes, ...index })),
      data_streams: dataStreams.map((dataStream) => ({
        timestamp_field: '@timestamp',
        ...dataStream,
      })),
      aliases: [],
    });
    client.asCurrentUser.search.mockResolvedValue({
      took: 1,
      timed_out: false,
      _shards: { total: 3, successful: 3 - failedShards, failed: failedShards },
      hits: { total: { value: total, relation: 'eq' }, hits: [] },
      aggregations: {
        byIndex: {
          buckets: Object.entries(countsByIndex).map(([key, count]) => ({
            key,
            doc_count: count,
          })),
        },
      },
    });
    client.asCurrentUser.fieldCaps.mockImplementation((async ({ index }: { index: string }) => ({
      indices: [index],
      fields: Object.fromEntries(
        Object.entries(dateFieldsBySource[index] ?? {}).map(([field, type]) => [
          field,
          { [type]: { type, searchable: true, aggregatable: true } },
        ])
      ),
    })) as never);

    const toSavedObject = ({ id, title, originId }: StoredDashboard) => ({
      id,
      type: 'dashboard',
      attributes: { title },
      references: [],
      originId,
      score: 0,
    });
    savedObjectsClient.find.mockImplementation(async ({ filter, perPage = 20 }) => {
      const matching = filter
        ? dashboards.filter(({ originId }) => originId && sampleDashboardIds.includes(originId))
        : dashboards;
      return {
        total: matching.length,
        page: 1,
        per_page: perPage,
        saved_objects: matching.slice(0, perPage).map(toSavedObject),
      };
    });
    savedObjectsClient.bulkGet.mockImplementation(async (objects = []) => ({
      saved_objects: objects.map(({ id, type }) => {
        const found = dashboards.find((dashboard) => dashboard.id === id);
        return found
          ? toSavedObject(found)
          : {
              id,
              type,
              attributes: {},
              references: [],
              error: { statusCode: 404, error: 'Not Found', message: 'Not found' },
            };
      }),
    }));

    return {
      client,
      savedObjectsClient,
      logger,
      fetch: () =>
        fetchAnalyticsClusterState({ client, savedObjectsClient, logger, sampleDashboardIds }),
    };
  };

  it('reports no data for an empty cluster', async () => {
    const { fetch, client } = setup();

    await expect(fetch()).resolves.toEqual({
      stage: 'noData',
      journey: null,
      sources: [],
      totalSources: 0,
      documentsCount: 0,
      dashboardsCount: 0,
      recentDashboards: [],
    });
    expect(client.asCurrentUser.fieldCaps).not.toHaveBeenCalled();
  });

  it('reads as the current user over open user indices only', async () => {
    const { fetch, client } = setup();

    await fetch();

    const pattern = ['*', '-.*', '-traces-agent_builder.otel-*'];
    expect(client.asCurrentUser.indices.resolveIndex).toHaveBeenCalledWith(
      expect.objectContaining({ name: pattern, expand_wildcards: ['open'] })
    );
    expect(client.asCurrentUser.search).toHaveBeenCalledWith(
      expect.objectContaining({ index: pattern, expand_wildcards: ['open'], size: 0 })
    );
    expect(client.asInternalUser.search).not.toHaveBeenCalled();
    expect(client.asInternalUser.indices.resolveIndex).not.toHaveBeenCalled();
  });

  it('leaves out dot-prefixed, hidden, system and backing indices', async () => {
    const { fetch } = setup({
      indices: [
        { name: 'orders' },
        { name: '.internal' },
        { name: 'hidden-index', attributes: ['open', 'hidden'] },
        { name: 'system-index', attributes: ['open', 'system'] },
        { name: 'renamed-backing-index', data_stream: 'clicks' },
      ],
      dataStreams: [
        { name: 'clicks', backing_indices: ['.ds-clicks-000001', '.ds-clicks-000002'] },
        { name: '.hidden-stream', backing_indices: ['.ds-.hidden-stream-000001'] },
      ],
      countsByIndex: {
        orders: 5,
        '.internal': 100,
        'hidden-index': 100,
        'system-index': 100,
        'renamed-backing-index': 1,
        '.ds-clicks-000001': 7,
        '.ds-clicks-000002': 3,
        '.ds-.hidden-stream-000001': 100,
      },
    });

    const { sources, totalSources } = await fetch();

    expect(totalSources).toBe(2);
    expect(sources.map(({ name, kind, documentsCount }) => [name, kind, documentsCount])).toEqual([
      ['clicks', 'dataStream', 10],
      ['orders', 'index', 5],
    ]);
  });

  it('does not count sources that hold no documents', async () => {
    const { fetch } = setup({
      indices: [{ name: 'empty-index' }],
      dataStreams: [{ name: 'empty-stream', backing_indices: ['.ds-empty-stream-000001'] }],
    });

    await expect(fetch()).resolves.toMatchObject({ stage: 'noData', sources: [], totalSources: 0 });
  });

  it('returns the five largest sources, largest first, and counts all of them', async () => {
    const names = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    const { fetch, client } = setup({
      indices: names.map((name) => ({ name })),
      countsByIndex: { a: 1, b: 70, c: 30, d: 30, e: 50, f: 2, g: 60 },
    });

    const { sources, totalSources, documentsCount } = await fetch();

    expect(sources.map(({ name }) => name)).toEqual(['b', 'g', 'e', 'c', 'd']);
    expect(totalSources).toBe(7);
    expect(documentsCount).toBe(243);
    expect(client.asCurrentUser.fieldCaps).toHaveBeenCalledTimes(5);
    expect(client.asCurrentUser.search).toHaveBeenCalledTimes(1);
    expect(client.asCurrentUser.indices.resolveIndex).toHaveBeenCalledTimes(1);
  });

  it('detects the time field and flags Kibana sample data', async () => {
    const { fetch, client } = setup({
      indices: [
        { name: 'kibana_sample_data_ecommerce' },
        { name: 'with-timestamp' },
        { name: 'other-date' },
        { name: 'no-date' },
      ],
      countsByIndex: {
        kibana_sample_data_ecommerce: 4,
        'with-timestamp': 3,
        'other-date': 2,
        'no-date': 1,
      },
      dateFieldsBySource: {
        kibana_sample_data_ecommerce: {
          customer_birth_date: 'date',
          order_date: 'date',
          'products.created_on': 'date',
        },
        'with-timestamp': { '@timestamp': 'date_nanos', created: 'date' },
        'other-date': { updated: 'date', 'payment.settled_time': 'date', received_date: 'date' },
      },
    });

    const { sources } = await fetch();

    expect(
      sources.map(({ name, timeField, isSampleData }) => [name, timeField, isSampleData])
    ).toEqual([
      ['kibana_sample_data_ecommerce', 'order_date', true],
      ['with-timestamp', '@timestamp', false],
      ['other-date', 'received_date', false],
      ['no-date', null, false],
    ]);
    expect(client.asCurrentUser.fieldCaps).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'other-date',
        types: expect.arrayContaining([
          'date',
          'date_nanos',
          'keyword',
          'text',
          'long',
          'geo_point',
          'dense_vector',
          'sparse_vector',
          'rank_features',
        ]),
        filters: '-metadata,-parent,-nested',
      })
    );
  });

  it('reports the parts the fields of a source play, from the same request as the time field', async () => {
    const { fetch, client } = setup({
      indices: [{ name: 'payments' }, { name: 'notes' }],
      countsByIndex: { payments: 2, notes: 1 },
      dateFieldsBySource: {
        payments: {
          created_at: 'date',
          customer_id: 'keyword',
          amount: 'double',
          status: 'keyword',
        },
        notes: { created_at: 'date', body: 'text' },
      },
    });

    const { sources } = await fetch();

    expect(sources).toEqual([
      {
        name: 'payments',
        kind: 'index',
        dataKind: 'events',
        documentsCount: 2,
        timeField: 'created_at',
        isSampleData: false,
        fields: {
          actors: [{ name: 'customer_id', label: 'customer', kind: 'customer' }],
          measures: [{ name: 'amount', label: 'amount', kind: 'money' }],
          dimensions: [{ name: 'status', label: 'status', kind: 'status' }],
        },
      },
      {
        name: 'notes',
        kind: 'index',
        dataKind: 'search',
        documentsCount: 1,
        timeField: 'created_at',
        isSampleData: false,
      },
    ]);
    expect(client.asCurrentUser.fieldCaps).toHaveBeenCalledTimes(2);
  });

  it('uses the timestamp field a data stream declares', async () => {
    const { fetch } = setup({
      dataStreams: [
        { name: 'clicks', backing_indices: ['.ds-clicks-000001'], timestamp_field: 'observed' },
      ],
      countsByIndex: { '.ds-clicks-000001': 2 },
      dateFieldsBySource: { clicks: { observed: 'date', timestamp: 'date' } },
    });

    const { sources } = await fetch();

    expect(sources.map(({ name, timeField }) => [name, timeField])).toEqual([
      ['clicks', 'observed'],
    ]);
  });

  it('spends one field capabilities request per returned source', async () => {
    const { fetch, client } = setup({
      indices: [{ name: 'orders' }, { name: 'clicks' }],
      countsByIndex: { orders: 2, clicks: 1 },
    });

    await fetch();

    expect(client.asCurrentUser.fieldCaps).toHaveBeenCalledTimes(2);
    expect(client.asCurrentUser.indices.resolveIndex).toHaveBeenCalledTimes(1);
    expect(client.asCurrentUser.search).toHaveBeenCalledTimes(1);
  });

  describe('data kinds and journey', () => {
    const CLICKS = { '@timestamp': 'date', 'event.action': 'keyword', 'user.id': 'keyword' };
    const CATALOG = { title: 'text', description: 'text', price: 'float', updated_at: 'date' };
    const VECTORS = { text: 'text', embedding: 'dense_vector' };

    it('has no journey without data', async () => {
      const { fetch } = setup();

      await expect(fetch()).resolves.toMatchObject({ stage: 'noData', journey: null });
    });

    it('is on the analytics journey with only events', async () => {
      const { fetch } = setup({
        indices: [{ name: 'clicks' }],
        dataStreams: [{ name: 'logs-app-default', backing_indices: ['.ds-logs-app-default-1'] }],
        countsByIndex: { clicks: 5, '.ds-logs-app-default-1': 3 },
        dateFieldsBySource: { clicks: CLICKS, 'logs-app-default': { '@timestamp': 'date' } },
      });

      const { journey, sources } = await fetch();

      expect(sources.map(({ name, dataKind }) => [name, dataKind])).toEqual([
        ['clicks', 'events'],
        ['logs-app-default', 'events'],
      ]);
      expect(journey).toBe('analytics');
    });

    it('is on the search journey with only search data, which still counts as data', async () => {
      const { fetch } = setup({
        indices: [{ name: 'products' }, { name: 'docs' }, { name: 'codes' }],
        countsByIndex: { products: 5, docs: 3, codes: 1 },
        dateFieldsBySource: { products: CATALOG, docs: VECTORS, codes: { code: 'keyword' } },
      });

      const state = await fetch();

      expect(state.sources.map(({ name, dataKind }) => [name, dataKind])).toEqual([
        ['products', 'search'],
        ['docs', 'search'],
        ['codes', 'search'],
      ]);
      expect(state).toMatchObject({
        stage: 'hasData',
        journey: 'search',
        totalSources: 3,
        documentsCount: 9,
      });
    });

    it('is mixed with both kinds', async () => {
      const { fetch } = setup({
        indices: [{ name: 'products' }, { name: 'clicks' }],
        countsByIndex: { products: 5, clicks: 3 },
        dateFieldsBySource: { products: CATALOG, clicks: CLICKS },
      });

      await expect(fetch()).resolves.toMatchObject({ journey: 'mixed' });
    });

    it('classifies a data stream with vectors as search', async () => {
      const { fetch } = setup({
        dataStreams: [{ name: 'chunks', backing_indices: ['.ds-chunks-1'] }],
        countsByIndex: { '.ds-chunks-1': 2 },
        dateFieldsBySource: { chunks: { '@timestamp': 'date', ...VECTORS } },
      });

      await expect(fetch()).resolves.toMatchObject({
        journey: 'search',
        sources: [{ name: 'chunks', kind: 'dataStream', dataKind: 'search' }],
      });
    });

    it('follows sample data when there is nothing else', async () => {
      const { fetch } = setup({
        indices: [
          { name: 'kibana_sample_data_clickstream' },
          { name: 'kibana_sample_data_semantic' },
        ],
        countsByIndex: { kibana_sample_data_clickstream: 500, kibana_sample_data_semantic: 3 },
        dateFieldsBySource: {
          kibana_sample_data_clickstream: CLICKS,
          kibana_sample_data_semantic: VECTORS,
        },
      });

      await expect(fetch()).resolves.toMatchObject({ journey: 'mixed' });
    });

    it('leaves sample data out of the journey next to real data', async () => {
      const { fetch } = setup({
        indices: [{ name: 'kibana_sample_data_clickstream' }, { name: 'products' }],
        countsByIndex: { kibana_sample_data_clickstream: 500, products: 3 },
        dateFieldsBySource: { kibana_sample_data_clickstream: CLICKS, products: CATALOG },
      });

      const { journey, sources } = await fetch();

      expect(sources.map(({ name, dataKind }) => [name, dataKind])).toEqual([
        ['kibana_sample_data_clickstream', 'events'],
        ['products', 'search'],
      ]);
      expect(journey).toBe('search');
    });

    it('counts data streams beyond the returned sources as events, without reading them', async () => {
      const names = ['a', 'b', 'c', 'd', 'e'];
      const { fetch, client } = setup({
        indices: [...names.map((name) => ({ name })), { name: 'small-index' }],
        dataStreams: [{ name: 'small-stream', backing_indices: ['.ds-small-stream-1'] }],
        countsByIndex: {
          ...Object.fromEntries(names.map((name) => [name, 10])),
          'small-index': 1,
          '.ds-small-stream-1': 1,
        },
        dateFieldsBySource: Object.fromEntries(names.map((name) => [name, CATALOG])),
      });

      await expect(fetch()).resolves.toMatchObject({ journey: 'mixed', totalSources: 7 });
      expect(client.asCurrentUser.fieldCaps).toHaveBeenCalledTimes(5);
    });

    it('leaves indices beyond the returned sources out of the journey', async () => {
      const names = ['a', 'b', 'c', 'd', 'e'];
      const { fetch, client } = setup({
        indices: [...names.map((name) => ({ name })), { name: 'small-index' }],
        countsByIndex: { ...Object.fromEntries(names.map((name) => [name, 10])), 'small-index': 1 },
        dateFieldsBySource: {
          ...Object.fromEntries(names.map((name) => [name, CATALOG])),
          'small-index': CLICKS,
        },
      });

      await expect(fetch()).resolves.toMatchObject({ journey: 'search', totalSources: 6 });
      expect(client.asCurrentUser.fieldCaps).toHaveBeenCalledTimes(5);
    });
  });

  it('has data but no dashboards when only sample dashboards exist', async () => {
    const { fetch } = setup({
      indices: [{ name: 'orders' }],
      countsByIndex: { orders: 1 },
      dashboards: [
        { id: 'sample-logs-dashboard', title: 'Sample logs' },
        { id: 'copied', title: 'Sample ecommerce', originId: 'sample-ecommerce-dashboard' },
      ],
    });

    await expect(fetch()).resolves.toMatchObject({
      stage: 'hasData',
      dashboardsCount: 0,
      recentDashboards: [],
    });
  });

  it('counts the user dashboards and returns the three most recently updated', async () => {
    const { fetch, savedObjectsClient } = setup({
      indices: [{ name: 'orders' }],
      countsByIndex: { orders: 1 },
      dashboards: [
        { id: 'sample-logs-dashboard', title: 'Sample logs' },
        { id: 'copied', title: 'Sample ecommerce', originId: 'sample-ecommerce-dashboard' },
        { id: 'one', title: 'One' },
        { id: 'two', title: 'Two', originId: 'imported-from-elsewhere' },
        { id: 'three', title: 'Three' },
        { id: 'four', title: 'Four' },
      ],
    });

    await expect(fetch()).resolves.toMatchObject({
      stage: 'hasDashboards',
      dashboardsCount: 4,
      recentDashboards: [
        { id: 'one', title: 'One' },
        { id: 'two', title: 'Two' },
        { id: 'three', title: 'Three' },
      ],
    });
    expect(savedObjectsClient.find).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'dashboard',
        sortField: 'updated_at',
        sortOrder: 'desc',
        perPage: 5,
      })
    );
  });

  it('excludes nothing when no sample dashboards are registered', async () => {
    const { fetch, savedObjectsClient } = setup({
      sampleDashboardIds: [],
      dashboards: [{ id: 'one', title: 'One' }],
    });

    await expect(fetch()).resolves.toMatchObject({ stage: 'noData', dashboardsCount: 1 });
    expect(savedObjectsClient.bulkGet).not.toHaveBeenCalled();
    expect(savedObjectsClient.find).toHaveBeenCalledTimes(1);
  });

  it('reports dashboards without data as no data', async () => {
    const { fetch } = setup({ dashboards: [{ id: 'one', title: 'One' }] });

    await expect(fetch()).resolves.toMatchObject({ stage: 'noData', dashboardsCount: 1 });
  });

  it('reports no dashboards to a caller who may not read them, keeping the sources', async () => {
    const { fetch, savedObjectsClient, logger } = setup({
      indices: [{ name: 'orders' }],
      countsByIndex: { orders: 1 },
    });
    savedObjectsClient.find.mockRejectedValue(
      SavedObjectsErrorHelpers.decorateForbiddenError(new Error('no dashboard access'))
    );

    await expect(fetch()).resolves.toMatchObject({
      stage: 'hasData',
      totalSources: 1,
      dashboardsCount: 0,
      recentDashboards: [],
    });
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('no dashboard access'));
  });

  it('throws any other dashboards failure', async () => {
    const { fetch, savedObjectsClient } = setup();
    savedObjectsClient.find.mockRejectedValue(new Error('saved objects unavailable'));

    await expect(fetch()).rejects.toThrow('saved objects unavailable');
  });

  it.each([
    ['resolving sources', 'resolveIndex'],
    ['counting documents', 'search'],
  ] as const)('throws the Elasticsearch 403 when %s is refused', async (_, method) => {
    const { fetch, client } = setup();
    const refuse = (): Promise<never> => Promise.reject(createEsError(403));
    if (method === 'search') {
      client.asCurrentUser.search.mockImplementation(refuse);
    } else {
      client.asCurrentUser.indices.resolveIndex.mockImplementation(refuse);
    }

    await expect(fetch()).rejects.toMatchObject({ statusCode: 403 });
  });

  it('throws when the time field lookup fails', async () => {
    const { fetch, client } = setup({
      indices: [{ name: 'orders' }],
      countsByIndex: { orders: 1 },
    });
    client.asCurrentUser.fieldCaps.mockImplementation(() => Promise.reject(createEsError(500)));

    await expect(fetch()).rejects.toMatchObject({ statusCode: 500 });
  });

  it('throws rather than undercounting when shards fail', async () => {
    const { fetch } = setup({
      indices: [{ name: 'orders' }],
      countsByIndex: { orders: 1 },
      failedShards: 1,
    });

    const failure = await fetch().catch((error: Error) => error);

    expect(failure).toBeInstanceOf(IncompleteClusterStateError);
    expect(failure).toMatchObject({ statusCode: 503, message: expect.stringContaining('2 of 3') });
  });
});

describe('deriveStage', () => {
  it.each([
    [0, 0, 'noData'],
    [0, 4, 'noData'],
    [2, 0, 'hasData'],
    [2, 1, 'hasDashboards'],
  ])('with %d sources and %d dashboards is %s', (totalSources, dashboardsCount, stage) => {
    expect(deriveStage({ totalSources, dashboardsCount })).toBe(stage);
  });
});

describe('pickTimeField', () => {
  const dateField = { date: { type: 'date', searchable: true, aggregatable: true } };
  const keywordField = { keyword: { type: 'keyword', searchable: true, aggregatable: true } };

  it('prefers @timestamp over other date fields', () => {
    expect(pickTimeField({ created: dateField, '@timestamp': dateField })).toBe('@timestamp');
  });

  it('ignores an @timestamp that is not a date', () => {
    expect(pickTimeField({ '@timestamp': keywordField, event_time: dateField })).toBe('event_time');
  });

  it('prefers the data stream timestamp field over conventional names', () => {
    expect(pickTimeField({ timestamp: dateField, observed: dateField }, 'observed')).toBe(
      'observed'
    );
  });

  it('ignores a data stream timestamp field that is not a date field', () => {
    expect(pickTimeField({ timestamp: dateField, observed: keywordField }, 'observed')).toBe(
      'timestamp'
    );
  });

  it('picks conventional event-time names in order of preference', () => {
    expect(
      pickTimeField({ order_date: dateField, created_at: dateField, 'event.created': dateField })
    ).toBe('event.created');
    expect(
      pickTimeField({
        customer_birth_date: dateField,
        order_date: dateField,
        'products.created_on': dateField,
      })
    ).toBe('order_date');
  });

  it('falls back to the shallowest date field named like a time', () => {
    expect(
      pickTimeField({
        'payment.settled_time': dateField,
        shipped_date: dateField,
        received_date: dateField,
      })
    ).toBe('received_date');
  });

  it('does not take the date of an entity attribute for the event time', () => {
    expect(
      pickTimeField({
        customer_birth_date: dateField,
        'card.expiry_date': dateField,
        updated: dateField,
        last_modified_time: dateField,
      })
    ).toBeNull();
  });

  it('does not guess from date fields that are not named like a time', () => {
    expect(pickTimeField({ created: dateField, 'products.created_on': dateField })).toBeNull();
  });

  it('accepts nanosecond dates', () => {
    expect(
      pickTimeField({
        '@timestamp': { date_nanos: { type: 'date_nanos', searchable: true, aggregatable: true } },
      })
    ).toBe('@timestamp');
  });

  it('returns null without a date field', () => {
    expect(pickTimeField({ message: keywordField })).toBeNull();
  });
});
