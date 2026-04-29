/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';

import { getEmptySearchListMock } from '../../schemas/elastic_response/search_es_list_schema.mock';

import { getFindAllListItemsOptionsMock } from './find_all_list_items.mock';
import { findAllListItems } from './find_all_list_items';

describe('find_all_list_items', () => {
  test('should return null if the list is null', async () => {
    const options = getFindAllListItemsOptionsMock();
    const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
    esClient.search.mockResponse(getEmptySearchListMock());
    const item = await findAllListItems({ ...options, esClient });
    expect(item).toEqual(null);
  });
});
