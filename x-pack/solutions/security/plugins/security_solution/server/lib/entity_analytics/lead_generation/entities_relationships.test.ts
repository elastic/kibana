/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { LeadEntity } from './types';
import {
  buildEntityLookupMap,
  getEntityRelationships,
  countInteractingEntities,
} from './entities_relationships';

const logger = loggingSystemMock.createLogger();
const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
const spaceId = 'default';

interface EntityRecordOverrides {
  type?: string;
  name?: string;
  id?: string;
  relationships?: Record<string, unknown>;
  criticality?: string;
}

const buildEntity = ({
  type = 'user',
  name = 'alice',
  id,
  relationships,
  criticality,
}: EntityRecordOverrides = {}): LeadEntity => {
  const entityId = id ?? `${type}:${name}`;
  return {
    id: entityId,
    type,
    name,
    record: {
      entity: {
        id: entityId,
        type,
        name,
        relationships,
      },
      ...(criticality ? { asset: { criticality } } : {}),
    } as unknown as LeadEntity['record'],
  };
};

const mgetFound = (source: Record<string, unknown>) => ({
  found: true as const,
  _source: source,
});

describe('buildEntityLookupMap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    esClient.mget.mockResolvedValue({ docs: [] } as never);
  });

  it('fetches only the ids referenced under the kind set (owns, accesses_frequently included)', async () => {
    const entity = buildEntity({
      relationships: {
        administers: { ids: ['host:a'] },
        owns: { ids: ['host:b'] },
        accesses_infrequently: { ids: ['host:c'] },
        accesses_frequently: { ids: ['host:d'] },
        communicates_with: { ids: ['host:e'] },
        supervises: { ids: ['user:f'] },
      },
    });

    await buildEntityLookupMap([entity], esClient, spaceId, logger);

    expect(esClient.mget).toHaveBeenCalledTimes(1);
    const call = esClient.mget.mock.calls[0][0] as { ids: string[] };
    expect(call.ids).toHaveLength(5); // a, b, c, d, e; supervises' host:f excluded
  });

  it('resolves candidate entities without querying the index', async () => {
    const entity = buildEntity();

    const map = await buildEntityLookupMap([entity], esClient, spaceId, logger);

    expect(map.get(entity.id)).toBe(entity);
    expect(esClient.mget).not.toHaveBeenCalled();
  });

  it('joins related entities found via mget into the returned map', async () => {
    esClient.mget.mockResolvedValue({
      docs: [
        mgetFound({
          entity: { id: 'host:dc-01', name: 'dc-01', type: 'host' },
          asset: { criticality: 'extreme_impact' },
        }),
      ],
    } as never);
    const entity = buildEntity({
      relationships: { owns: { ids: ['host:dc-01'] } },
    });

    const map = await buildEntityLookupMap([entity], esClient, spaceId, logger);

    expect(map.get('host:dc-01')).toEqual(
      expect.objectContaining({ id: 'host:dc-01', name: 'dc-01' })
    );
  });

  it('skips entities missing from the index without throwing', async () => {
    esClient.mget.mockResolvedValue({ docs: [{ found: false }] } as never);
    const entity = buildEntity({
      relationships: { owns: { ids: ['host:unknown'] } },
    });

    const map = await buildEntityLookupMap([entity], esClient, spaceId, logger);

    expect(map.has('host:unknown')).toBe(false);
    expect(map.size).toBe(1);
  });

  it('degrades to a partial map (candidates only) rather than throwing when mget fails', async () => {
    esClient.mget.mockRejectedValue(new Error('es unavailable'));
    const entity = buildEntity({
      relationships: { owns: { ids: ['host:unreachable'] } },
    });

    const map = await buildEntityLookupMap([entity], esClient, spaceId, logger);

    expect(map.get(entity.id)).toBe(entity);
    expect(map.has('host:unreachable')).toBe(false);
  });
});

