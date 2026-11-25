/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import { euid, getBuiltInEntityDefinition } from '@kbn/entity-store/common/euid_helpers';
import { EntityType } from '../../../../../../common/entity_analytics/types';
import { RISK_SCORING_REQUEST_TIMEOUT } from '../../constants';
import type { ScopedLogger } from './with_log_context';
import {
  fetchAlertIdentityDocs,
  ALERT_IDENTITY_DOCS_CHUNK_SIZE,
} from './fetch_alert_identity_docs';

const buildLogger = (): ScopedLogger =>
  ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as ScopedLogger);

interface MockBucketSpec {
  source: Record<string, unknown>;
  firstSeen?: string;
}

const DEFAULT_FIRST_SEEN = '2026-01-01T00:00:00.000Z';

const mockAggResponse = (docsByEuid: Record<string, Record<string, unknown> | MockBucketSpec>) => ({
  aggregations: {
    by_entity_id: {
      buckets: Object.entries(docsByEuid).map(([key, value]) => {
        const spec: MockBucketSpec =
          'source' in value ? (value as MockBucketSpec) : { source: value };
        return {
          key,
          latest: { hits: { hits: [{ _source: spec.source }] } },
          first_seen: { value_as_string: spec.firstSeen ?? DEFAULT_FIRST_SEEN },
        };
      }),
    },
  },
});

const ALERTS_INDEX = '.alerts-security.alerts-default';
const STAMPED_FIELD = 'kibana.alert.entity.id';
const IN_WINDOW_FILTER = { range: { '@timestamp': { gte: 'now-24h' } } };

const LATEST_AND_FIRST_SEEN_AGGS = {
  latest: {
    top_hits: {
      size: 1,
      sort: [{ '@timestamp': { order: 'desc' } }],
      _source: {
        excludes: [
          'kibana.alert.rule.parameters',
          'kibana.alert.ancestors',
          'kibana.alert.original_event',
          'kibana.alert.rule.execution.*',
        ],
      },
    },
  },
  first_seen: { min: { field: '@timestamp' } },
};

