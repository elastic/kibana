/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deleteLookupItemByValue } from '../../write_lookup_items';

import type { EsClientMock } from './test_helpers';
import { TEST_INDEX, TEST_LIST_ID, createEsClientMock, equalityId } from './test_helpers';

describe('deleteLookupItemByValue (equality / native types)', () => {
  let esClient: EsClientMock;

  const stored = { created_at: '2026-01-01T00:00:00.000Z', created_by: 'u', value: 'a' };

  beforeEach(() => {
    jest.clearAllMocks();
    esClient = createEsClientMock();
  });

  it('reads then deletes the single doc keyed on the authored value, and returns it', async () => {
    (esClient.get as jest.Mock).mockResolvedValueOnce({ _id: equalityId('a'), _source: stored });

    const deleted = await deleteLookupItemByValue({
      esClient,
      index: TEST_INDEX,
      listId: TEST_LIST_ID,
      type: 'keyword',
      value: 'a',
    });

    expect(esClient.delete).toHaveBeenCalledWith({
      id: equalityId('a'),
      index: TEST_INDEX,
      refresh: 'wait_for',
    });
    expect(deleted).toEqual([{ id: equalityId('a'), source: stored }]);
    // equality deletes never touch the coalesced machinery
    expect(esClient.search).not.toHaveBeenCalled();
    expect(esClient.bulk).not.toHaveBeenCalled();
    expect(esClient.deleteByQuery).not.toHaveBeenCalled();
  });

  it('honors an explicit refresh option', async () => {
    (esClient.get as jest.Mock).mockResolvedValueOnce({ _id: equalityId('a'), _source: stored });

    await deleteLookupItemByValue({
      esClient,
      index: TEST_INDEX,
      listId: TEST_LIST_ID,
      refresh: false,
      type: 'keyword',
      value: 'a',
    });

    expect(esClient.delete).toHaveBeenCalledWith(expect.objectContaining({ refresh: false }));
  });

  it('returns nothing and deletes nothing when the value is not in the list', async () => {
    (esClient.get as jest.Mock).mockRejectedValueOnce(
      Object.assign(new Error('not found'), { meta: { statusCode: 404 } })
    );

    await expect(
      deleteLookupItemByValue({
        esClient,
        index: TEST_INDEX,
        listId: TEST_LIST_ID,
        type: 'keyword',
        value: 'gone',
      })
    ).resolves.toEqual([]);
    expect(esClient.delete).not.toHaveBeenCalled();
  });

  it('raises any other failure, so a caller without privileges is not told 200', async () => {
    (esClient.get as jest.Mock).mockRejectedValueOnce(
      Object.assign(new Error('forbidden'), { meta: { statusCode: 403 } })
    );

    await expect(
      deleteLookupItemByValue({
        esClient,
        index: TEST_INDEX,
        listId: TEST_LIST_ID,
        type: 'keyword',
        value: 'gone',
      })
    ).rejects.toThrow('forbidden');
  });
});
