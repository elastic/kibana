/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';

import { deleteExceptionListItemsByListStreamed } from './delete_exception_list_items_by_list';
import { bulkDeleteExceptionListItems } from './bulk_delete_exception_list_items';

jest.mock('./bulk_delete_exception_list_items');

const idsFor = (prefix: string, count: number): Array<{ id: string }> =>
  Array.from({ length: count }, (_, index) => ({ id: `${prefix}-${index}` }));

describe('deleteExceptionListItemsByListStreamed', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('deletes items a page at a time as the PIT finder streams results, never accumulating all ids at once', async () => {
    const savedObjectsClient = savedObjectsClientMock.create();
    const close = jest.fn().mockResolvedValue(undefined);
    const find = jest.fn(async function* () {
      yield { saved_objects: idsFor('page-1', 1_000) };
      yield { saved_objects: idsFor('page-2', 500) };
    });
    savedObjectsClient.createPointInTimeFinder.mockReturnValue({
      close,
      find,
    } as unknown as ReturnType<typeof savedObjectsClient.createPointInTimeFinder>);
    (bulkDeleteExceptionListItems as jest.Mock).mockResolvedValue([]);

    await deleteExceptionListItemsByListStreamed({
      listId: 'list-1',
      namespaceType: 'single',
      savedObjectsClient,
    });

    expect(bulkDeleteExceptionListItems).toHaveBeenCalledTimes(2);
    expect(bulkDeleteExceptionListItems).toHaveBeenNthCalledWith(1, {
      ids: idsFor('page-1', 1_000).map(({ id }) => id),
      namespaceType: 'single',
      savedObjectsClient,
    });
    expect(bulkDeleteExceptionListItems).toHaveBeenNthCalledWith(2, {
      ids: idsFor('page-2', 500).map(({ id }) => id),
      namespaceType: 'single',
      savedObjectsClient,
    });
    expect(close).toHaveBeenCalledTimes(1);
  });

  test('does not call bulkDeleteExceptionListItems for an empty page', async () => {
    const savedObjectsClient = savedObjectsClientMock.create();
    const close = jest.fn().mockResolvedValue(undefined);
    const find = jest.fn(async function* () {
      yield { saved_objects: [] };
    });
    savedObjectsClient.createPointInTimeFinder.mockReturnValue({
      close,
      find,
    } as unknown as ReturnType<typeof savedObjectsClient.createPointInTimeFinder>);

    await deleteExceptionListItemsByListStreamed({
      listId: 'list-1',
      namespaceType: 'single',
      savedObjectsClient,
    });

    expect(bulkDeleteExceptionListItems).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalledTimes(1);
  });

  test('propagates an error thrown while deleting a page and still closes the PIT finder', async () => {
    const savedObjectsClient = savedObjectsClientMock.create();
    const close = jest.fn().mockResolvedValue(undefined);
    const find = jest.fn(async function* () {
      yield { saved_objects: idsFor('page-1', 1) };
    });
    savedObjectsClient.createPointInTimeFinder.mockReturnValue({
      close,
      find,
    } as unknown as ReturnType<typeof savedObjectsClient.createPointInTimeFinder>);
    (bulkDeleteExceptionListItems as jest.Mock).mockRejectedValueOnce(new Error('boom'));

    await expect(
      deleteExceptionListItemsByListStreamed({
        listId: 'list-1',
        namespaceType: 'single',
        savedObjectsClient,
      })
    ).rejects.toThrow('boom');

    // The PIT must be closed even when a page delete throws, otherwise the
    // finder leaks in ES until the keep_alive TTL expires.
    expect(close).toHaveBeenCalledTimes(1);
  });

  test('throws when a page reports a non-404 item delete failure, and still closes the finder', async () => {
    const savedObjectsClient = savedObjectsClientMock.create();
    const close = jest.fn().mockResolvedValue(undefined);
    const find = jest.fn(async function* () {
      yield { saved_objects: idsFor('page-1', 1) };
    });
    savedObjectsClient.createPointInTimeFinder.mockReturnValue({
      close,
      find,
    } as unknown as ReturnType<typeof savedObjectsClient.createPointInTimeFinder>);
    (bulkDeleteExceptionListItems as jest.Mock).mockResolvedValue([
      {
        error: { error: 'Conflict', message: 'conflict deleting item', statusCode: 409 },
        id: 'page-1-0',
        success: false,
        type: 'exception-list-item',
      },
    ]);

    let thrownError: unknown;
    try {
      await deleteExceptionListItemsByListStreamed({
        listId: 'list-1',
        namespaceType: 'single',
        savedObjectsClient,
      });
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).toBeInstanceOf(Error);
    expect((thrownError as Error).message).toContain('conflict deleting item');
    // The original ES status code is preserved so transformError surfaces it
    // rather than defaulting to 500.
    expect((thrownError as Error & { statusCode: number }).statusCode).toBe(409);
    expect(close).toHaveBeenCalledTimes(1);
  });

  test('treats a 404 item status as a no-op rather than a failure', async () => {
    const savedObjectsClient = savedObjectsClientMock.create();
    const close = jest.fn().mockResolvedValue(undefined);
    const find = jest.fn(async function* () {
      yield { saved_objects: idsFor('page-1', 1) };
    });
    savedObjectsClient.createPointInTimeFinder.mockReturnValue({
      close,
      find,
    } as unknown as ReturnType<typeof savedObjectsClient.createPointInTimeFinder>);
    (bulkDeleteExceptionListItems as jest.Mock).mockResolvedValue([
      {
        error: { error: 'Not Found', message: 'Not found', statusCode: 404 },
        id: 'page-1-0',
        success: false,
        type: 'exception-list-item',
      },
    ]);

    await expect(
      deleteExceptionListItemsByListStreamed({
        listId: 'list-1',
        namespaceType: 'single',
        savedObjectsClient,
      })
    ).resolves.toBeUndefined();
    expect(close).toHaveBeenCalledTimes(1);
  });
});
