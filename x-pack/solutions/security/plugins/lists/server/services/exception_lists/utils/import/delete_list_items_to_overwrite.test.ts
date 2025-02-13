/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core/server';
import { NamespaceType } from '@kbn/securitysolution-io-ts-list-types';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';

import { deleteExceptionListItemByList } from '../../delete_exception_list_items_by_list';

import { deleteListItemsToBeOverwritten } from './delete_list_items_to_overwrite';

jest.mock('../../delete_exception_list_items_by_list');

describe('deleteListItemsToBeOverwritten', () => {
  const sampleListItemsToDelete: Array<[string, NamespaceType]> = [
    ['list-id', 'single'],
    ['list-id-2', 'agnostic'],
  ];
  let savedObjectsClient: jest.Mocked<SavedObjectsClientContract>;

  beforeEach(() => {
    savedObjectsClient = savedObjectsClientMock.create();
  });

  it('returns empty array if no items to create', async () => {
    await deleteListItemsToBeOverwritten({
      listsOfItemsToDelete: sampleListItemsToDelete,
      savedObjectsClient,
    });

    expect(deleteExceptionListItemByList).toHaveBeenNthCalledWith(1, {
      listId: 'list-id',
      namespaceType: 'single',
      savedObjectsClient,
    });
    expect(deleteExceptionListItemByList).toHaveBeenNthCalledWith(2, {
      listId: 'list-id-2',
      namespaceType: 'agnostic',
      savedObjectsClient,
    });
  });
});
