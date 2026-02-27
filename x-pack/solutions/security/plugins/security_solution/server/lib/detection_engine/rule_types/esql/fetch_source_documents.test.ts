/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { estypes } from '@elastic/elasticsearch';
import type { Filter } from '@kbn/es-query';

import { fetchSourceDocuments } from './fetch_source_documents';

const mockEsClient = elasticsearchServiceMock.createElasticsearchClient();

interface SearchBoolQuery {
  filter: estypes.QueryDslQueryContainer[];
  must_not?: estypes.QueryDslQueryContainer[];
}

const getSearchBoolQuery = (): SearchBoolQuery => {
  const searchArgs = mockEsClient.search.mock.calls[0][0] as {
    query: { bool: SearchBoolQuery };
  };
  return searchArgs.query.bool;
};

const defaultArgs = {
  isRuleAggregating: false,
  esClient: mockEsClient,
  index: ['test-index'],
  results: [{ _id: 'doc-1' }, { _id: 'doc-2' }],
  hasLoggedRequestsReachedLimit: false,
  runtimeMappings: undefined,
  excludedDocuments: {},
};

describe('fetchSourceDocuments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEsClient.search.mockResolvedValue({ hits: { hits: [] } } as never);
  });

  it('should return empty object for aggregating rules', async () => {
    const result = await fetchSourceDocuments({ ...defaultArgs, isRuleAggregating: true });
    expect(result).toEqual({});
    expect(mockEsClient.search).not.toHaveBeenCalled();
  });

  it('should return empty object when results have no _id', async () => {
    const result = await fetchSourceDocuments({
      ...defaultArgs,
      results: [{ field: 'value' }],
    });
    expect(result).toEqual({});
    expect(mockEsClient.search).not.toHaveBeenCalled();
  });

  it('should query by ids without additional filters when filters is undefined', async () => {
    await fetchSourceDocuments(defaultArgs);

    expect(mockEsClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: {
          bool: {
            filter: [{ ids: { values: ['doc-1', 'doc-2'] } }],
          },
        },
      })
    );
  });

  it('should query by ids without additional filters when filters is empty', async () => {
    await fetchSourceDocuments({ ...defaultArgs, filters: [] });

    expect(mockEsClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: {
          bool: {
            filter: [{ ids: { values: ['doc-1', 'doc-2'] } }],
          },
        },
      })
    );
  });

  it('should include data tier exclusion filter in the query', async () => {
    const dataTierFilter: Filter = {
      meta: { negate: true },
      query: {
        terms: {
          _tier: ['data_cold', 'data_frozen'],
        },
      },
    };

    await fetchSourceDocuments({ ...defaultArgs, filters: [dataTierFilter] });

    const { filter } = getSearchBoolQuery();

    expect(filter).toHaveLength(2);
    expect(filter[0]).toEqual({ ids: { values: ['doc-1', 'doc-2'] } });
    expect(filter[1]?.bool).toHaveProperty('must_not', [
      { terms: { _tier: ['data_cold', 'data_frozen'] } },
    ]);
  });

  it('should include excludedDocuments must_not alongside filters', async () => {
    const dataTierFilter: Filter = {
      meta: { negate: true },
      query: {
        terms: {
          _tier: ['data_cold'],
        },
      },
    };

    await fetchSourceDocuments({
      ...defaultArgs,
      filters: [dataTierFilter],
      excludedDocuments: {
        'test-index': [{ id: 'doc-1', timestamp: '2025-01-01T00:00:00Z' }],
      },
    });

    const boolQuery = getSearchBoolQuery();

    expect(boolQuery.filter).toBeDefined();
    expect(boolQuery.must_not).toEqual([
      {
        bool: {
          filter: [{ ids: { values: ['doc-1'] } }, { term: { _index: 'test-index' } }],
        },
      },
    ]);
  });
});
