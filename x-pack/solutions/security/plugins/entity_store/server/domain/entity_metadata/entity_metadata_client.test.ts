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

jest.mock('../../telemetry/traces', () => {
  const actual = jest.requireActual('../../telemetry/traces');
  return {
    ...actual,
    runWithSpan: jest.fn(actual.runWithSpan),
  };
});

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
  });

  describe('bulkAppendMetadata', () => {
    it('returns an empty BulkObjectResponse[] and skips esClient.bulk when no docs are passed', async () => {
      const result = await client.bulkAppendMetadata([]);
      expect(result).toEqual([]);
      expect(esClient.bulk).not.toHaveBeenCalled();
    });

    it('calls esClient.bulk with the namespace-scoped metadata datastream name', async () => {
      esClient.bulk.mockResolvedValueOnce({ errors: false, took: 0, items: [] });
      await client.bulkAppendMetadata([makeDoc()]);
      const [call] = esClient.bulk.mock.calls;
      const { index } = call[0] as { index: string };
      expect(index).toBe('.entities.v2.metadata.security_default');
    });

    it('uses the `create` bulk op (datastreams are append-only)', async () => {
      esClient.bulk.mockResolvedValueOnce({ errors: false, took: 0, items: [] });
      await client.bulkAppendMetadata([makeDoc(), makeDoc()]);
      const [call] = esClient.bulk.mock.calls;
      const { operations } = call[0] as { operations: unknown[] };
      const actionLines = operations.filter((_, i) => i % 2 === 0) as Array<
        Record<string, unknown>
      >;
      for (const action of actionLines) {
        expect(Object.keys(action)).toEqual(['create']);
      }
      expect(actionLines).toHaveLength(2);
    });

    it('passes each doc through as the bulk document body', async () => {
      esClient.bulk.mockResolvedValueOnce({ errors: false, took: 0, items: [] });
      const doc = makeDoc({ 'entity.id': 'user:bob@corp' });
      await client.bulkAppendMetadata([doc]);
      const [call] = esClient.bulk.mock.calls;
      const { operations } = call[0] as { operations: unknown[] };
      expect(operations[1]).toEqual(doc);
    });

    it('returns [] when esClient.bulk reports no errors', async () => {
      esClient.bulk.mockResolvedValueOnce({ errors: false, took: 0, items: [] });
      const result = await client.bulkAppendMetadata([makeDoc()]);
      expect(result).toEqual([]);
    });

    it('returns a BulkObjectResponse[] entry for each failing item without throwing', async () => {
      esClient.bulk.mockResolvedValueOnce({
        errors: true,
        took: 0,
        items: [
          {
            create: {
              _index: '.entities.v2.metadata.security_default',
              _id: 'a',
              status: 201,
            },
          },
          {
            create: {
              _index: '.entities.v2.metadata.security_default',
              _id: 'b',
              status: 503,
              error: { type: 'cluster_block_exception', reason: 'index read-only' },
            },
          },
        ],
      } as never);
      const result = await client.bulkAppendMetadata([makeDoc(), makeDoc()]);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        status: 503,
        type: 'cluster_block_exception',
        reason: 'index read-only',
      });
    });

    it('does NOT throw on partial bulk failures — matches bulkUpdateEntity contract', async () => {
      esClient.bulk.mockResolvedValueOnce({
        errors: true,
        took: 0,
        items: [
          {
            create: {
              _index: '.entities.v2.metadata.security_default',
              _id: 'x',
              status: 400,
              error: { type: 'mapper_parsing_exception', reason: 'bad field' },
            },
          },
        ],
      } as never);
      await expect(client.bulkAppendMetadata([makeDoc()])).resolves.toBeDefined();
    });

    it('propagates exceptions from esClient.bulk (does not swallow transport errors)', async () => {
      esClient.bulk.mockRejectedValueOnce(new Error('transport failure'));
      await expect(client.bulkAppendMetadata([makeDoc()])).rejects.toThrow(/transport failure/);
    });

    it('wraps the call in runWithSpan with the entityStore.metadata.bulk_append name', async () => {
      esClient.bulk.mockResolvedValueOnce({ errors: false, took: 0, items: [] });
      await client.bulkAppendMetadata([makeDoc()]);
      const calls = (runWithSpan as jest.Mock).mock.calls;
      const spanNames = calls.map((c) => (c[0] as { name?: string }).name);
      expect(spanNames).toContain('entityStore.metadata.bulk_append');
    });

    it('records the doc count on the tracing span attributes', async () => {
      esClient.bulk.mockResolvedValueOnce({ errors: false, took: 0, items: [] });
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
});
