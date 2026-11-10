/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';

import { bulkDeleteExceptionListItems } from './bulk_delete_exception_list_items';

describe('bulkDeleteExceptionListItems', () => {
  test('returns the per-item statuses when every item deletes successfully', async () => {
    const savedObjectsClient = savedObjectsClientMock.create();
    const statuses = [
      { id: 'item-1', success: true, type: 'exception-list-item' },
      { id: 'item-2', success: true, type: 'exception-list-item' },
    ];
    savedObjectsClient.bulkDelete.mockResolvedValue({ statuses });

    await expect(
      bulkDeleteExceptionListItems({
        ids: ['item-1', 'item-2'],
        namespaceType: 'single',
        savedObjectsClient,
      })
    ).resolves.toEqual(statuses);
  });

  test('is tolerant of per-item failures and returns them without throwing', async () => {
    const savedObjectsClient = savedObjectsClientMock.create();
    const statuses = [
      {
        error: { error: 'Conflict', message: 'conflict deleting item', statusCode: 409 },
        id: 'item-1',
        success: false,
        type: 'exception-list-item',
      },
    ];
    savedObjectsClient.bulkDelete.mockResolvedValue({ statuses });

    await expect(
      bulkDeleteExceptionListItems({
        ids: ['item-1'],
        namespaceType: 'single',
        savedObjectsClient,
      })
    ).resolves.toEqual(statuses);
  });
});