describe('getEntityRelationships', () => {
  it('returns undefined when relationships are missing', () => {
    expect(getEntityRelationships(buildEntity())).toBeUndefined();
  });

  it('returns undefined for malformed relationships', () => {
    const malformed = [
      buildEntity({ relationships: { communicates_with: ['host:a', 'host:b'] } }),
      buildEntity({ relationships: { administers: 'host:dc-01' } }),
      buildEntity({ relationships: { accesses_infrequently: { ids: 'host:dc-01' } } }),
      buildEntity({ relationships: { owns: 'host:dc-01' } }),
    ];

    for (const entity of malformed) {
      expect(getEntityRelationships(entity)).toBeUndefined();
    }
  });

  it('keeps administers, owns, accesses_infrequently, accesses_frequently, and communicates_with', () => {
    const entity = buildEntity({
      relationships: {
        administers: { ids: ['host:a'] },
        communicates_with: { ids: ['host:b'] },
        accesses_infrequently: { ids: ['host:c'] },
        depends_on: { ids: ['host:d'] },
        owns: { ids: ['host:e'] },
        owns_inferred: { ids: ['host:f'] },
        accesses_frequently: { ids: ['host:g'] },
        supervises: { ids: ['host:h'] },
      },
    });

    expect(getEntityRelationships(entity)).toEqual({
      administers: { ids: ['host:a'] },
      communicates_with: { ids: ['host:b'] },
      accesses_infrequently: { ids: ['host:c'] },
      owns: { ids: ['host:e'] },
      accesses_frequently: { ids: ['host:g'] },
    });
  });
});

describe('countInteractingEntities', () => {
  const termsAgg = (buckets: Array<{ key: string; doc_count: number }>) => ({ buckets });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns an empty map without querying when there are no targets', async () => {
    const counts = await countInteractingEntities(esClient, spaceId, [], logger);

    expect(counts.size).toBe(0);
    expect(esClient.search).not.toHaveBeenCalled();
  });

  it('bounds each terms aggregation with `include` set to the requested targets', async () => {
    esClient.search.mockResolvedValueOnce({
      aggregations: {
        accesses_frequently: termsAgg([]),
        accesses_infrequently: termsAgg([]),
        communicates_with: termsAgg([]),
      },
    } as never);

    await countInteractingEntities(esClient, spaceId, ['host:a', 'host:b'], logger);

    expect(esClient.search).toHaveBeenCalledTimes(1);
    const call = esClient.search.mock.calls[0][0] as {
      aggs: Record<string, { terms: { include: string[]; size: number } }>;
    };
    expect(call.aggs.accesses_frequently.terms.include).toEqual(['host:a', 'host:b']);
    expect(call.aggs.accesses_frequently.terms.size).toBe(2);
    expect(call.aggs.accesses_infrequently.terms.include).toEqual(['host:a', 'host:b']);
    expect(call.aggs.communicates_with.terms.include).toEqual(['host:a', 'host:b']);
  });

  it('takes the max across kinds rather than summing when a target appears under more than one', async () => {
    esClient.search.mockResolvedValueOnce({
      aggregations: {
        accesses_frequently: termsAgg([{ key: 'host:a', doc_count: 5 }]),
        accesses_infrequently: termsAgg([{ key: 'host:a', doc_count: 2 }]),
        communicates_with: termsAgg([{ key: 'host:a', doc_count: 8 }]),
      },
    } as never);

    const counts = await countInteractingEntities(esClient, spaceId, ['host:a'], logger);

    expect(counts.get('host:a')).toBe(8);
  });

  it('merges counts for distinct targets across kinds', async () => {
    esClient.search.mockResolvedValueOnce({
      aggregations: {
        accesses_frequently: termsAgg([{ key: 'host:a', doc_count: 3 }]),
        accesses_infrequently: termsAgg([{ key: 'host:b', doc_count: 1 }]),
        communicates_with: termsAgg([]),
      },
    } as never);

    const counts = await countInteractingEntities(esClient, spaceId, ['host:a', 'host:b'], logger);

    expect(counts.get('host:a')).toBe(3);
    expect(counts.get('host:b')).toBe(1);
  });

  it('chunks the target list and merges results across chunks', async () => {
    const targets = Array.from({ length: 350 }, (_, i) => `host:${i}`);
    esClient.search
      .mockResolvedValueOnce({
        aggregations: {
          accesses_frequently: termsAgg([{ key: 'host:0', doc_count: 4 }]),
          accesses_infrequently: termsAgg([]),
          communicates_with: termsAgg([]),
        },
      } as never)
      .mockResolvedValueOnce({
        aggregations: {
          accesses_frequently: termsAgg([{ key: 'host:349', doc_count: 6 }]),
          accesses_infrequently: termsAgg([]),
          communicates_with: termsAgg([]),
        },
      } as never);

    const counts = await countInteractingEntities(esClient, spaceId, targets, logger);

    expect(esClient.search).toHaveBeenCalledTimes(2);
    expect(counts.get('host:0')).toBe(4);
    expect(counts.get('host:349')).toBe(6);
  });

  it('fails open: returns an empty map (unresolved targets are kept) when the search fails', async () => {
    esClient.search.mockRejectedValueOnce(new Error('es unavailable'));

    const counts = await countInteractingEntities(esClient, spaceId, ['host:a'], logger);

    expect(counts.size).toBe(0);
  });
});
