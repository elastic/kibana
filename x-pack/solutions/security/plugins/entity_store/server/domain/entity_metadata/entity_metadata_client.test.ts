/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { RelationshipMetadataDoc } from '../../../common/domain/entity_metadata/relationship_metadata';
import { EntityMetadataClient } from './entity_metadata_client';
import { runWithSpan } from '../../telemetry/traces';
import { ensureMetadataDataStreamMappingsOnce } from '../asset_manager/ensure_metadata_mappings';

jest.mock('../../telemetry/traces', () => {
  const actual = jest.requireActual('../../telemetry/traces');
  return {
    ...actual,
    runWithSpan: jest.fn(actual.runWithSpan),
  };
});

jest.mock('../asset_manager/ensure_metadata_mappings', () => ({
  ensureMetadataDataStreamMappingsOnce: jest.fn().mockResolvedValue(undefined),
}));

const makeDoc = (overrides: Partial<RelationshipMetadataDoc> = {}): RelationshipMetadataDoc =>
  ({
    '@timestamp': '2026-05-15T10:30:00.000Z',
    'event.kind': 'event',
    'event.action': 'relationship_observed',
    'entity.id': 'user:alice@corp',
    'entity.source': 'elastic_defend',
    'entity.relationships.accesses_frequently.target': 'host:laptopA',
    'related.user': ['alice'],
    'related.hosts': ['laptopA'],
    Maintainer: {
      kind: 'accesses_frequently_and_infrequently',
      scan_id: 'scan-1',
      lookback_window: 'now-30d',
    },
    ...overrides,
  } as RelationshipMetadataDoc);

