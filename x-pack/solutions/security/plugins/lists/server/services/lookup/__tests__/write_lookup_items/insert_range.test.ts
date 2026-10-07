/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { STATE_DOC_ID, writeLookupItems } from '../../write_lookup_items';

import type { EsClientMock } from './test_helpers';
import {
  RANGE_FIXTURES,
  TEST_INDEX,
  TEST_LIST_ID,
  TEST_NOW,
  TEST_USER,
  createEsClientMock,
  expectedDirtyMarkerOps,
  expectedDirtyWindows,
  expectedSourceOps,
} from './test_helpers';

// A write never coalesces inline. It records the sources, bumps the source version
// on the __state doc (marking the coalesced cache dirty), and journals one dirty
// region marker per touched window. The background reconcile task does the merge;
// the write path itself never reads a window or writes a coalesced doc.
describe('writeLookupItems (range types)', () => {
  let esClient: EsClientMock;

  const bulkCall = (n: number): { index: string; operations: unknown[]; refresh: unknown } =>
    (esClient.bulk as jest.Mock).mock.calls[n][0];

  beforeEach(() => {
    jest.clearAllMocks();
    esClient = createEsClientMock();
  });

  describe.each(RANGE_FIXTURES)('single-value insert: $type', (fx) => {
    it('writes the source doc, marks state dirty, and journals one dirty marker', async () => {
      await writeLookupItems({
        esClient,
        index: TEST_INDEX,
        listId: TEST_LIST_ID,
        now: TEST_NOW,
        type: fx.type,
        user: TEST_USER,
        values: [fx.single],
      });

      // 1) source doc carries the verbatim value plus its parsed bounds
      expect(bulkCall(0)).toEqual({
        index: TEST_INDEX,
        operations: expectedSourceOps(fx.type, [fx.single]),
        refresh: 'wait_for',
      });
      // 2) __state is bumped through the scripted upsert (retry_on_conflict for concurrent writers)
      expect(esClient.update).toHaveBeenCalledTimes(1);
      expect(esClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: STATE_DOC_ID,
          index: TEST_INDEX,
          retry_on_conflict: 50,
          scripted_upsert: true,
        })
      );
      // 3) one dirty marker for the value's window
      expect(bulkCall(1)).toEqual({
        index: TEST_INDEX,
        operations: expectedDirtyMarkerOps([fx.singleBound]),
        refresh: true,
      });
      // coalescing is deferred to the task: the write reads nothing and writes no coalesced doc
      expect(esClient.search).not.toHaveBeenCalled();
      expect(esClient.openPointInTime).not.toHaveBeenCalled();
      expect(esClient.deleteByQuery).not.toHaveBeenCalled();
      expect(esClient.bulk).toHaveBeenCalledTimes(2);
    });
  });

  describe.each(RANGE_FIXTURES)('batch import: $type', (fx) => {
    it('writes every source once, marks dirty once, and journals the merged windows', async () => {
      await writeLookupItems({
        esClient,
        index: TEST_INDEX,
        listId: TEST_LIST_ID,
        now: TEST_NOW,
        type: fx.type,
        user: TEST_USER,
        values: fx.batch,
      });

      expect(bulkCall(0)).toEqual({
        index: TEST_INDEX,
        operations: expectedSourceOps(fx.type, fx.batch),
        refresh: 'wait_for',
      });
      expect(esClient.update).toHaveBeenCalledTimes(1);
      // the batch's bounds are merged into windows first, so a contiguous import is a
      // few markers, not one per value
      expect(bulkCall(1)).toEqual({
        index: TEST_INDEX,
        operations: expectedDirtyMarkerOps(expectedDirtyWindows(fx.type, fx.batch)),
        refresh: true,
      });
      expect(esClient.search).not.toHaveBeenCalled();
    });
  });

  describe('range edge cases', () => {
    const [ipFx] = RANGE_FIXTURES;

    it('retries the shared state update when a concurrent writer conflicts, then succeeds', async () => {
      const conflict = Object.assign(new Error('version conflict'), { meta: { statusCode: 409 } });
      (esClient.update as jest.Mock)
        .mockRejectedValueOnce(conflict)
        .mockRejectedValueOnce(conflict)
        .mockResolvedValueOnce({} as never);

      await writeLookupItems({
        esClient,
        index: TEST_INDEX,
        listId: TEST_LIST_ID,
        now: TEST_NOW,
        type: 'ip_range',
        user: TEST_USER,
        values: ['10.0.0.0/24'],
      });

      expect(esClient.update).toHaveBeenCalledTimes(3);
      expect(esClient.bulk).toHaveBeenCalledTimes(2); // sources, then the dirty marker
    });

    it('fails the write when the state update keeps conflicting', async () => {
      const conflict = Object.assign(new Error('version conflict'), { meta: { statusCode: 409 } });
      (esClient.update as jest.Mock).mockRejectedValue(conflict);

      await expect(
        writeLookupItems({
          esClient,
          index: TEST_INDEX,
          listId: TEST_LIST_ID,
          now: TEST_NOW,
          type: 'ip_range',
          user: TEST_USER,
          values: ['10.0.0.0/24'],
        })
      ).rejects.toBe(conflict);
      expect(esClient.update).toHaveBeenCalledTimes(8);
    });

    it('rejects an unparseable value with 400 and writes nothing, as the shared stream does', async () => {
      await expect(
        writeLookupItems({
          esClient,
          index: TEST_INDEX,
          listId: TEST_LIST_ID,
          now: TEST_NOW,
          type: 'ip_range',
          user: TEST_USER,
          values: ['garbage-1', 'garbage-2'],
        })
      ).rejects.toMatchObject({
        message: 'list item invalid: "garbage-1" is not a valid ip_range value',
      });

      expect(esClient.bulk).not.toHaveBeenCalled();
      expect(esClient.update).not.toHaveBeenCalled();
    });

    it('drops unparseable values on import and marks nothing dirty when none parsed', async () => {
      // the shared stream's import drops the lines its mapper rejects; with no bound,
      // no interval changed and no re-coalesce is owed
      await writeLookupItems({
        esClient,
        ignoreErrors: true,
        index: TEST_INDEX,
        listId: TEST_LIST_ID,
        now: TEST_NOW,
        type: 'ip_range',
        user: TEST_USER,
        values: ['garbage-1', 'garbage-2'],
      });

      expect(esClient.bulk).not.toHaveBeenCalled();
      expect(esClient.update).not.toHaveBeenCalled();
      expect(esClient.search).not.toHaveBeenCalled();
    });

    it('does nothing for an empty values list', async () => {
      await writeLookupItems({
        esClient,
        index: TEST_INDEX,
        listId: TEST_LIST_ID,
        now: TEST_NOW,
        type: 'ip_range',
        user: TEST_USER,
        values: [],
      });

      expect(esClient.bulk).not.toHaveBeenCalled();
      expect(esClient.update).not.toHaveBeenCalled();
    });

    it('propagates a source-write failure', async () => {
      (esClient.bulk as jest.Mock).mockRejectedValueOnce(new Error('source boom'));

      await expect(
        writeLookupItems({
          esClient,
          index: TEST_INDEX,
          listId: TEST_LIST_ID,
          now: TEST_NOW,
          type: 'ip_range',
          user: TEST_USER,
          values: [ipFx.single],
        })
      ).rejects.toThrow('source boom');
    });

    it('propagates a failure marking the state dirty', async () => {
      (esClient.update as jest.Mock).mockRejectedValueOnce(new Error('state boom'));

      await expect(
        writeLookupItems({
          esClient,
          index: TEST_INDEX,
          listId: TEST_LIST_ID,
          now: TEST_NOW,
          type: 'ip_range',
          user: TEST_USER,
          values: [ipFx.single],
        })
      ).rejects.toThrow('state boom');
    });
  });
});
