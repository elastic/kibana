/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { STATE_DOC_ID, deleteLookupItemByValue } from '../../write_lookup_items';

import type { EsClientMock } from './test_helpers';
import {
  RANGE_FIXTURES,
  TEST_INDEX,
  createEsClientMock,
  expectedDirtyMarkerOps,
  sourceId,
} from './test_helpers';

// A delete never coalesces inline either. It removes the one source doc by its id,
// bumps the source version on __state (marking the cache dirty), and journals a dirty
// marker for the removed value's window. The reconcile task later re-coalesces that
// region from the sources that remain, which is where a fragmenting delete is resolved.
describe('deleteLookupItemByValue (range types)', () => {
  let esClient: EsClientMock;

  const bulkCall = (n: number): { index: string; operations: unknown[]; refresh: unknown } =>
    (esClient.bulk as jest.Mock).mock.calls[n][0];

  beforeEach(() => {
    jest.clearAllMocks();
    esClient = createEsClientMock();
  });

  describe.each(RANGE_FIXTURES)('localized delete: $type', (fx) => {
    it('removes the source by id, marks state dirty, and journals the removed window', async () => {
      await deleteLookupItemByValue({
        esClient,
        index: TEST_INDEX,
        type: fx.type,
        value: fx.deleteBridge,
      });

      // 1) the source doc is removed by its content-addressed id
      expect(esClient.delete).toHaveBeenCalledWith({
        id: sourceId(fx.deleteBridge),
        index: TEST_INDEX,
        refresh: true,
      });
      // 2) __state is bumped dirty
      expect(esClient.update).toHaveBeenCalledTimes(1);
      expect(esClient.update).toHaveBeenCalledWith(
        expect.objectContaining({ id: STATE_DOC_ID, index: TEST_INDEX, scripted_upsert: true })
      );
      // 3) one dirty marker for the removed value's range
      expect(bulkCall(0)).toEqual({
        index: TEST_INDEX,
        operations: expectedDirtyMarkerOps([fx.deleteBridgeBound]),
        refresh: true,
      });
      // no inline recompute: nothing is read, nothing coalesced is written here
      expect(esClient.search).not.toHaveBeenCalled();
      expect(esClient.deleteByQuery).not.toHaveBeenCalled();
      expect(esClient.bulk).toHaveBeenCalledTimes(1);
    });
  });

  describe('range delete edge cases', () => {
    const [ipFx] = RANGE_FIXTURES;

    it('removes the source but marks nothing dirty when the value does not parse', async () => {
      // an unparseable value contributed no interval, so no re-coalesce is owed
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
      expect(esClient.update).not.toHaveBeenCalled();
      expect(esClient.bulk).not.toHaveBeenCalled();
    });

    it('still marks dirty even if removing the source doc fails (the delete error is swallowed)', async () => {
      (esClient.delete as jest.Mock).mockRejectedValueOnce(new Error('source delete boom'));

      await expect(
        deleteLookupItemByValue({
          esClient,
          index: TEST_INDEX,
          type: 'ip_range',
          value: ipFx.deleteBridge,
        })
      ).resolves.toBeUndefined();

      // the swallowed delete did not stop the dirty-marking from running
      expect(esClient.update).toHaveBeenCalledTimes(1);
      expect(esClient.bulk).toHaveBeenCalledTimes(1);
    });

    it('propagates a failure marking the state dirty', async () => {
      (esClient.update as jest.Mock).mockRejectedValueOnce(new Error('state boom'));

      await expect(
        deleteLookupItemByValue({
          esClient,
          index: TEST_INDEX,
          type: 'ip_range',
          value: ipFx.deleteBridge,
        })
      ).rejects.toThrow('state boom');
    });
  });
});
