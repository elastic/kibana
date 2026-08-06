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

const mockAggResponse = (docsByEuid: Record<string, Record<string, unknown>>) => ({
  aggregations: {
    by_entity_id: {
      buckets: Object.entries(docsByEuid).map(([key, source]) => ({
        key,
        latest: { hits: { hits: [{ _source: source }] } },
      })),
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

  it('skips the query entirely for an entity type with no creatableFromDocument (generic)', async () => {
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

  it('returns the representative document per EUID from the terms+top_hits aggregation', async () => {
    (esClient.search as jest.Mock).mockResolvedValueOnce(
      mockAggResponse({
        'host:host-1': { host: { id: 'host-1' } },
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
    expect(result.get('host:host-1')).toEqual({ host: { id: 'host-1' } });
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
