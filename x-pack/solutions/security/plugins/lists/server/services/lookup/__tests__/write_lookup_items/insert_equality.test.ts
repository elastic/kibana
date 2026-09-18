/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { writeLookupItems } from '../../write_lookup_items';

import type { EsClientMock } from './test_helpers';
import { TEST_INDEX, createEsClientMock, equalityId, expectedEqualityOps } from './test_helpers';

describe('writeLookupItems (equality / native types)', () => {
  let esClient: EsClientMock;

  beforeEach(() => {
    jest.clearAllMocks();
    esClient = createEsClientMock();
  });

  it('indexes one deduplicated doc per value, keyed on the authored value', async () => {
    await writeLookupItems({ esClient, index: TEST_INDEX, type: 'keyword', values: ['a', 'b'] });

    expect(esClient.bulk).toHaveBeenCalledTimes(1);
    expect(esClient.bulk).toHaveBeenCalledWith({
      index: TEST_INDEX,
      operations: expectedEqualityOps('keyword', ['a', 'b']),
      refresh: 'wait_for',
    });
    // never touches the range machinery
    expect(esClient.search).not.toHaveBeenCalled();
    expect(esClient.deleteByQuery).not.toHaveBeenCalled();
  });

  it('serializes ip values through the shared transform', async () => {
    await writeLookupItems({ esClient, index: TEST_INDEX, type: 'ip', values: ['1.2.3.4'] });

    expect(esClient.bulk).toHaveBeenCalledWith({
      index: TEST_INDEX,
      operations: expectedEqualityOps('ip', ['1.2.3.4']),
      refresh: 'wait_for',
    });
  });

  it('keys duplicate values on the same id, so the upsert is idempotent', async () => {
    await writeLookupItems({
      esClient,
      index: TEST_INDEX,
      type: 'keyword',
      values: ['dup', 'dup'],
    });

    const [[{ operations }]] = (esClient.bulk as jest.Mock).mock.calls;
    expect(operations).toHaveLength(4);
    expect(operations[0]).toEqual({ index: { _id: equalityId('dup') } });
    expect(operations[2]).toEqual({ index: { _id: equalityId('dup') } });
  });

  it('honors an explicit refresh option', async () => {
    await writeLookupItems({
      esClient,
      index: TEST_INDEX,
      refresh: false,
      type: 'keyword',
      values: ['a'],
    });

    expect(esClient.bulk).toHaveBeenCalledWith(expect.objectContaining({ refresh: false }));
  });

  it('is a no-op for an empty value list', async () => {
    await writeLookupItems({ esClient, index: TEST_INDEX, type: 'keyword', values: [] });

    expect(esClient.bulk).not.toHaveBeenCalled();
  });

  it('propagates a bulk failure', async () => {
    (esClient.bulk as jest.Mock).mockRejectedValueOnce(new Error('bulk boom'));

    await expect(
      writeLookupItems({ esClient, index: TEST_INDEX, type: 'keyword', values: ['a'] })
    ).rejects.toThrow('bulk boom');
  });
});
