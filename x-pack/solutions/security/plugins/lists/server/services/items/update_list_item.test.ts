/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import type { ListItemSchema } from '@kbn/securitysolution-io-ts-list-types';

import { getListItemResponseMock } from '../../../common/schemas/response/list_item_schema.mock';

import { updateListItem } from './update_list_item';
import { getListItem } from './get_list_item';
import { getUpdateListItemOptionsMock } from './update_list_item.mock';

vi.mock('../utils/check_version_conflict', () => {
      const mocked = {
      checkVersionConflict: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../utils/wait_until_document_indexed', () => {
      const mocked = {
      waitUntilDocumentIndexed: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('./get_list_item', () => {
      const mocked = {
      getListItem: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

describe('update_list_item', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('it returns a list item when updated', async () => {
    const listItem = getListItemResponseMock();
    (getListItem as unknown as Mock).mockResolvedValueOnce(listItem);
    const options = getUpdateListItemOptionsMock();
    const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
    esClient.updateByQuery.mockResponse({ updated: 1 });
    const updatedListItem = await updateListItem({ ...options, esClient });
    const expected: ListItemSchema = getListItemResponseMock();
    expect(updatedListItem).toEqual(expected);
  });

  test('it returns null when there is not a list item to update', async () => {
    (getListItem as unknown as Mock).mockResolvedValueOnce(null);
    const options = getUpdateListItemOptionsMock();
    const updatedListItem = await updateListItem(options);
    expect(updatedListItem).toEqual(null);
  });

  test('throw error if no list item was updated', async () => {
    const listItem = getListItemResponseMock();
    (getListItem as unknown as Mock).mockResolvedValueOnce(listItem);
    const options = getUpdateListItemOptionsMock();
    const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
    esClient.updateByQuery.mockResponse({ updated: 0 });
    await expect(updateListItem({ ...options, esClient })).rejects.toThrow(
      'No list item has been updated'
    );
  });
});
