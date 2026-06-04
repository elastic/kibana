/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { RelationshipMetadataDoc } from '../../../common/domain/entity_metadata/relationship_metadata';
import { RELATIONSHIP_KINDS } from '../../../common/domain/entity_metadata/relationship_metadata';
import { ENTITY_METADATA, getEntitiesAlias } from '../../../common/domain/entity_index';
import { RelationshipsClient } from './relationships_client';
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

describe('RelationshipsClient', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let logger: MockedLogger;
  let client: RelationshipsClient;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    logger = loggerMock.create();
    client = new RelationshipsClient({ esClient, logger, namespace: 'default' });
    (runWithSpan as jest.Mock).mockClear();
  });

  describe('listRelationshipMetadata', () => {
    const EMPTY_HITS = {
      hits: { hits: [], total: { value: 0, relation: 'eq' as const } },
      took: 1,
      timed_out: false,
      _shard: { total: 1, successful: 1, skipped: 0, failed: 0 },
    };

    const mockEmptySearch = () => {
      esClient.search.mockResolvedValueOnce(EMPTY_HITS as never);
    };

    const getSearchBody = () => {
      const [call] = esClient.search.mock.calls;
      return call[0] as {
        index: string;
        query: { bool?: { filter?: unknown[]; should?: unknown[]; minimum_should_match?: number } };
        from?: number;
        size?: number;
        sort?: unknown;
      };
    };

    it('reads through the metadata alias getEntitiesAlias(ENTITY_METADATA, namespace) — not a hardcoded index', async () => {
      mockEmptySearch();
      await client.listRelationshipMetadata({ entityId: 'user:alice@corp' });
      const body = getSearchBody();
      expect(body.index).toBe(getEntitiesAlias(ENTITY_METADATA, 'default'));
    });

    it('uses the namespace passed to the client when resolving the alias', async () => {
      const otherClient = new RelationshipsClient({ esClient, logger, namespace: 'tenant-x' });
      mockEmptySearch();
      await otherClient.listRelationshipMetadata({ entityId: 'user:alice@corp' });
      const body = getSearchBody();
      expect(body.index).toBe(getEntitiesAlias(ENTITY_METADATA, 'tenant-x'));
    });

    it('applies an implicit event.action: "relationship_observed" filter on every query', async () => {
      mockEmptySearch();
      await client.listRelationshipMetadata({ entityId: 'user:alice@corp' });
      const filters = (getSearchBody().query.bool?.filter ?? []) as Array<Record<string, unknown>>;
      const hasActionFilter = filters.some(
        (f) =>
          'term' in f &&
          ((f.term as Record<string, unknown>)?.['event.action'] === 'relationship_observed' ||
            (f.term as Record<string, { value?: string }>)?.['event.action']?.value ===
              'relationship_observed')
      );
      expect(hasActionFilter).toBe(true);
    });

    it('applies entity.id term filter from the entityId param', async () => {
      mockEmptySearch();
      await client.listRelationshipMetadata({ entityId: 'user:alice@corp' });
      const filters = (getSearchBody().query.bool?.filter ?? []) as Array<Record<string, unknown>>;
      const hasEntityIdFilter = filters.some(
        (f) =>
          'term' in f &&
          ((f.term as Record<string, unknown>)?.['entity.id'] === 'user:alice@corp' ||
            (f.term as Record<string, { value?: string }>)?.['entity.id']?.value ===
              'user:alice@corp')
      );
      expect(hasEntityIdFilter).toBe(true);
    });

    it('kind=K alone → exists query on entity.relationships.K', async () => {
      mockEmptySearch();
      await client.listRelationshipMetadata({
        entityId: 'user:alice@corp',
        kind: 'communicates_with',
      });
      const filters = (getSearchBody().query.bool?.filter ?? []) as Array<Record<string, unknown>>;
      const hasExists = filters.some(
        (f) =>
          'exists' in f &&
          (f.exists as { field?: string })?.field === 'entity.relationships.communicates_with'
      );
      expect(hasExists).toBe(true);
    });

    it('kind=K + target=T → term on entity.relationships.K.target (no exists)', async () => {
      mockEmptySearch();
      await client.listRelationshipMetadata({
        entityId: 'user:alice@corp',
        kind: 'accesses_frequently',
        target: 'host:laptopA',
      });
      const filters = (getSearchBody().query.bool?.filter ?? []) as Array<Record<string, unknown>>;
      const hasTerm = filters.some((f) => {
        if (!('term' in f)) return false;
        const term = f.term as Record<string, unknown>;
        const v = term['entity.relationships.accesses_frequently.target'];
        return v === 'host:laptopA' || (v as { value?: string })?.value === 'host:laptopA';
      });
      expect(hasTerm).toBe(true);

      const hasExists = filters.some((f) => 'exists' in f);
      expect(hasExists).toBe(false);
    });

    it('target=T without kind → bool.should over every RELATIONSHIP_KINDS target, minimum_should_match=1', async () => {
      mockEmptySearch();
      await client.listRelationshipMetadata({
        entityId: 'user:alice@corp',
        target: 'host:laptopA',
      });
      const body = getSearchBody();
      const filters = (body.query.bool?.filter ?? []) as Array<Record<string, unknown>>;

      const targetBool = filters
        .map((f) => (f as { bool?: Record<string, unknown> }).bool)
        .find(
          (b) =>
            b &&
            Array.isArray((b as { should?: unknown[] }).should) &&
            (b as { minimum_should_match?: number }).minimum_should_match === 1
        ) as { should: Array<Record<string, unknown>>; minimum_should_match: number } | undefined;
      expect(targetBool).toBeDefined();
      expect(targetBool!.should).toHaveLength(RELATIONSHIP_KINDS.length);

      for (const kind of RELATIONSHIP_KINDS) {
        const hasTerm = targetBool!.should.some((s) => {
          if (!('term' in s)) return false;
          const term = s.term as Record<string, unknown>;
          const v = term[`entity.relationships.${kind}.target`];
          return v === 'host:laptopA' || (v as { value?: string })?.value === 'host:laptopA';
        });
        expect(hasTerm).toBe(true);
      }
    });

    it('from / to → @timestamp range filter on the query', async () => {
      mockEmptySearch();
      await client.listRelationshipMetadata({
        entityId: 'user:alice@corp',
        from: '2026-04-27T00:00:00.000Z',
        to: '2026-05-27T00:00:00.000Z',
      });
      const filters = (getSearchBody().query.bool?.filter ?? []) as Array<Record<string, unknown>>;
      const rangeClause = filters
        .map((f) => (f as { range?: Record<string, unknown> }).range)
        .find((r) => r && r['@timestamp']) as
        | { '@timestamp': { gte?: string; lte?: string } }
        | undefined;
      expect(rangeClause).toBeDefined();
      expect(rangeClause!['@timestamp'].gte).toBe('2026-04-27T00:00:00.000Z');
      expect(rangeClause!['@timestamp'].lte).toBe('2026-05-27T00:00:00.000Z');
    });

    it('applies defaults page=1, per_page=10 when omitted (from=0, size=10)', async () => {
      mockEmptySearch();
      await client.listRelationshipMetadata({ entityId: 'user:alice@corp' });
      const body = getSearchBody();
      expect(body.from).toBe(0);
      expect(body.size).toBe(10);
    });

    it('pagination math: from = (page-1)*per_page, size = per_page', async () => {
      mockEmptySearch();
      await client.listRelationshipMetadata({
        entityId: 'user:alice@corp',
        page: 3,
        per_page: 25,
      });
      const body = getSearchBody();
      expect(body.from).toBe(50);
      expect(body.size).toBe(25);
    });

    it('default sort is [{ @timestamp: desc }, { _shard_doc: desc }]', async () => {
      mockEmptySearch();
      await client.listRelationshipMetadata({ entityId: 'user:alice@corp' });
      const { sort } = getSearchBody();
      expect(sort).toEqual([{ '@timestamp': 'desc' }, { _shard_doc: 'desc' }]);
    });

    it('honors sort_field=event.ingested and sort_order=asc, retaining the _shard_doc tie-breaker', async () => {
      mockEmptySearch();
      await client.listRelationshipMetadata({
        entityId: 'user:alice@corp',
        sort_field: 'event.ingested',
        sort_order: 'asc',
      });
      const { sort } = getSearchBody();
      expect(sort).toEqual([{ 'event.ingested': 'asc' }, { _shard_doc: 'desc' }]);
    });

    it('rejects sort_field values outside the allowlist (@timestamp, event.ingested) without calling esClient', async () => {
      await expect(
        client.listRelationshipMetadata({
          entityId: 'user:alice@corp',
          sort_field: 'entity.id',
        })
      ).rejects.toThrow();
      expect(esClient.search).not.toHaveBeenCalled();
    });

    it('returns an empty records array when the search has no hits', async () => {
      mockEmptySearch();
      const result = await client.listRelationshipMetadata({ entityId: 'user:alice@corp' });
      expect(result.records).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.page).toBe(1);
      expect(result.per_page).toBe(10);
    });

    it('maps hits to RelationshipMetadataDoc[] preserving the stored doc shape', async () => {
      const doc1 = makeDoc({ '@timestamp': '2026-05-01T10:00:00.000Z' });
      const doc2 = makeDoc({ '@timestamp': '2026-05-02T10:00:00.000Z' });
      esClient.search.mockResolvedValueOnce({
        hits: {
          hits: [
            { _source: doc1, _index: 'x', _id: '1' },
            { _source: doc2, _index: 'x', _id: '2' },
          ],
          total: { value: 2, relation: 'eq' as const },
        },
      } as never);
      const result = await client.listRelationshipMetadata({ entityId: 'user:alice@corp' });
      expect(result.records).toEqual([doc1, doc2]);
      expect(result.total).toBe(2);
    });

    it('wraps the call in runWithSpan with the entityStore.relationships.list_metadata name', async () => {
      mockEmptySearch();
      await client.listRelationshipMetadata({ entityId: 'user:alice@corp' });
      const calls = (runWithSpan as jest.Mock).mock.calls;
      const spanNames = calls.map((c) => (c[0] as { name?: string }).name);
      expect(spanNames).toContain('entityStore.relationships.list_metadata');
    });

    it('records the operation name on the tracing span attributes', async () => {
      mockEmptySearch();
      await client.listRelationshipMetadata({ entityId: 'user:alice@corp' });
      const calls = (runWithSpan as jest.Mock).mock.calls;
      const matching = calls.find(
        (c) => (c[0] as { name?: string }).name === 'entityStore.relationships.list_metadata'
      );
      expect(matching).toBeDefined();
      const attrs = (matching![0] as { attributes?: Record<string, unknown> }).attributes ?? {};
      expect(attrs['entity_store.relationships.operation']).toBe('list_metadata');
    });
  });
});
