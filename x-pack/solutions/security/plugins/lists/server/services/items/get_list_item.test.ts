/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';

import { getListItemResponseMock } from '../../../common/schemas/response/list_item_schema.mock';
import { LIST_INDEX, LIST_ITEM_ID } from '../../../common/constants.mock';
import {
  getSearchEsListItemMock,
  getSearchEsListItemsAsAllUndefinedMock,
} from '../../schemas/elastic_response/search_es_list_item_schema.mock';

import { getListItem } from './get_list_item';

describe('get_list_item', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('it returns a list item as expected if the list item is found', async () => {
    const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
    esClient.get.mockResolvedValue({
      _id: LIST_ITEM_ID,
      _index: LIST_INDEX,
      _source: getSearchEsListItemMock(),
      found: true,
    });
    const list = await getListItem({ esClient, id: LIST_ITEM_ID, listItemIndex: LIST_INDEX });
    const expected = getListItemResponseMock();
    expect(list).toEqual(expected);
  });

  test('it returns null if the document is not found (404)', async () => {
    const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
    esClient.get.mockRejectedValue(
      new errors.ResponseError({
        body: { error: { type: 'not_found' } },
        headers: {},
        meta: {} as never,
        statusCode: 404,
        warnings: [],
      })
    );
    const list = await getListItem({ esClient, id: LIST_ITEM_ID, listItemIndex: LIST_INDEX });
    expect(list).toEqual(null);
  });

  test('it returns null if all the values underneath the source type is undefined', async () => {
    const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
    esClient.get.mockResolvedValue({
      _id: LIST_ITEM_ID,
      _index: LIST_INDEX,
      _source: getSearchEsListItemsAsAllUndefinedMock(),
      found: true,
    });
    const list = await getListItem({ esClient, id: LIST_ITEM_ID, listItemIndex: LIST_INDEX });
    expect(list).toEqual(null);
  });

  test('it re-throws non-404 errors', async () => {
    const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
    const serverError = new errors.ResponseError({
      body: { error: { type: 'internal_server_error' } },
      headers: {},
      meta: {} as never,
      statusCode: 500,
      warnings: [],
    });
    esClient.get.mockRejectedValue(serverError);
    await expect(
      getListItem({ esClient, id: LIST_ITEM_ID, listItemIndex: LIST_INDEX })
    ).rejects.toThrow(serverError);
  });
});
