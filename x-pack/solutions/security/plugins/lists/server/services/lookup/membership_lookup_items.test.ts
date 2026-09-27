/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { SearchListItemArraySchema, Type } from '@kbn/securitysolution-io-ts-list-types';

import type { SearchEsListItemSchema } from '../../schemas/elastic_response';
import { getQueryFilterFromTypeValue, transformElasticNamedSearchToListItem } from '../utils';

import { searchLookupItemsByValues } from './membership_lookup_items';

const LIST_ID = 'list-1';
const INDEX = '.items-default-list-1';

const legacyHit = (
  id: string,
  matchedQueries: string[]
): estypes.SearchHit<SearchEsListItemSchema> => ({
  _id: id,
  _index: '.items-default',
  _source: {
    '@timestamp': '2020-01-01T00:00:00.000Z',
    created_at: '2020-01-01T00:00:00.000Z',
    created_by: 'elastic',
    deserializer: undefined,
    ip: '10.0.0.1',
    list_id: LIST_ID,
    meta: {},
    serializer: undefined,
    tie_breaker_id: id,
    updated_at: '2020-01-01T00:00:00.000Z',
    updated_by: 'elastic',
  } as SearchEsListItemSchema,
  matched_queries: matchedQueries,
});

const response = (hits: estypes.SearchHit[]): estypes.SearchResponse => ({
  _shards: { failed: 0, skipped: 0, successful: 1, total: 1 },
  hits: { hits, total: { relation: 'eq', value: hits.length } },
  timed_out: false,
  took: 1,
});

const search = async (
  esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>,
  type: Type,
  values: unknown[]
): Promise<SearchListItemArraySchema> =>
  searchLookupItemsByValues({
    esClient,
    index: INDEX,
    listId: LIST_ID,
    type,
    user: 'elastic',
    values,
  });

const shouldOf = (
  esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>
): unknown => {
  const [request] = esClient.search.mock.calls[0] as [estypes.SearchRequest];
  return request.query?.bool?.should;
};

describe('searchLookupItemsByValues', () => {
  // The executor passes each event's field value, which is an array, and later compares
  // the returned `value` to that array by identity. It may also nest.
  const values: unknown[] = [['10.0.0.1'], ['10.0.0.9'], '10.0.0.1', [['x', '10.0.0.1']], []];

  it('returns the input values untouched with matched items decided by named queries', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search.mockResponse(
      response([{ _id: 'a', _index: INDEX, matched_queries: ['0.0', '2.0', '3.0'] }])
    );

    const result = await search(esClient, 'ip', values);

    expect(result.map((entry) => entry.value)).toEqual(values);
    expect(result[0].value).toBe(values[0]);
    expect(result.map((entry) => entry.items.length)).toEqual([1, 0, 1, 2, 0]);
    expect(result[3].items[1]).toMatchObject({ list_id: LIST_ID, type: 'ip', value: '10.0.0.1' });
  });

  it('builds the same clauses as the shared stream, one per value, named by value index', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search.mockResponse(response([]));

    await search(esClient, 'ip', values);

    const [request] = esClient.search.mock.calls[0] as [estypes.SearchRequest];
    expect(request.index).toBe(INDEX);
    expect(shouldOf(esClient)).toEqual([
      { terms: { _name: '0.0', value: ['10.0.0.1'] } },
      { terms: { _name: '1.0', value: ['10.0.0.9'] } },
      { term: { value: { _name: '2.0', value: '10.0.0.1' } } },
      { terms: { _name: '3.0', value: ['x', '10.0.0.1'] } },
    ]);

    // the shared stream's builder, with `value` in place of the typed column name
    const [, legacyShould] = getQueryFilterFromTypeValue({
      listId: LIST_ID,
      type: 'ip',
      value: values,
    });
    const renamed = JSON.parse(JSON.stringify(legacyShould).replace(/"ip":/g, '"value":'));
    expect(shouldOf(esClient)).toEqual(renamed.bool.should);
  });

  it('queries the range field by containment with one clause per value on a range list', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search.mockResponse(response([]));

    await search(esClient, 'ip_range', ['10.0.0.1', ['10.0.0.2', '10.0.0.3']]);

    expect(shouldOf(esClient)).toEqual([
      { term: { src_range: { _name: '0.0', value: '10.0.0.1' } } },
      { terms: { _name: '1.0', src_range: ['10.0.0.2', '10.0.0.3'] } },
    ]);
  });

  it('uses one match per element on a text list, as the shared stream does', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search.mockResponse(response([]));

    await search(esClient, 'text', [['some words', 'other']]);

    expect(shouldOf(esClient)).toEqual([
      { match: { value: { _name: '0.0', operator: 'and', query: 'some words' } } },
      { match: { value: { _name: '0.1', operator: 'and', query: 'other' } } },
    ]);
  });

  it('does not search when no value has a scalar element', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();

    const result = await search(esClient, 'ip', [[], null, { nested: true }]);

    expect(esClient.search).not.toHaveBeenCalled();
    expect(result.map((entry) => entry.items.length)).toEqual([0, 0, 0]);
  });

  it('agrees with the shared stream transform on the same named-query response', async () => {
    const matchedQueries = ['0.0', '2.0', '3.0'];
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search.mockResponse(
      response([{ _id: 'a', _index: INDEX, matched_queries: matchedQueries }])
    );

    const lookup = await search(esClient, 'ip', values);
    const legacy = transformElasticNamedSearchToListItem({
      response: response([
        legacyHit('a', matchedQueries),
      ]) as estypes.SearchResponse<SearchEsListItemSchema>,
      type: 'ip',
      value: values,
    });

    expect(lookup.map((entry) => entry.value)).toEqual(legacy.map((entry) => entry.value));
    expect(lookup.map((entry) => entry.items.length > 0)).toEqual(
      legacy.map((entry) => entry.items.length > 0)
    );
  });
});
