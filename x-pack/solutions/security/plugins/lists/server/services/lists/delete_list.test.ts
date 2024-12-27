/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getListResponseMock } from '../../../common/schemas/response/list_schema.mock';
import { LIST_ID, LIST_INDEX, LIST_ITEM_INDEX } from '../../../common/constants.mock';

import { getList } from './get_list';
import { deleteList } from './delete_list';
import { getDeleteListOptionsMock } from './delete_list.mock';

jest.mock('../utils', () => ({
  waitUntilDocumentIndexed: jest.fn(),
}));

jest.mock('./get_list', () => ({
  getList: jest.fn(),
}));

describe('delete_list', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('Delete returns a null if the list is also null', async () => {
    (getList as unknown as jest.Mock).mockResolvedValueOnce(null);
    const options = getDeleteListOptionsMock();
    const deletedList = await deleteList(options);
    expect(deletedList).toEqual(null);
  });

  test('Delete returns the list if a list is returned from getList', async () => {
    const list = getListResponseMock();
    (getList as unknown as jest.Mock).mockResolvedValueOnce(list);
    const options = getDeleteListOptionsMock();
    options.esClient.deleteByQuery = jest.fn().mockResolvedValue({ deleted: 1 });
    const deletedList = await deleteList(options);
    expect(deletedList).toEqual(list);
  });

  test('Delete calls "deleteByQuery" for list items if a list is returned from getList', async () => {
    const list = getListResponseMock();
    (getList as unknown as jest.Mock).mockResolvedValueOnce(list);
    const options = getDeleteListOptionsMock();
    options.esClient.deleteByQuery = jest.fn().mockResolvedValue({ deleted: 1 });
    await deleteList(options);
    const deleteByQuery = {
      body: { query: { term: { list_id: LIST_ID } } },
      conflicts: 'proceed',
      index: LIST_ITEM_INDEX,
      refresh: false,
    };
    expect(options.esClient.deleteByQuery).toHaveBeenNthCalledWith(1, deleteByQuery);
  });

  test('Delete calls "deleteByQuery" for list if a list is returned from getList', async () => {
    const list = getListResponseMock();
    (getList as unknown as jest.Mock).mockResolvedValueOnce(list);
    const options = getDeleteListOptionsMock();
    options.esClient.deleteByQuery = jest.fn().mockResolvedValue({ deleted: 1 });
    await deleteList(options);
    const deleteByQuery = {
      body: {
        query: {
          ids: {
            values: [LIST_ID],
          },
        },
      },
      conflicts: 'proceed',
      index: LIST_INDEX,
      refresh: false,
    };
    expect(options.esClient.deleteByQuery).toHaveBeenCalledWith(deleteByQuery);
  });

  test('Delete does not call data client if the list returns null', async () => {
    (getList as unknown as jest.Mock).mockResolvedValueOnce(null);
    const options = getDeleteListOptionsMock();
    await deleteList(options);
    expect(options.esClient.delete).not.toHaveBeenCalled();
  });

  test('throw error if no list was deleted', async () => {
    const list = getListResponseMock();
    (getList as unknown as jest.Mock).mockResolvedValueOnce(list);
    const options = getDeleteListOptionsMock();
    options.esClient.deleteByQuery = jest.fn().mockResolvedValue({ deleted: 0 });

    await expect(deleteList(options)).rejects.toThrow('No list has been deleted');
  });
});
