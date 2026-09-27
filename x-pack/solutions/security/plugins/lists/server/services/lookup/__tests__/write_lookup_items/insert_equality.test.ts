/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { writeLookupItems } from '../../write_lookup_items';

import type { EsClientMock } from './test_helpers';
import {
  TEST_INDEX,
  TEST_LIST_ID,
  TEST_NOW,
  TEST_USER,
  createEsClientMock,
  equalityId,
  expectedEqualityOps,
} from './test_helpers';

describe('writeLookupItems (equality / native types)', () => {
  let esClient: EsClientMock;

  beforeEach(() => {
    jest.clearAllMocks();
    esClient = createEsClientMock();
  });

  it('indexes one deduplicated doc per value, keyed on the authored value', async () => {
    await writeLookupItems({
      esClient,
      index: TEST_INDEX,
      listId: TEST_LIST_ID,
      now: TEST_NOW,
      type: 'keyword',
      user: TEST_USER,
      values: ['a', 'b'],
    });

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
    await writeLookupItems({
      esClient,
      index: TEST_INDEX,
      listId: TEST_LIST_ID,
      now: TEST_NOW,
      type: 'ip',
      user: TEST_USER,
      values: ['1.2.3.4'],
    });

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
      listId: TEST_LIST_ID,
      now: TEST_NOW,
      type: 'keyword',
      user: TEST_USER,
      values: ['dup', 'dup'],
    });

    const [[{ operations }]] = (esClient.bulk as jest.Mock).mock.calls;
    expect(operations).toHaveLength(4);
    expect(operations[0]).toEqual({ update: { _id: equalityId('dup'), retry_on_conflict: 3 } });
    expect(operations[2]).toEqual({ update: { _id: equalityId('dup'), retry_on_conflict: 3 } });
  });

  it('honors an explicit refresh option', async () => {
    await writeLookupItems({
      esClient,
      index: TEST_INDEX,
      listId: TEST_LIST_ID,
      now: TEST_NOW,
      refresh: false,
      type: 'keyword',
      user: TEST_USER,
      values: ['a'],
    });

    expect(esClient.bulk).toHaveBeenCalledWith(expect.objectContaining({ refresh: false }));
  });

  it('is a no-op for an empty value list', async () => {
    await writeLookupItems({
      esClient,
      index: TEST_INDEX,
      listId: TEST_LIST_ID,
      now: TEST_NOW,
      type: 'keyword',
      user: TEST_USER,
      values: [],
    });

    expect(esClient.bulk).not.toHaveBeenCalled();
  });

  it('propagates a bulk failure', async () => {
    (esClient.bulk as jest.Mock).mockRejectedValueOnce(new Error('bulk boom'));

    await expect(
      writeLookupItems({
        esClient,
        index: TEST_INDEX,
        listId: TEST_LIST_ID,
        now: TEST_NOW,
        type: 'keyword',
        user: TEST_USER,
        values: ['a'],
      })
    ).rejects.toThrow('bulk boom');
  });

  // An import drops the values the mapper refuses, as the shared stream's import does, and
  // nothing else: a failure that is not about the value must fail the import, or it would
  // report success with values silently missing.
  describe('with ignoreErrors (import)', () => {
    const bulkWithItem = (status: number, reason: string): void => {
      (esClient.bulk as jest.Mock).mockResolvedValueOnce({
        errors: true,
        items: [{ update: { _id: 'x', error: { reason, type: 'x' }, status } }],
        took: 1,
      });
    };
    const write = (): Promise<void> =>
      writeLookupItems({
        esClient,
        ignoreErrors: true,
        index: TEST_INDEX,
        listId: TEST_LIST_ID,
        now: TEST_NOW,
        type: 'keyword',
        user: TEST_USER,
        values: ['a'],
      });

    it('drops a value the mapper rejected (400)', async () => {
      bulkWithItem(400, 'mapper_parsing_exception');

      await expect(write()).resolves.toBeUndefined();
    });

    it.each([
      [401, 'unauthorized'],
      [403, 'forbidden'],
      [429, 'es_rejected_execution_exception'],
      [503, 'unavailable_shards_exception'],
    ])(
      'raises an item failure with status %i, which is not about the value',
      async (status, reason) => {
        bulkWithItem(status, reason);

        await expect(write()).rejects.toMatchObject({ message: reason, statusCode: status });
      }
    );
  });
});
