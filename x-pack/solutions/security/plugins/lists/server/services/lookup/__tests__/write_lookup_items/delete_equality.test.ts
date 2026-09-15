/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deleteLookupItemByValue } from '../../write_lookup_items';

import type { EsClientMock } from './test_helpers';
import { TEST_INDEX, createEsClientMock, equalityId } from './test_helpers';

describe('deleteLookupItemByValue (equality / native types)', () => {
  let esClient: EsClientMock;

  beforeEach(() => {
    jest.clearAllMocks();
    esClient = createEsClientMock();
  });

  it('deletes the single doc keyed on the authored value', async () => {
    await deleteLookupItemByValue({ esClient, index: TEST_INDEX, type: 'keyword', value: 'a' });

    expect(esClient.delete).toHaveBeenCalledWith({
      id: equalityId('a'),
      index: TEST_INDEX,
      refresh: 'wait_for',
    });
    // equality deletes never touch the coalesced machinery
    expect(esClient.search).not.toHaveBeenCalled();
    expect(esClient.bulk).not.toHaveBeenCalled();
  });

  it('honors an explicit refresh option', async () => {
    await deleteLookupItemByValue({
      esClient,
      index: TEST_INDEX,
      refresh: false,
      type: 'keyword',
      value: 'a',
    });

    expect(esClient.delete).toHaveBeenCalledWith(expect.objectContaining({ refresh: false }));
  });

  it('swallows a delete failure (a missing value is not an error)', async () => {
    (esClient.delete as jest.Mock).mockRejectedValueOnce(new Error('not found'));

    await expect(
      deleteLookupItemByValue({ esClient, index: TEST_INDEX, type: 'keyword', value: 'gone' })
    ).resolves.toBeUndefined();
  });
});
