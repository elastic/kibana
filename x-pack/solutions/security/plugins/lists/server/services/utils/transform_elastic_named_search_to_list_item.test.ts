/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchListItemArraySchema } from '@kbn/securitysolution-io-ts-list-types';

import { getSearchListItemResponseMock } from '../../../common/schemas/response/search_list_item_schema.mock';
import { LIST_INDEX, LIST_ITEM_ID, TYPE, VALUE } from '../../../common/constants.mock';
import {
  getSearchEsListItemMock,
  getSearchListItemMock,
} from '../../schemas/elastic_response/search_es_list_item_schema.mock';

import { transformElasticNamedSearchToListItem } from './transform_elastic_named_search_to_list_item';

describe('transform_elastic_named_search_to_list_item', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('if given an empty array for values, it returns an empty array', () => {
    const response = getSearchListItemMock();
    const queryFilter = transformElasticNamedSearchToListItem({
      response,
      type: TYPE,
      value: [],
    });
    const expected: SearchListItemArraySchema = [];
    expect(queryFilter).toEqual(expected);
  });

  test('if given an empty array for hits, it returns an empty match', () => {
    const response = getSearchListItemMock();
    response.hits.hits = [];
    const queryFilter = transformElasticNamedSearchToListItem({
      response,
      type: TYPE,
      value: [VALUE],
    });
    const expected: SearchListItemArraySchema = [{ items: [], value: VALUE }];
    expect(queryFilter).toEqual(expected);
  });

  test('it transforms a single elastic type to a search list item type', () => {
    const response = getSearchListItemMock();
    const queryFilter = transformElasticNamedSearchToListItem({
      response,
      type: TYPE,
      value: [VALUE],
    });
    const expected: SearchListItemArraySchema = [getSearchListItemResponseMock()];
    expect(queryFilter).toEqual(expected);
  });

  test('it transforms two elastic types to a search list item type', () => {
    const response = getSearchListItemMock();
    response.hits.hits = [
      ...response.hits.hits,
      {
        _id: LIST_ITEM_ID,
        _index: LIST_INDEX,
        _score: 0,
        _source: getSearchEsListItemMock(),
        matched_queries: ['1.0'],
      },
    ];
    const queryFilter = transformElasticNamedSearchToListItem({
      response,
      type: TYPE,
      value: [VALUE, VALUE],
    });
    const expected: SearchListItemArraySchema = [
      getSearchListItemResponseMock(),
      getSearchListItemResponseMock(),
    ];
    expect(queryFilter).toEqual(expected);
  });

  test('it transforms only 1 elastic type to a search list item type if only 1 is found as a value', () => {
    const response = getSearchListItemMock();
    const queryFilter = transformElasticNamedSearchToListItem({
      response,
      type: TYPE,
      value: [VALUE, '127.0.0.2'],
    });
    const expected: SearchListItemArraySchema = [
      getSearchListItemResponseMock(),
      { items: [], value: '127.0.0.2' },
    ];
    expect(queryFilter).toEqual(expected);
  });

  test('it attaches two found results if the value is found in two hits from Elastic Search', () => {
    const response = getSearchListItemMock();
    response.hits.hits = [
      ...response.hits.hits,
      {
        _id: LIST_ITEM_ID,
        _index: LIST_INDEX,
        _score: 0,
        _source: getSearchEsListItemMock(),
        matched_queries: ['0.0'],
      },
    ];
    const queryFilter = transformElasticNamedSearchToListItem({
      response,
      type: TYPE,
      value: [VALUE],
    });
    const {
      items: [firstItem],
      value,
    } = getSearchListItemResponseMock();
    const expected: SearchListItemArraySchema = [
      {
        items: [firstItem, firstItem],
        value,
      },
    ];
    expect(queryFilter).toEqual(expected);
  });

  test('it will return an empty array if no values are passed in', () => {
    const response = getSearchListItemMock();
    response.hits.hits = [
      ...response.hits.hits,
      {
        _id: LIST_ITEM_ID,
        _index: LIST_INDEX,
        _score: 0,
        _source: getSearchEsListItemMock(),
        matched_queries: ['1.0'],
      },
    ];
    const queryFilter = transformElasticNamedSearchToListItem({
      response,
      type: TYPE,
      value: [],
    });
    expect(queryFilter).toEqual([]);
  });
});
