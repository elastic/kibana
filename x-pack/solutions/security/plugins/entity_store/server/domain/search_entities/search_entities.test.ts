/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { searchEntitiesV2 } from './search_entities';

describe('searchEntitiesV2', () => {
  it('throws when filterQuery is not valid JSON', async () => {
    const esClient = {
      search: jest.fn(),
    } as unknown as ElasticsearchClient;

    await expect(
      searchEntitiesV2({
        esClient,
        namespace: 'default',
        entityTypes: ['host'],
        filterQuery: 'not-json',
        page: 1,
        perPage: 10,
        sortField: '@timestamp',
        sortOrder: 'desc',
      })
    ).rejects.toThrow('Invalid filterQuery');
  });

  it('searches the v2 latest index with entity type and filter clauses', async () => {
    const search = jest.fn().mockResolvedValue({
      hits: {
        total: 1,
        hits: [
          {
            _source: {
              host: { name: 'h1' },
              entity: { EngineMetadata: { Type: 'host' }, lifecycle: { first_seen: 't0' } },
            },
          },
        ],
      },
    });
    const esClient = { search } as unknown as ElasticsearchClient;

    const result = await searchEntitiesV2({
      esClient,
      namespace: 'default',
      entityTypes: ['host'],
      filterQuery: JSON.stringify({ term: { 'host.name': 'h1' } }),
      page: 1,
      perPage: 5,
      sortField: '@timestamp',
      sortOrder: 'desc',
    });

    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: ['entities-latest-default'],
        query: {
          bool: {
            must: [
              { terms: { 'entity.EngineMetadata.Type': ['host'] } },
              { term: { 'host.name': 'h1' } },
            ],
          },
        },
        size: 5,
        from: 0,
        ignore_unavailable: true,
      })
    );
    expect(result.total).toBe(1);
    expect(result.records).toHaveLength(1);
    expect(result.inspect.dsl).toHaveLength(1);
  });
});
