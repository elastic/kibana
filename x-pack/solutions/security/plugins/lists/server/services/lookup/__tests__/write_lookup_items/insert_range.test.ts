/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { writeLookupItems } from '../../write_lookup_items';

import type { EsClientMock } from './test_helpers';
import {
  RANGE_FIXTURES,
  TEST_INDEX,
  coalescedDoc,
  coalescedId,
  coalescedWindowQuery,
  createEsClientMock,
  expectedDeleteOps,
  expectedIndexCoalescedOps,
  expectedSourceOps,
  searchArg,
  searchResponse,
  sourceId,
} from './test_helpers';

describe('writeLookupItems (range types)', () => {
  let esClient: EsClientMock;

  beforeEach(() => {
    jest.clearAllMocks();
    esClient = createEsClientMock();
  });

  describe.each(RANGE_FIXTURES)('localized single-value insert: $type', (fx) => {
    it('writes the source doc with parsed bounds, then only the affected coalesced window', async () => {
      // empty index: nothing overlaps the new range
      esClient.search.mockResponseOnce(searchResponse([]));

      await writeLookupItems({
        esClient,
        index: TEST_INDEX,
        type: fx.type,
        values: [fx.single],
      });

      // 1) source doc carries verbatim value + parsed src bounds
      expect((esClient.bulk as jest.Mock).mock.calls[0][0]).toEqual({
        index: TEST_INDEX,
        operations: expectedSourceOps(fx.type, [fx.single]),
        refresh: true,
      });
      // 2) it range-queries only the coalesced intervals the new range touches, paged over a PIT
      expect(esClient.search).toHaveBeenCalledTimes(1);
      expect(searchArg(esClient, 0)._source).toEqual(['range_end', 'range_start']);
      expect(searchArg(esClient, 0).query).toEqual(coalescedWindowQuery(fx.singleBound));
      expect(esClient.openPointInTime).toHaveBeenCalledWith({
        index: TEST_INDEX,
        keep_alive: '1m',
      });
      // 3) it indexes the merged interval and deletes nothing (empty index)
      expect((esClient.bulk as jest.Mock).mock.calls[1][0]).toEqual({
        index: TEST_INDEX,
        operations: expectedIndexCoalescedOps([fx.singleBound]),
        refresh: true,
      });
      expect(esClient.bulk).toHaveBeenCalledTimes(2);
      expect(esClient.deleteByQuery).not.toHaveBeenCalled();
    });

    it('merges with an overlapping interval and removes the stale doc after indexing the merged one', async () => {
      esClient.search.mockResponseOnce(searchResponse([coalescedDoc(fx.overlapExisting)]));

      await writeLookupItems({
        esClient,
        index: TEST_INDEX,
        type: fx.type,
        values: [fx.single],
      });

      // index the merged interval first (no hole on interruption) ...
      expect((esClient.bulk as jest.Mock).mock.calls[1][0]).toEqual({
        index: TEST_INDEX,
        operations: expectedIndexCoalescedOps([fx.overlapMerged]),
        refresh: true,
      });
      // ... then delete the now-stale pulled interval
      expect((esClient.bulk as jest.Mock).mock.calls[2][0]).toEqual({
        index: TEST_INDEX,
        operations: expectedDeleteOps([coalescedId(fx.overlapExisting)]),
        refresh: true,
      });
      expect(esClient.bulk).toHaveBeenCalledTimes(3);
    });

    it('is idempotent when the value is already covered (re-index same id, delete nothing)', async () => {
      // the overlapping interval is exactly the new bound: merge is a no-op
      esClient.search.mockResponseOnce(searchResponse([coalescedDoc(fx.singleBound)]));

      await writeLookupItems({
        esClient,
        index: TEST_INDEX,
        type: fx.type,
        values: [fx.single],
      });

      expect((esClient.bulk as jest.Mock).mock.calls[1][0]).toEqual({
        index: TEST_INDEX,
        operations: expectedIndexCoalescedOps([fx.singleBound]),
        refresh: true,
      });
      // same id in the result, so no stale delete bulk is issued
      expect(esClient.bulk).toHaveBeenCalledTimes(2);
    });
  });

  describe.each(RANGE_FIXTURES)(
    'batch insert (import) rebuilds the whole projection: $type',
    (fx) => {
      it('writes all source docs then rebuilds coalesced from every source', async () => {
        esClient.search.mockResponseOnce(
          searchResponse(fx.batch.map((value) => ({ _id: sourceId(value), _source: { value } })))
        );

        await writeLookupItems({
          esClient,
          index: TEST_INDEX,
          type: fx.type,
          values: fx.batch,
        });

        // all sources in one bulk
        expect((esClient.bulk as jest.Mock).mock.calls[0][0]).toEqual({
          index: TEST_INDEX,
          operations: expectedSourceOps(fx.type, fx.batch),
          refresh: true,
        });
        // full rebuild reads every source, paged over a PIT ...
        expect(searchArg(esClient, 0)._source).toEqual(['value']);
        expect(searchArg(esClient, 0).query).toEqual({ term: { kind: 'source' } });
        // ... wipes the old coalesced projection ...
        expect(esClient.deleteByQuery).toHaveBeenCalledWith({
          conflicts: 'proceed',
          index: TEST_INDEX,
          query: { term: { kind: 'coalesced' } },
          refresh: true,
        });
        // ... and writes the recomputed disjoint intervals
        expect((esClient.bulk as jest.Mock).mock.calls[1][0]).toEqual({
          index: TEST_INDEX,
          operations: expectedIndexCoalescedOps(fx.batchCoalesced),
          refresh: true,
        });
      });
    }
  );

  describe('range edge cases', () => {
    const [ipFx] = RANGE_FIXTURES;

    it('a batch that fully coalesces to nothing wipes coalesced without re-indexing', async () => {
      // unparseable values: source docs are written, but there is nothing to coalesce
      esClient.search.mockResponseOnce(
        searchResponse(
          ['garbage-1', 'garbage-2'].map((value) => ({ _id: sourceId(value), _source: { value } }))
        )
      );

      await writeLookupItems({
        esClient,
        index: TEST_INDEX,
        type: 'ip_range',
        values: ['garbage-1', 'garbage-2'],
      });

      expect(esClient.deleteByQuery).toHaveBeenCalledTimes(1);
      // only the source bulk ran; no coalesced index bulk
      expect(esClient.bulk).toHaveBeenCalledTimes(1);
    });

    it('a single unparseable value falls back to a full rebuild (not the localized path)', async () => {
      esClient.search.mockResponseOnce(
        searchResponse([{ _id: sourceId('garbage'), _source: { value: 'garbage' } }])
      );

      await writeLookupItems({
        esClient,
        index: TEST_INDEX,
        type: 'ip_range',
        values: ['garbage'],
      });

      // the tell-tale of the rebuild path is deleteByQuery; the localized path never calls it
      expect(esClient.deleteByQuery).toHaveBeenCalledTimes(1);
    });

    it('propagates a source-write failure', async () => {
      (esClient.bulk as jest.Mock).mockRejectedValueOnce(new Error('source boom'));

      await expect(
        writeLookupItems({ esClient, index: TEST_INDEX, type: 'ip_range', values: [ipFx.single] })
      ).rejects.toThrow('source boom');
    });

    it('propagates the overlap-query failure on a localized insert', async () => {
      esClient.search.mockRejectedValueOnce(new Error('search boom'));

      await expect(
        writeLookupItems({ esClient, index: TEST_INDEX, type: 'ip_range', values: [ipFx.single] })
      ).rejects.toThrow('search boom');
    });

    it('propagates a failure while replacing the coalesced window', async () => {
      (esClient.bulk as jest.Mock)
        .mockResolvedValueOnce({}) // source bulk ok
        .mockRejectedValueOnce(new Error('replace boom')); // coalesced index bulk fails
      esClient.search.mockResponseOnce(searchResponse([]));

      await expect(
        writeLookupItems({ esClient, index: TEST_INDEX, type: 'ip_range', values: [ipFx.single] })
      ).rejects.toThrow('replace boom');
    });
  });
});
