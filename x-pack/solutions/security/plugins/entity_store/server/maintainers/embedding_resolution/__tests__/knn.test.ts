/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { collectKnnCandidates } from '../knn';

type SearchMock = jest.Mock;

const makeEsClient = () => {
  const search: SearchMock = jest.fn();
  const esClient = { search } as unknown as jest.Mocked<ElasticsearchClient>;
  return { esClient, search };
};

const knnHit = (
  entityId: string,
  score: number,
  opts: {
    resolvedTo?: string;
    name?: string;
    fullName?: string;
    email?: string;
  } = {}
): {
  _id: string;
  _score: number;
  _source: Record<string, unknown>;
} => ({
  _id: `doc-${entityId}`,
  _score: score,
  _source: {
    entity: {
      id: entityId,
      ...(opts.resolvedTo
        ? { relationships: { resolution: { resolved_to: opts.resolvedTo } } }
        : {}),
    },
    user: {
      ...(opts.name !== undefined ? { name: opts.name } : {}),
      ...(opts.fullName !== undefined ? { full_name: opts.fullName } : {}),
      ...(opts.email !== undefined ? { email: opts.email } : {}),
    },
  },
});

const makeQueryVector = (length = 4) => Array.from({ length }, (_, i) => i / length);

describe('collectKnnCandidates', () => {
  it('issues a kNN search filtered to the same entity type and excluding self', async () => {
    const { esClient, search } = makeEsClient();
    search.mockResolvedValueOnce({ hits: { hits: [] } });

    await collectKnnCandidates({
      esClient,
      index: '.entities.v2.latest.security_default',
      entityId: 'er-18-a',
      queryVector: makeQueryVector(),
      entityType: 'user',
      k: 5,
      numCandidates: 100,
      minSimilarity: 0.85,
    });

    expect(search).toHaveBeenCalledTimes(1);
    const body = search.mock.calls[0][0];
    expect(body.index).toBe('.entities.v2.latest.security_default');
    expect(body.knn).toEqual(
      expect.objectContaining({
        field: 'entity.resolution.embedding',
        k: 5,
        num_candidates: 100,
        query_vector: makeQueryVector(),
      })
    );
    // Filter must constrain to the entity type AND exclude the source entity
    // (kNN otherwise returns the source as its own #1 neighbor, score 1.0).
    expect(body.knn.filter).toEqual([
      { term: { 'entity.EngineMetadata.Type': 'user' } },
      { bool: { must_not: { term: { 'entity.id': 'er-18-a' } } } },
    ]);
    // _source must include identity fields for the role-account guard at link
    // time (design §11 E9 defence in depth).
    expect(body._source).toEqual(
      expect.arrayContaining(['entity.id', 'user.name', 'user.full_name', 'user.email'])
    );
  });

  it('returns candidates sorted by score with their resolved_to + identity fields', async () => {
    const { esClient, search } = makeEsClient();
    search.mockResolvedValueOnce({
      hits: {
        hits: [
          knnHit('er-18-b', 0.98, {
            resolvedTo: 'er-target-1',
            name: 'nora',
            fullName: 'Nora Patterson',
            email: 'nora@corp.com',
          }),
          knnHit('er-12-ad', 0.88, { name: 'ada' }),
          knnHit('er-5-a1', 0.81),
        ],
      },
    });

    const result = await collectKnnCandidates({
      esClient,
      index: '.entities.v2.latest.security_default',
      entityId: 'er-18-a',
      queryVector: makeQueryVector(),
      entityType: 'user',
      k: 5,
      numCandidates: 100,
      minSimilarity: 0.0,
    });

    expect(result).toEqual([
      {
        candidateId: 'er-18-b',
        score: 0.98,
        resolvedTo: 'er-target-1',
        identity: {
          name: 'nora',
          full_name: 'Nora Patterson',
          email: 'nora@corp.com',
        },
      },
      {
        candidateId: 'er-12-ad',
        score: 0.88,
        resolvedTo: null,
        identity: { name: 'ada', full_name: undefined, email: undefined },
      },
      {
        candidateId: 'er-5-a1',
        score: 0.81,
        resolvedTo: null,
        identity: { name: undefined, full_name: undefined, email: undefined },
      },
    ]);
  });

  it('drops hits whose score is below minSimilarity', async () => {
    const { esClient, search } = makeEsClient();
    search.mockResolvedValueOnce({
      hits: {
        hits: [knnHit('er-18-b', 0.98), knnHit('er-12-ad', 0.84), knnHit('er-5', 0.72)],
      },
    });

    const result = await collectKnnCandidates({
      esClient,
      index: '.entities.v2.latest.security_default',
      entityId: 'er-18-a',
      queryVector: makeQueryVector(),
      entityType: 'user',
      k: 10,
      numCandidates: 100,
      minSimilarity: 0.85,
    });

    expect(result.map((c) => c.candidateId)).toEqual(['er-18-b']);
  });

  it('treats a missing _score as 0 (filtered when threshold > 0)', async () => {
    const { esClient, search } = makeEsClient();
    search.mockResolvedValueOnce({
      hits: {
        hits: [
          { _id: 'no-score', _source: { entity: { id: 'no-score' } } },
          knnHit('with-score', 0.9),
        ],
      },
    });

    const result = await collectKnnCandidates({
      esClient,
      index: '.entities.v2.latest.security_default',
      entityId: 'er-18-a',
      queryVector: makeQueryVector(),
      entityType: 'user',
      k: 10,
      numCandidates: 100,
      minSimilarity: 0.5,
    });

    expect(result.map((c) => c.candidateId)).toEqual(['with-score']);
  });

  it('skips hits whose _source is missing entity.id', async () => {
    const { esClient, search } = makeEsClient();
    search.mockResolvedValueOnce({
      hits: {
        hits: [
          { _id: 'malformed', _score: 0.99, _source: { not_entity: true } },
          knnHit('healthy', 0.9),
        ],
      },
    });

    const result = await collectKnnCandidates({
      esClient,
      index: '.entities.v2.latest.security_default',
      entityId: 'er-18-a',
      queryVector: makeQueryVector(),
      entityType: 'user',
      k: 10,
      numCandidates: 100,
      minSimilarity: 0,
    });

    expect(result.map((c) => c.candidateId)).toEqual(['healthy']);
  });

  it('returns an empty array when ES returns no hits', async () => {
    const { esClient, search } = makeEsClient();
    search.mockResolvedValueOnce({ hits: { hits: [] } });

    const result = await collectKnnCandidates({
      esClient,
      index: '.entities.v2.latest.security_default',
      entityId: 'er-18-a',
      queryVector: makeQueryVector(),
      entityType: 'user',
      k: 5,
      numCandidates: 100,
      minSimilarity: 0.85,
    });

    expect(result).toEqual([]);
  });

  it('returns nothing without calling ES when the query vector is empty', async () => {
    const { esClient, search } = makeEsClient();

    const result = await collectKnnCandidates({
      esClient,
      index: '.entities.v2.latest.security_default',
      entityId: 'er-18-a',
      queryVector: [],
      entityType: 'user',
      k: 5,
      numCandidates: 100,
      minSimilarity: 0.85,
    });

    expect(result).toEqual([]);
    expect(search).not.toHaveBeenCalled();
  });
});
