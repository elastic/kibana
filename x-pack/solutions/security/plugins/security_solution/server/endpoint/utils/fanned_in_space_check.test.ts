/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { ElasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { areFannedInAgentsVisibleInSpace } from './fanned_in_space_check';
import { METADATA_UNITED_INDEX } from '../../../common/endpoint/constants';

const makeHit = (agentId: string) => ({
  _index: METADATA_UNITED_INDEX,
  _id: agentId,
  _score: 1.0,
  fields: { 'united.endpoint.agent.id': [agentId] },
});

const makeSearchResponse = (agentIds: string[]) => ({
  took: 1,
  timed_out: false,
  _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
  hits: {
    total: { value: agentIds.length, relation: 'eq' as const },
    max_score: 1.0,
    hits: agentIds.map(makeHit),
  },
});

describe('areFannedInAgentsVisibleInSpace', () => {
  let esClient: ElasticsearchClientMock;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
  });

  it('should return false for an empty id list without searching', async () => {
    const result = await areFannedInAgentsVisibleInSpace({
      esClient,
      agentIds: [],
      spaceId: 'default',
    });

    expect(result).toBe(false);
    expect(esClient.search).not.toHaveBeenCalled();
  });

  it('should search the united index with the correct query', async () => {
    esClient.search.mockResolvedValue(
      makeSearchResponse(['agent-1']) as unknown as Awaited<ReturnType<typeof esClient.search>>
    );

    await areFannedInAgentsVisibleInSpace({
      esClient,
      agentIds: ['agent-1'],
      spaceId: 'my-space',
    });

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: METADATA_UNITED_INDEX,
        size: 1,
        _source: false,
        fields: [{ field: 'united.endpoint.agent.id' }],
        query: {
          bool: {
            filter: [
              { terms: { 'united.endpoint.agent.id': ['agent-1'] } },
              { term: { 'united.agent.namespaces': 'my-space' } },
            ],
          },
        },
      })
    );
  });

  it('should return true when every requested id comes back', async () => {
    esClient.search.mockResolvedValue(
      makeSearchResponse(['agent-1', 'agent-2']) as unknown as Awaited<
        ReturnType<typeof esClient.search>
      >
    );

    const result = await areFannedInAgentsVisibleInSpace({
      esClient,
      agentIds: ['agent-1', 'agent-2'],
      spaceId: 'default',
    });

    expect(result).toBe(true);
  });

  it('should return false when one of two ids is missing from the response', async () => {
    esClient.search.mockResolvedValue(
      makeSearchResponse(['agent-1']) as unknown as Awaited<ReturnType<typeof esClient.search>>
    );

    const result = await areFannedInAgentsVisibleInSpace({
      esClient,
      agentIds: ['agent-1', 'agent-2'],
      spaceId: 'default',
    });

    expect(result).toBe(false);
  });

  it('should return false when the search returns no hits', async () => {
    esClient.search.mockResolvedValue(
      makeSearchResponse([]) as unknown as Awaited<ReturnType<typeof esClient.search>>
    );

    const result = await areFannedInAgentsVisibleInSpace({
      esClient,
      agentIds: ['agent-1'],
      spaceId: 'default',
    });

    expect(result).toBe(false);
  });

  it('should propagate search errors rather than catching them', async () => {
    const searchError = new Error('ES search failed');
    esClient.search.mockRejectedValue(searchError);

    await expect(
      areFannedInAgentsVisibleInSpace({
        esClient,
        agentIds: ['agent-1'],
        spaceId: 'default',
      })
    ).rejects.toThrow(searchError);
  });
});
