/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';

import { bulkDeleteExceptionListItems } from './bulk_delete_exception_list_items';

describe('bulkDeleteExceptionListItems', () => {
  test('resolves without error when every item deletes successfully', async () => {
    const savedObjectsClient = savedObjectsClientMock.create();
    savedObjectsClient.bulkDelete.mockResolvedValue({
      statuses: [
        { id: 'item-1', success: true, type: 'exception-list-item' },
        { id: 'item-2', success: true, type: 'exception-list-item' },
      ],
    });

    await expect(
      bulkDeleteExceptionListItems({
        ids: ['item-1', 'item-2'],
        namespaceType: 'single',
        savedObjectsClient,
      })
    ).resolves.toBeUndefined();
  });

  test('treats a 404 as a no-op rather than a failure', async () => {
    const savedObjectsClient = savedObjectsClientMock.create();
    savedObjectsClient.bulkDelete.mockResolvedValue({
      statuses: [
        {
          error: { error: 'Not Found', message: 'Not found', statusCode: 404 },
          id: 'item-1',
          success: false,
          type: 'exception-list-item',
        },
      ],
    });

    await expect(
      bulkDeleteExceptionListItems({
        ids: ['item-1'],
        namespaceType: 'single',
        savedObjectsClient,
      })
    ).resolves.toBeUndefined();
  });

  test('throws when an item fails to delete for a reason other than not found', async () => {
    const savedObjectsClient = savedObjectsClientMock.create();
    savedObjectsClient.bulkDelete.mockResolvedValue({
      statuses: [
        {
          error: { error: 'Conflict', message: 'conflict deleting item', statusCode: 409 },
          id: 'item-1',
          success: false,
          type: 'exception-list-item',
        },
      ],
    });

    await expect(
      bulkDeleteExceptionListItems({
        ids: ['item-1'],
        namespaceType: 'single',
        savedObjectsClient,
      })
    ).rejects.toThrow('conflict deleting item');
  });

  test('preserves the original ES status code on the thrown error so transformError surfaces it', async () => {
    const savedObjectsClient = savedObjectsClientMock.create();
    savedObjectsClient.bulkDelete.mockResolvedValue({
      statuses: [
        {
          error: { error: 'Conflict', message: 'conflict', statusCode: 409 },
          id: 'item-1',
          success: false,
          type: 'exception-list-item',
        },
      ],
    });

    let thrownError: unknown;
    try {
      await bulkDeleteExceptionListItems({
        ids: ['item-1'],
        namespaceType: 'single',
        savedObjectsClient,
      });
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).toBeInstanceOf(Error);
    expect((thrownError as Error & { statusCode: number }).statusCode).toBe(409);
  });
});