describe('fetchAlertIdentityDocs', () => {
  let esClient: ElasticsearchClient;
  let logger: ScopedLogger;

  const baseParams = {
    entityType: EntityType.host,
    alertsIndex: ALERTS_INDEX,
    alertFilters: [],
    stamped: false,
  };

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;
    logger = buildLogger();
  });

  it('returns an empty map without querying when there are no euids', async () => {
    const result = await fetchAlertIdentityDocs({ esClient, logger, ...baseParams, euids: [] });

    expect(result.size).toBe(0);
    expect(esClient.search).not.toHaveBeenCalled();
  });

  it('skips the query entirely for an entity type with no creatableFromSingleDocument (generic)', async () => {
    const result = await fetchAlertIdentityDocs({
      esClient,
      logger,
      ...baseParams,
      entityType: EntityType.generic,
      euids: ['anything'],
    });

    expect(result.size).toBe(0);
    expect(esClient.search).not.toHaveBeenCalled();
  });

  it('excludes event.outcome: failure from the selection via must_not', async () => {
    (esClient.search as jest.Mock).mockResolvedValueOnce(
      mockAggResponse({ 'host:host-1': { host: { id: 'host-1' } } })
    );

    await fetchAlertIdentityDocs({ esClient, logger, ...baseParams, euids: ['host:host-1'] });

    const query = (esClient.search as jest.Mock).mock.calls[0][0].query;
    expect(query.bool.must_not).toEqual([{ term: { 'event.outcome': 'failure' } }]);
  });

  it('excludes known bulk alert paths from the top_hits _source', async () => {
    (esClient.search as jest.Mock).mockResolvedValueOnce(
      mockAggResponse({ 'host:host-1': { host: { id: 'host-1' } } })
    );

    await fetchAlertIdentityDocs({ esClient, logger, ...baseParams, euids: ['host:host-1'] });

    const topHits = (esClient.search as jest.Mock).mock.calls[0][0].aggs.by_entity_id.aggs.latest
      .top_hits;
    expect(topHits._source.excludes).toEqual(
      expect.arrayContaining([
        'kibana.alert.rule.parameters',
        'kibana.alert.ancestors',
        'kibana.alert.original_event',
        'kibana.alert.rule.execution.*',
      ])
    );
  });

  it('requests a first_seen min aggregation alongside the top_hits', async () => {
    (esClient.search as jest.Mock).mockResolvedValueOnce(
      mockAggResponse({ 'host:host-1': { host: { id: 'host-1' } } })
    );

    await fetchAlertIdentityDocs({ esClient, logger, ...baseParams, euids: ['host:host-1'] });

    const aggs = (esClient.search as jest.Mock).mock.calls[0][0].aggs.by_entity_id.aggs;
    expect(aggs.first_seen).toEqual({ min: { field: '@timestamp' } });
  });

  it('returns the representative document and firstSeen per EUID from the aggregation', async () => {
    (esClient.search as jest.Mock).mockResolvedValueOnce(
      mockAggResponse({
        'host:host-1': {
          source: { host: { id: 'host-1' } },
          firstSeen: '2025-06-01T00:00:00.000Z',
        },
        'host:host-2': { host: { id: 'host-2' } },
      })
    );

    const result = await fetchAlertIdentityDocs({
      esClient,
      logger,
      ...baseParams,
      euids: ['host:host-1', 'host:host-2'],
    });

    expect(result.size).toBe(2);
    expect(result.get('host:host-1')).toEqual({
      source: { host: { id: 'host-1' } },
      firstSeen: '2025-06-01T00:00:00.000Z',
    });
    expect(result.get('host:host-2')).toEqual({
      source: { host: { id: 'host-2' } },
      firstSeen: DEFAULT_FIRST_SEEN,
    });
  });

  it('chunks euids into sequential requests bounded by ALERT_IDENTITY_DOCS_CHUNK_SIZE', async () => {
    const euids = Array.from(
      { length: ALERT_IDENTITY_DOCS_CHUNK_SIZE + 1 },
      (_, i) => `host:host-${i}`
    );
    (esClient.search as jest.Mock)
      .mockResolvedValueOnce(mockAggResponse({}))
      .mockResolvedValueOnce(mockAggResponse({}));

    await fetchAlertIdentityDocs({ esClient, logger, ...baseParams, euids });

    expect(esClient.search).toHaveBeenCalledTimes(2);
    const firstChunkFilter = (esClient.search as jest.Mock).mock.calls[0][0].query.bool.filter;
    const secondChunkFilter = (esClient.search as jest.Mock).mock.calls[1][0].query.bool.filter;
    expect(firstChunkFilter[firstChunkFilter.length - 1].terms.entity_id).toHaveLength(
      ALERT_IDENTITY_DOCS_CHUNK_SIZE
    );
    expect(secondChunkFilter[secondChunkFilter.length - 1].terms.entity_id).toHaveLength(1);
  });

  it('sends every chunk request with the scoring request timeout and the abort signal', async () => {
    const euids = Array.from(
      { length: ALERT_IDENTITY_DOCS_CHUNK_SIZE + 1 },
      (_, i) => `host:host-${i}`
    );
    const controller = new AbortController();
    const expectedOptions = {
      signal: controller.signal,
      requestTimeout: RISK_SCORING_REQUEST_TIMEOUT,
    };

    await fetchAlertIdentityDocs({
      esClient,
      logger,
      ...baseParams,
      euids,
      abortSignal: controller.signal,
    });

    expect(esClient.search).toHaveBeenCalledTimes(2);
    expect(esClient.search).toHaveBeenNthCalledWith(1, expect.anything(), expectedOptions);
    expect(esClient.search).toHaveBeenNthCalledWith(2, expect.anything(), expectedOptions);
  });

  it('stops issuing further chunk requests once the abort signal fires between chunks', async () => {
    const euids = Array.from(
      { length: ALERT_IDENTITY_DOCS_CHUNK_SIZE + 1 },
      (_, i) => `host:host-${i}`
    );
    const controller = new AbortController();
    (esClient.search as jest.Mock).mockImplementationOnce(async () => {
      controller.abort();
      return mockAggResponse({});
    });

    const result = await fetchAlertIdentityDocs({
      esClient,
      logger,
      ...baseParams,
      euids,
      abortSignal: controller.signal,
    });

    expect(esClient.search).toHaveBeenCalledTimes(1);
    expect(result.size).toBe(0);
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('aborted between chunks'));
  });

  it('does not throw when a chunk request fails, and logs a warning instead', async () => {
    (esClient.search as jest.Mock).mockRejectedValueOnce(new Error('es unavailable'));

    const result = await fetchAlertIdentityDocs({
      esClient,
      logger,
      ...baseParams,
      euids: ['host:host-1'],
    });

    expect(result.size).toBe(0);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('es unavailable'));
  });

  describe('when base scoring did not use stamped EUIDs', () => {
    it('sends the runtime-field request unchanged', async () => {
      const search = jest.fn().mockResolvedValue(mockAggResponse({}));
      esClient.search = search;

      await fetchAlertIdentityDocs({
        esClient,
        logger,
        ...baseParams,
        alertFilters: [IN_WINDOW_FILTER],
        euids: ['host:host-1', 'host:host-2'],
      });

      expect(search).toHaveBeenCalledTimes(1);
      expect(search).toHaveBeenCalledWith(
        {
          index: ALERTS_INDEX,
          size: 0,
          runtime_mappings: {
            entity_id: euid.painless.getEuidRuntimeMapping(
              getBuiltInEntityDefinition(EntityType.host)
            ),
          },
          query: {
            bool: {
              filter: [IN_WINDOW_FILTER, { terms: { entity_id: ['host:host-1', 'host:host-2'] } }],
              must_not: [{ term: { 'event.outcome': 'failure' } }],
            },
          },
          aggs: {
            by_entity_id: {
              terms: { field: 'entity_id', size: 2 },
              aggs: LATEST_AND_FIRST_SEEN_AGGS,
            },
          },
        },
        expect.objectContaining({ requestTimeout: RISK_SCORING_REQUEST_TIMEOUT })
      );
    });
  });

  describe('when base scoring used stamped EUIDs', () => {
    const stampedParams = { ...baseParams, stamped: true };
    let search: jest.Mock;

    beforeEach(() => {
      search = jest.fn().mockResolvedValue(mockAggResponse({}));
      esClient.search = search;
    });

    it('filters and buckets on the stored entity ID, without a runtime mapping', async () => {
      await fetchAlertIdentityDocs({
        esClient,
        logger,
        ...stampedParams,
        alertFilters: [IN_WINDOW_FILTER],
        euids: ['host:host-1', 'host:host-2'],
      });

      expect(search).toHaveBeenCalledTimes(1);
      expect(search).toHaveBeenCalledWith(
        {
          index: ALERTS_INDEX,
          size: 0,
          query: {
            bool: {
              filter: [
                IN_WINDOW_FILTER,
                { terms: { [STAMPED_FIELD]: ['host:host-1', 'host:host-2'] } },
              ],
              must_not: [{ term: { 'event.outcome': 'failure' } }],
            },
          },
          aggs: {
            by_entity_id: {
              terms: {
                field: STAMPED_FIELD,
                size: 2,
                include: ['host:host-1', 'host:host-2'],
              },
              aggs: LATEST_AND_FIRST_SEEN_AGGS,
            },
          },
        },
        expect.objectContaining({ requestTimeout: RISK_SCORING_REQUEST_TIMEOUT })
      );
      expect(search.mock.calls[0][0]).not.toHaveProperty('runtime_mappings');
    });

    it('limits each chunk to its own EUIDs in the filter and in the bucket include', async () => {
      const euids = Array.from(
        { length: ALERT_IDENTITY_DOCS_CHUNK_SIZE + 1 },
        (_, i) => `host:host-${i}`
      );

      await fetchAlertIdentityDocs({ esClient, logger, ...stampedParams, euids });

      expect(search).toHaveBeenCalledTimes(2);
      const [firstRequest, secondRequest] = search.mock.calls.map(([request]) => request);
      expect(firstRequest.query.bool.filter).toEqual([
        { terms: { [STAMPED_FIELD]: euids.slice(0, ALERT_IDENTITY_DOCS_CHUNK_SIZE) } },
      ]);
      expect(firstRequest.aggs.by_entity_id.terms.include).toEqual(
        euids.slice(0, ALERT_IDENTITY_DOCS_CHUNK_SIZE)
      );
      expect(secondRequest.query.bool.filter).toEqual([
        { terms: { [STAMPED_FIELD]: [euids[ALERT_IDENTITY_DOCS_CHUNK_SIZE]] } },
      ]);
      expect(secondRequest.aggs.by_entity_id.terms.include).toEqual([
        euids[ALERT_IDENTITY_DOCS_CHUNK_SIZE],
      ]);
      expect(secondRequest.aggs.by_entity_id.terms.size).toBe(1);
    });

    it('includes exact EUIDs, so regex characters in them cannot widen the buckets', async () => {
      const dottedEuid = 'user:alice.smith@okta';

      await fetchAlertIdentityDocs({ esClient, logger, ...stampedParams, euids: [dottedEuid] });

      const { include } = search.mock.calls[0][0].aggs.by_entity_id.terms;
      expect(include).toEqual([dottedEuid]);
    });

    it('opens buckets only for the requested EUIDs when an alert stamps other entities too', async () => {
      // Alerts for host:host-1 also carry the EUID of the user on the host. The stamp is
      // multi-valued, so a terms aggregation over it would bucket that user as well unless the
      // buckets are limited to the requested values.
      const hostAndUserAlert = {
        host: { id: 'host-1' },
        user: { name: 'alice' },
        [STAMPED_FIELD]: ['host:host-1', 'user:alice@host-1@local'],
      };
      search.mockResolvedValueOnce(mockAggResponse({ 'host:host-1': hostAndUserAlert }));

      const result = await fetchAlertIdentityDocs({
        esClient,
        logger,
        ...stampedParams,
        euids: ['host:host-1'],
      });

      const { terms } = search.mock.calls[0][0].aggs.by_entity_id;
      expect(terms.include).toEqual(['host:host-1']);
      expect(terms.include).not.toContain('user:alice@host-1@local');
      expect([...result.keys()]).toEqual(['host:host-1']);
      expect(result.get('host:host-1')?.source).toEqual(hostAndUserAlert);
    });

    it('returns the representative document and firstSeen per EUID from the aggregation', async () => {
      search.mockResolvedValueOnce(
        mockAggResponse({
          'host:host-1': {
            source: { host: { id: 'host-1' } },
            firstSeen: '2025-06-01T00:00:00.000Z',
          },
          'host:host-2': { host: { id: 'host-2' } },
        })
      );

      const result = await fetchAlertIdentityDocs({
        esClient,
        logger,
        ...stampedParams,
        euids: ['host:host-1', 'host:host-2'],
      });

      expect(result.get('host:host-1')).toEqual({
        source: { host: { id: 'host-1' } },
        firstSeen: '2025-06-01T00:00:00.000Z',
      });
      expect(result.get('host:host-2')).toEqual({
        source: { host: { id: 'host-2' } },
        firstSeen: DEFAULT_FIRST_SEEN,
      });
    });

    it('sends every chunk request with the scoring request timeout and the abort signal', async () => {
      const euids = Array.from(
        { length: ALERT_IDENTITY_DOCS_CHUNK_SIZE + 1 },
        (_, i) => `host:host-${i}`
      );
      const controller = new AbortController();

      await fetchAlertIdentityDocs({
        esClient,
        logger,
        ...stampedParams,
        euids,
        abortSignal: controller.signal,
      });

      const expectedOptions = {
        signal: controller.signal,
        requestTimeout: RISK_SCORING_REQUEST_TIMEOUT,
      };
      expect(search).toHaveBeenCalledTimes(2);
      expect(search).toHaveBeenNthCalledWith(1, expect.anything(), expectedOptions);
      expect(search).toHaveBeenNthCalledWith(2, expect.anything(), expectedOptions);
    });

    it('does not throw when a chunk request fails, and logs a warning instead', async () => {
      search.mockRejectedValueOnce(new Error('es unavailable'));

      const result = await fetchAlertIdentityDocs({
        esClient,
        logger,
        ...stampedParams,
        euids: ['host:host-1'],
      });

      expect(result.size).toBe(0);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('es unavailable'));
    });

    it('still skips entity types that cannot be created from a single document', async () => {
      const result = await fetchAlertIdentityDocs({
        esClient,
        logger,
        ...stampedParams,
        entityType: EntityType.generic,
        euids: ['anything'],
      });

      expect(result.size).toBe(0);
      expect(search).not.toHaveBeenCalled();
    });
  });
});