describe('EntityMetadataClient', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let logger: MockedLogger;
  let client: EntityMetadataClient;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    logger = loggerMock.create();
    client = new EntityMetadataClient({ esClient, logger, namespace: 'default' });
    (runWithSpan as jest.Mock).mockClear();
    (ensureMetadataDataStreamMappingsOnce as jest.Mock).mockClear();
  });

  // Drains the helper `datasource` (so the mock counts docs) and invokes
  // `onDrop` once per simulated drop before resolving to bulk stats.
  const mockHelpersBulk = (
    drops: Array<{ status: number; error?: { type?: string; reason?: string } }> = []
  ) => {
    const impl = jest.fn().mockImplementation(async (opts: any) => {
      let total = 0;
      for await (const _ of opts.datasource) total++;
      for (const drop of drops) {
        opts.onDrop({ ...drop, document: {}, operation: { create: {} }, retried: false });
      }
      const failed = drops.length;
      return { total, failed, successful: total - failed };
    });
    esClient.helpers.bulk = impl as unknown as typeof esClient.helpers.bulk;
    return impl;
  };

  describe('bulkAppendMetadata', () => {
    it('returns zero counts and skips helpers.bulk when no docs are passed', async () => {
      const result = await client.bulkAppendMetadata([]);
      expect(result).toEqual({ successful: 0, failed: 0, dropsByType: [] });
      expect(esClient.helpers.bulk).not.toHaveBeenCalled();
    });

    it('skips the mapping sync when no docs are passed', async () => {
      await client.bulkAppendMetadata([]);
      expect(ensureMetadataDataStreamMappingsOnce).not.toHaveBeenCalled();
    });

    it('syncs the metadata data stream mappings before writing', async () => {
      const bulk = mockHelpersBulk();
      await client.bulkAppendMetadata([makeDoc()]);

      expect(ensureMetadataDataStreamMappingsOnce).toHaveBeenCalledWith(
        esClient,
        'default',
        logger
      );

      const ensureOrder = (ensureMetadataDataStreamMappingsOnce as jest.Mock).mock
        .invocationCallOrder[0];
      const bulkOrder = bulk.mock.invocationCallOrder[0];
      expect(ensureOrder).toBeLessThan(bulkOrder);
    });

    it('calls helpers.bulk with the namespace-scoped metadata datastream name', async () => {
      mockHelpersBulk();
      await client.bulkAppendMetadata([makeDoc()]);
      const [call] = esClient.helpers.bulk.mock.calls;
      const { index } = call[0] as { index: string };
      expect(index).toBe('.entities.v2.metadata.security_default');
    });

    it('uses the `create` bulk op (datastreams are append-only)', async () => {
      mockHelpersBulk();
      await client.bulkAppendMetadata([makeDoc()]);
      const [call] = esClient.helpers.bulk.mock.calls;
      const { onDocument } = call[0] as { onDocument: (doc: unknown) => unknown };
      expect(onDocument(makeDoc())).toEqual({ create: {} });
    });

    it('passes the docs through as the helper datasource', async () => {
      mockHelpersBulk();
      const doc = makeDoc({ 'entity.id': 'user:bob@corp' });
      await client.bulkAppendMetadata([doc]);
      const [call] = esClient.helpers.bulk.mock.calls;
      const { datasource } = call[0] as { datasource: unknown[] };
      expect(datasource).toEqual([doc]);
    });

    it('returns the successful/failed counts reported by the helper', async () => {
      mockHelpersBulk();
      const result = await client.bulkAppendMetadata([makeDoc(), makeDoc()]);
      expect(result).toEqual({ successful: 2, failed: 0, dropsByType: [] });
    });

    it('reports dropped docs in the failed count and returns the drop reason without logging or throwing', async () => {
      mockHelpersBulk([
        { status: 503, error: { type: 'cluster_block_exception', reason: 'index read-only' } },
      ]);
      const result = await client.bulkAppendMetadata([makeDoc(), makeDoc()]);
      expect(result).toEqual({
        successful: 1,
        failed: 1,
        dropsByType: [
          {
            type: 'cluster_block_exception',
            count: 1,
            status: 503,
            sampleReason: 'index read-only',
          },
        ],
      });
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('collapses multiple drops of the same error type into a single summary entry', async () => {
      mockHelpersBulk([
        { status: 403, error: { type: 'security_exception', reason: 'unauthorized' } },
        { status: 403, error: { type: 'security_exception', reason: 'unauthorized' } },
      ]);
      const result = await client.bulkAppendMetadata([makeDoc(), makeDoc()]);
      expect(result.dropsByType).toEqual([
        { type: 'security_exception', count: 2, status: 403, sampleReason: 'unauthorized' },
      ]);
    });

    it('does NOT throw on partial bulk failures', async () => {
      mockHelpersBulk([{ status: 400, error: { reason: 'bad field' } }]);
      await expect(client.bulkAppendMetadata([makeDoc()])).resolves.toEqual({
        successful: 0,
        failed: 1,
        dropsByType: [{ type: 'unknown', count: 1, status: 400, sampleReason: 'bad field' }],
      });
    });

    it('propagates exceptions from helpers.bulk (does not swallow transport errors)', async () => {
      esClient.helpers.bulk.mockRejectedValueOnce(new Error('transport failure'));
      await expect(client.bulkAppendMetadata([makeDoc()])).rejects.toThrow(/transport failure/);
    });

    it('wraps the call in runWithSpan with the entityStore.metadata.bulk_append name', async () => {
      mockHelpersBulk();
      await client.bulkAppendMetadata([makeDoc()]);
      const calls = (runWithSpan as jest.Mock).mock.calls;
      const spanNames = calls.map((c) => (c[0] as { name?: string }).name);
      expect(spanNames).toContain('entityStore.metadata.bulk_append');
    });

    it('records the doc count on the tracing span attributes', async () => {
      mockHelpersBulk();
      await client.bulkAppendMetadata([makeDoc(), makeDoc(), makeDoc()]);
      const calls = (runWithSpan as jest.Mock).mock.calls;
      const matching = calls.find(
        (c) => (c[0] as { name?: string }).name === 'entityStore.metadata.bulk_append'
      );
      expect(matching).toBeDefined();
      const attrs = (matching![0] as { attributes?: Record<string, unknown> }).attributes ?? {};
      expect(attrs['entity_store.metadata.operation']).toBe('bulk_append');
      expect(attrs['entity_store.objects.count']).toBe(3);
    });
  });

  describe('getLatestByEntityId', () => {
    const mockSearchHits = (sources: RelationshipMetadataDoc[]) => {
      esClient.search.mockResolvedValue({
        hits: { hits: sources.map((s) => ({ _source: s })) },
      } as unknown as Awaited<ReturnType<typeof esClient.search>>);
    };

    it('queries the namespace-scoped metadata datastream, latest-wins by @timestamp, size 1', async () => {
      mockSearchHits([makeDoc()]);
      await client.getLatestByEntityId({
        entityId: 'user:alice@corp',
        eventAction: 'relationship_observed',
      });

      const [params] = esClient.search.mock.calls[0] as [Record<string, unknown>];
      expect(params.index).toBe('.entities.v2.metadata.security_default');
      expect(params.size).toBe(1);
      expect(params.sort).toEqual([{ '@timestamp': { order: 'desc' } }]);
    });

    it('filters by event.action and entity.id', async () => {
      mockSearchHits([makeDoc()]);
      await client.getLatestByEntityId({
        entityId: 'user:alice@corp',
        eventAction: 'relationship_observed',
      });

      const [params] = esClient.search.mock.calls[0] as [{ query: Record<string, any> }];
      expect(params.query.bool.filter).toEqual([
        { term: { 'event.action': 'relationship_observed' } },
        { term: { 'entity.id': 'user:alice@corp' } },
      ]);
    });

    it('returns the first (latest) hit _source', async () => {
      const latest = makeDoc({ '@timestamp': '2026-06-01T00:00:00.000Z' });
      mockSearchHits([latest]);

      const result = await client.getLatestByEntityId({
        entityId: 'user:alice@corp',
        eventAction: 'relationship_observed',
      });
      expect(result).toEqual(latest);
    });

    it('returns null when there are no hits (e.g. datastream absent or no docs)', async () => {
      mockSearchHits([]);
      const result = await client.getLatestByEntityId({
        entityId: 'user:nobody@corp',
        eventAction: 'relationship_observed',
      });
      expect(result).toBeNull();
    });

    it('omits allow_no_indices / ignore_unavailable so an authz denial is not swallowed as an empty 200', async () => {
      mockSearchHits([]);
      await client.getLatestByEntityId({
        entityId: 'user:alice@corp',
        eventAction: 'relationship_observed',
      });
      const [params] = esClient.search.mock.calls[0] as [Record<string, unknown>];
      expect(params.allow_no_indices).toBeUndefined();
      expect(params.ignore_unavailable).toBeUndefined();
    });

    it('tolerates a missing datastream (404) by returning null', async () => {
      esClient.search.mockRejectedValueOnce(
        Object.assign(new Error('index_not_found_exception'), { statusCode: 404 })
      );
      const result = await client.getLatestByEntityId({
        entityId: 'user:alice@corp',
        eventAction: 'relationship_observed',
      });
      expect(result).toBeNull();
    });

    it('wraps the call in runWithSpan with the get_latest_by_entity_id name', async () => {
      mockSearchHits([makeDoc()]);
      await client.getLatestByEntityId({
        entityId: 'user:alice@corp',
        eventAction: 'relationship_observed',
      });
      const spanNames = (runWithSpan as jest.Mock).mock.calls.map(
        (c) => (c[0] as { name?: string }).name
      );
      expect(spanNames).toContain('entityStore.metadata.get_latest_by_entity_id');
    });

    it('propagates transport/authz errors to the caller', async () => {
      esClient.search.mockRejectedValueOnce(new Error('security_exception'));
      await expect(
        client.getLatestByEntityId({
          entityId: 'user:alice@corp',
          eventAction: 'relationship_observed',
        })
      ).rejects.toThrow(/security_exception/);
    });
  });
});
