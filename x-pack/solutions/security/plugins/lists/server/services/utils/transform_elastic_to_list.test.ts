/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getSearchEsListMock,
  getSearchListMock,
} from '../../schemas/elastic_response/search_es_list_schema.mock';

import { transformElasticToList } from './transform_elastic_to_list';
describe('transformElasticToList', () => {
  test('does not change timestamp in string format', () => {
    const response = getSearchListMock({
      ...getSearchEsListMock(),
      '@timestamp': '2020-04-20T15:25:31.830Z',
    });

    const result = transformElasticToList({
      response,
    });

    expect(result[0]['@timestamp']).toBe('2020-04-20T15:25:31.830Z');
  });
  test('converts timestamp from number format to ISO string', () => {
    const response = getSearchListMock({ ...getSearchEsListMock(), '@timestamp': 0 });

    const result = transformElasticToList({
      response,
    });

    expect(result[0]['@timestamp']).toBe('1970-01-01T00:00:00.000Z');
  });
});
