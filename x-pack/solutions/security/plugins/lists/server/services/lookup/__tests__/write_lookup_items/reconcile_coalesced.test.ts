/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

import { STATE_DOC_ID, reconcileCoalesced } from '../../write_lookup_items';

import type { EsClientMock } from './test_helpers';
import {
  TEST_INDEX,
  coalescedDoc,
  coalescedId,
  createEsClientMock,
  expectedDeleteOps,
  expectedIndexCoalescedOps,
  searchResponse,
  sourceBoundDoc,
  sourceId,
} from './test_helpers';

// The reconcile task is the single writer of coalesced docs. It reads the __state
// version, drains the dirty markers, re-coalesces each marked region (or rebuilds the
// whole list when a dirty state carries no markers), then records the list clean under
// an optimistic guard on __state's _seq_no.
describe('reconcileCoalesced', () => {
  let esClient: EsClientMock;

  const stateDoc = (source_version: number, coalesced_version: number): estypes.GetResponse =>
    ({
      _id: STATE_DOC_ID,
      _index: TEST_INDEX,
      _primary_term: 1,
      _seq_no: 5,
      _source: { coalesced_version, source_version, status: 'dirty' },
      found: true,
    } as unknown as estypes.GetResponse);

  const bulkCalls = (): unknown[] => (esClient.bulk as jest.Mock).mock.calls.map((c) => c[0]);

  beforeEach(() => {
    jest.clearAllMocks();
    esClient = createEsClientMock();
    esClient.openPointInTime.mockResolvedValue({ id: 'pit' } as never);
  });

  it('is a no-op when there is no __state doc (404)', async () => {
    (esClient.get as jest.Mock).mockRejectedValueOnce({ meta: { statusCode: 404 } });

    await expect(
      reconcileCoalesced({ esClient, index: TEST_INDEX, type: 'ip_range' })
    ).resolves.toBe('noop');
    expect(esClient.search).not.toHaveBeenCalled();
    expect(esClient.bulk).not.toHaveBeenCalled();
  });

  it('rethrows a non-404 __state read error instead of masking it as "nothing to do"', async () => {
    (esClient.get as jest.Mock).mockRejectedValueOnce({ meta: { statusCode: 403 } });

    await expect(
      reconcileCoalesced({ esClient, index: TEST_INDEX, type: 'ip_range' })
    ).rejects.toEqual({ meta: { statusCode: 403 } });
  });

  it('is a no-op when the coalesced version already matches the source version', async () => {
    (esClient.get as jest.Mock).mockResolvedValueOnce(stateDoc(3, 3));

    await expect(
      reconcileCoalesced({ esClient, index: TEST_INDEX, type: 'ip_range' })
    ).resolves.toBe('noop');
    expect(esClient.search).not.toHaveBeenCalled();
  });

  it('re-coalesces a marked region from its sources and records the list clean', async () => {
    const window = { range_end: '10.0.0.255', range_start: '10.0.0.0' };
    (esClient.get as jest.Mock)
      .mockResolvedValueOnce(stateDoc(1, 0)) // dirty: source ahead of coalesced
      .mockResolvedValueOnce(stateDoc(1, 1)); // post-clean re-check: caught up
    esClient.search
      .mockResponseOnce(searchResponse([{ _id: 'dirty:m1', _source: window }])) // markers
      .mockResponseOnce(searchResponse([])) // coalesced overlapping the window: none yet
      .mockResponseOnce(searchResponse([sourceBoundDoc(window)])); // sources in the widened region

    const result = await reconcileCoalesced({ esClient, index: TEST_INDEX, type: 'ip_range' });

    expect(result).toBe('clean');
    // indexes the recomputed interval ...
    expect(bulkCalls()).toContainEqual({
      index: TEST_INDEX,
      operations: expectedIndexCoalescedOps([window]),
      refresh: true,
    });
    // ... drains the marker it processed ...
    expect(bulkCalls()).toContainEqual({
      index: TEST_INDEX,
      operations: expectedDeleteOps(['dirty:m1']),
      refresh: true,
    });
    // ... and records clean under the _seq_no guard
    expect(esClient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        doc: { coalesced_version: 1, status: 'clean' },
        id: STATE_DOC_ID,
        if_primary_term: 1,
        if_seq_no: 5,
      })
    );
  });

  it('returns "stale" when a concurrent write bumped the version during the run (guard fails)', async () => {
    const window = { range_end: '10.0.0.255', range_start: '10.0.0.0' };
    (esClient.get as jest.Mock).mockResolvedValueOnce(stateDoc(1, 0));
    esClient.search
      .mockResponseOnce(searchResponse([{ _id: 'dirty:m1', _source: window }]))
      .mockResponseOnce(searchResponse([]))
      .mockResponseOnce(searchResponse([sourceBoundDoc(window)]));
    (esClient.update as jest.Mock).mockRejectedValueOnce(new Error('version conflict'));

    await expect(
      reconcileCoalesced({ esClient, index: TEST_INDEX, type: 'ip_range' })
    ).resolves.toBe('stale');
  });

  it('rebuilds the whole list from its sources when a dirty state has no markers', async () => {
    (esClient.get as jest.Mock)
      .mockResolvedValueOnce(stateDoc(2, 0))
      .mockResolvedValueOnce(stateDoc(2, 2));
    esClient.search
      .mockResponseOnce(searchResponse([])) // no dirty markers
      .mockResponseOnce(
        searchResponse([{ _id: sourceId('10.0.0.0/24'), _source: { value: '10.0.0.0/24' } }])
      ) // all sources (by value)
      .mockResponseOnce(searchResponse([])); // existing coalesced docs to reconcile against

    const result = await reconcileCoalesced({ esClient, index: TEST_INDEX, type: 'ip_range' });

    expect(result).toBe('clean');
    // the whole list is recomputed from its one source (10.0.0.0/24 -> 10.0.0.0-10.0.0.255)
    expect(bulkCalls()).toContainEqual({
      index: TEST_INDEX,
      operations: expectedIndexCoalescedOps([{ range_end: '10.0.0.255', range_start: '10.0.0.0' }]),
      refresh: true,
    });
    // a rebuild never uses deleteByQuery; it indexes new before deleting stale
    expect(esClient.deleteByQuery).not.toHaveBeenCalled();
  });

  it('deletes coalesced intervals the rebuild no longer produces (index new before delete stale)', async () => {
    const stale = { range_end: '9.9.9.9', range_start: '9.9.9.0' };
    (esClient.get as jest.Mock)
      .mockResolvedValueOnce(stateDoc(2, 0))
      .mockResolvedValueOnce(stateDoc(2, 2));
    esClient.search
      .mockResponseOnce(searchResponse([])) // no markers -> rebuild
      .mockResponseOnce(
        searchResponse([{ _id: sourceId('10.0.0.0/24'), _source: { value: '10.0.0.0/24' } }])
      )
      .mockResponseOnce(searchResponse([coalescedDoc(stale)])); // a stale coalesced doc not in the result

    await reconcileCoalesced({ esClient, index: TEST_INDEX, type: 'ip_range' });

    expect(bulkCalls()).toContainEqual({
      index: TEST_INDEX,
      operations: expectedDeleteOps([coalescedId(stale)]),
      refresh: true,
    });
  });
});
