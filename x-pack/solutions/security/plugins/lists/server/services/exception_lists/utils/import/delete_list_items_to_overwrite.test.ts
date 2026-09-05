/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';

import { getImportExceptionsListItemSchemaDecodedMock } from '../../../../../common/schemas/request/import_exceptions_schema.mock';
import { bulkDeleteExceptionListItems } from '../../bulk_delete_exception_list_items';
import { getExceptionListItems } from '../../delete_exception_list_items_by_list';

import {
  deleteListItemsToBeOverwritten,
  getListItemsToBeOverwritten,
} from './delete_list_items_to_overwrite';

jest.mock('../../bulk_delete_exception_list_items');
jest.mock('../../delete_exception_list_items_by_list');

describe('deleteListItemsToBeOverwritten', () => {
  const existingItems = [
    { id: 'keep-single', item_id: 'item-1', list_id: 'list-1', namespace_type: 'single' as const },
    {
      id: 'delete-single',
      item_id: 'item-2',
      list_id: 'list-1',
      namespace_type: 'single' as const,
    },
    {
      id: 'delete-agnostic',
      item_id: 'item-3',
      list_id: 'list-2',
      namespace_type: 'agnostic' as const,
    },
  ];
  let savedObjectsClient: jest.Mocked<SavedObjectsClientContract>;

  beforeEach(() => {
    jest.clearAllMocks();
    savedObjectsClient = savedObjectsClientMock.create();
  });

  it('snapshots existing items before an overwrite', async () => {
    (getExceptionListItems as jest.Mock)
      .mockResolvedValueOnce([existingItems[0]])
      .mockResolvedValueOnce([existingItems[2]]);

    const result = await getListItemsToBeOverwritten({
      listsOfItemsToDelete: [
        ['list-1', 'single'],
        ['list-2', 'agnostic'],
      ],
      savedObjectsClient,
    });

    expect(result).toEqual([existingItems[0], existingItems[2]]);
    expect(getExceptionListItems).toHaveBeenNthCalledWith(1, {
      listId: 'list-1',
      namespaceType: 'single',
      savedObjectsClient,
    });
    expect(getExceptionListItems).toHaveBeenNthCalledWith(2, {
      listId: 'list-2',
      namespaceType: 'agnostic',
      savedObjectsClient,
    });
  });

  it('deletes only existing items missing from the import', async () => {
    await deleteListItemsToBeOverwritten({
      existingItems,
      importedItems: [
        {
          ...getImportExceptionsListItemSchemaDecodedMock('item-1', 'list-1'),
          namespace_type: 'single',
        },
      ],
      savedObjectsClient,
    });

    expect(bulkDeleteExceptionListItems).toHaveBeenNthCalledWith(1, {
      ids: ['delete-single'],
      namespaceType: 'single',
      savedObjectsClient,
    });
    expect(bulkDeleteExceptionListItems).toHaveBeenNthCalledWith(2, {
      ids: ['delete-agnostic'],
      namespaceType: 'agnostic',
      savedObjectsClient,
    });
  });
});
