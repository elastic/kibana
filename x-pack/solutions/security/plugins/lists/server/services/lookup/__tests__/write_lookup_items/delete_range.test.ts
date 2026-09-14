/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deleteLookupItemByValue } from '../../write_lookup_items';

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
  searchArg,
  searchResponse,
  sourceBoundDoc,
  sourceId,
  sourceWindowQuery,
} from './test_helpers';

describe('deleteLookupItemByValue (range types)', () => {
  let esClient: EsClientMock;

  beforeEach(() => {
    jest.clearAllMocks();
    esClient = createEsClientMock();
  });

  describe.each(RANGE_FIXTURES)('localized delete that fragments: $type', (fx) => {
    it('re-coalesces only the sources inside the covered interval and replaces it with the fragments', async () => {
      esClient.search
        .mockResponseOnce(searchResponse([coalescedDoc(fx.deleteCovering)])) // covering interval
        .mockResponseOnce(searchResponse(fx.deleteRemaining.map(sourceBoundDoc))); // sources left in it

      await deleteLookupItemByValue({
        esClient,
        index: TEST_INDEX,
        type: fx.type,
        value: fx.deleteBridge,
      });

      // 1) the source doc is removed by its authored-value id
      expect(esClient.delete).toHaveBeenCalledWith({
        id: sourceId(fx.deleteBridge),
        index: TEST_INDEX,
        refresh: true,
      });
      // 2) it finds the one coalesced interval that covered the removed range ...
      expect(searchArg(esClient, 0)._source).toEqual(['range_end', 'range_start']);
      expect(searchArg(esClient, 0).query).toEqual(coalescedWindowQuery(fx.deleteBridgeBound));
      // 3) ... then reads only the sources bounded by that interval
      expect(searchArg(esClient, 1)._source).toEqual(['src_end', 'src_start']);
      expect(searchArg(esClient, 1).query).toEqual(sourceWindowQuery(fx.deleteCovering));
      // 4) indexes the fragments, then deletes the stale covering interval
      expect((esClient.bulk as jest.Mock).mock.calls[0][0]).toEqual({
        index: TEST_INDEX,
        operations: expectedIndexCoalescedOps(fx.deleteFragments),
        refresh: true,
      });
      expect((esClient.bulk as jest.Mock).mock.calls[1][0]).toEqual({
        index: TEST_INDEX,
        operations: expectedDeleteOps([coalescedId(fx.deleteCovering)]),
        refresh: true,
      });
      expect(esClient.bulk).toHaveBeenCalledTimes(2);
    });
  });

  describe('range delete edge cases', () => {
    const [ipFx] = RANGE_FIXTURES;

    it('removes the coalesced interval entirely when no source remains inside it', async () => {
      esClient.search
        .mockResponseOnce(searchResponse([coalescedDoc(ipFx.deleteCovering)]))
        .mockResponseOnce(searchResponse([])); // nothing left in the window

      await deleteLookupItemByValue({
        esClient,
        index: TEST_INDEX,
        type: 'ip_range',
        value: ipFx.deleteBridge,
      });

      // no fragments to index; only the stale covering interval is deleted
      expect(esClient.bulk).toHaveBeenCalledTimes(1);
      expect((esClient.bulk as jest.Mock).mock.calls[0][0]).toEqual({
        index: TEST_INDEX,
        operations: expectedDeleteOps([coalescedId(ipFx.deleteCovering)]),
        refresh: true,
      });
    });

    it('does nothing to the projection when the value was not covered by any interval', async () => {
      esClient.search.mockResponseOnce(searchResponse([])); // covering query finds nothing

      await deleteLookupItemByValue({
        esClient,
        index: TEST_INDEX,
        type: 'ip_range',
        value: ipFx.deleteBridge,
      });

      expect(esClient.search).toHaveBeenCalledTimes(1); // only the covering query, no source read
      expect(esClient.bulk).not.toHaveBeenCalled();
      expect(esClient.deleteByQuery).not.toHaveBeenCalled();
    });

    it('falls back to a full rebuild when the deleted value does not parse', async () => {
      esClient.search.mockResponseOnce(
        searchResponse([{ _id: sourceId('10.0.0.0/24'), _source: { value: '10.0.0.0/24' } }])
      );

      await deleteLookupItemByValue({
        esClient,
        index: TEST_INDEX,
        type: 'ip_range',
        value: 'not-an-ip',
      });

      expect(esClient.delete).toHaveBeenCalledWith({
        id: sourceId('not-an-ip'),
        index: TEST_INDEX,
        refresh: true,
      });
      // deleteByQuery is the tell-tale of the rebuild path
      expect(esClient.deleteByQuery).toHaveBeenCalledTimes(1);
    });

    it('propagates a failure from the covering-interval query', async () => {
      esClient.search.mockRejectedValueOnce(new Error('covering boom'));

      await expect(
        deleteLookupItemByValue({
          esClient,
          index: TEST_INDEX,
          type: 'ip_range',
          value: ipFx.deleteBridge,
        })
      ).rejects.toThrow('covering boom');
    });

    it('recomputes even if removing the source doc fails (the delete error is swallowed)', async () => {
      (esClient.delete as jest.Mock).mockRejectedValueOnce(new Error('source delete boom'));
      esClient.search.mockResponseOnce(searchResponse([])); // value not covered, so a clean no-op after

      await expect(
        deleteLookupItemByValue({
          esClient,
          index: TEST_INDEX,
          type: 'ip_range',
          value: ipFx.deleteBridge,
        })
      ).resolves.toBeUndefined();
      // the swallowed delete did not stop the recompute from running
      expect(esClient.search).toHaveBeenCalledTimes(1);
    });
  });
});
