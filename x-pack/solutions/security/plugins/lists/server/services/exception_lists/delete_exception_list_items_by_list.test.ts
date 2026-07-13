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

  test('propagates an error thrown while deleting a page, matching existing PIT finder cascade semantics', async () => {
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
  });
});
