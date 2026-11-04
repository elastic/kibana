/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import { EntityType } from '../../../../../../common/entity_analytics/types';
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

describe('fetchAlertIdentityDocs', () => {
  let esClient: ElasticsearchClient;
  let logger: ScopedLogger;

  const baseParams = {
    entityType: EntityType.host,
    alertsIndex: '.alerts-security.alerts-default',
    alertFilters: [],
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
});
