/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ListItemArraySchema } from '@kbn/securitysolution-io-ts-list-types';

import { getListItemResponseMock } from '../../../common/schemas/response/list_item_schema.mock';
import {
  getSearchEsListItemMock,
  getSearchListItemMock,
} from '../../schemas/elastic_response/search_es_list_item_schema.mock';

import {
  transformElasticHitsToListItem,
  transformElasticToListItem,
} from './transform_elastic_to_list_item';

describe('transform_elastic_to_list_item', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('transformElasticToListItem', () => {
    test('it transforms an elastic type to a list item type', () => {
      const response = getSearchListItemMock();
      const queryFilter = transformElasticToListItem({
        response,
        type: 'ip',
      });
      const expected: ListItemArraySchema = [getListItemResponseMock()];
      expect(queryFilter).toEqual(expected);
    });

    test('it transforms an elastic keyword type to a list item type', () => {
      const response = getSearchListItemMock();
      if (response.hits.hits[0]._source) {
        response.hits.hits[0]._source.ip = undefined;
        response.hits.hits[0]._source.keyword = 'host-name-example';
      }
      const queryFilter = transformElasticToListItem({
        response,
        type: 'keyword',
      });
      const listItemResponse = getListItemResponseMock();
      listItemResponse.type = 'keyword';
      listItemResponse.value = 'host-name-example';
      const expected: ListItemArraySchema = [listItemResponse];
      expect(queryFilter).toEqual(expected);
    });
  });

  describe('transformElasticHitsToListItem', () => {
    test('it transforms an elastic type to a list item type', () => {
      const {
        hits: { hits },
      } = getSearchListItemMock();
      const queryFilter = transformElasticHitsToListItem({
        hits,
        type: 'ip',
      });
      const expected: ListItemArraySchema = [getListItemResponseMock()];
      expect(queryFilter).toEqual(expected);
    });

    test('it transforms an elastic keyword type to a list item type', () => {
      const {
        hits: { hits },
      } = getSearchListItemMock();
      if (hits[0]._source) {
        hits[0]._source.ip = undefined;
        hits[0]._source.keyword = 'host-name-example';
      }
      const queryFilter = transformElasticHitsToListItem({
        hits,
        type: 'keyword',
      });
      const listItemResponse = getListItemResponseMock();
      listItemResponse.type = 'keyword';
      listItemResponse.value = 'host-name-example';
      const expected: ListItemArraySchema = [listItemResponse];
      expect(queryFilter).toEqual(expected);
    });

    test('converts timestamp from number format to ISO string', () => {
      const hits = [{ _index: 'test', _source: { ...getSearchEsListItemMock(), '@timestamp': 0 } }];

      const result = transformElasticHitsToListItem({
        hits,
        type: 'keyword',
      });

      expect(result[0]['@timestamp']).toBe('1970-01-01T00:00:00.000Z');
    });

    test('converts negative from number timestamp to ISO string', () => {
      const hits = [
        {
          _index: 'test',
          _source: { ...getSearchEsListItemMock(), '@timestamp': -63549289600000 },
        },
      ];

      const result = transformElasticHitsToListItem({
        hits,
        type: 'keyword',
      });

      expect(result[0]['@timestamp']).toBe('-000044-03-15T19:33:20.000Z');
    });
  });
});
