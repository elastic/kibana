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
  TEST_RUN_ID,
  coalescedDoc,
  createEsClientMock,
  expectedDeleteOps,
  expectedIndexCoalescedOps,
  searchResponse,
  sourceBoundDoc,
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
    // searches beyond the ones a test sequences (the coverage check after a window) see
    // an empty page, which is a covered, empty region
    esClient.search.mockResolvedValue({ hits: { hits: [] } } as never);
  });

  it('is a no-op when there is no __state doc (404)', async () => {
    (esClient.get as jest.Mock).mockRejectedValueOnce({ meta: { statusCode: 404 } });

    await expect(
      reconcileCoalesced({ esClient, index: TEST_INDEX, runId: TEST_RUN_ID, type: 'ip_range' })
    ).resolves.toBe('noop');
    expect(esClient.search).not.toHaveBeenCalled();
    expect(esClient.bulk).not.toHaveBeenCalled();
  });

  it('rethrows a non-404 __state read error instead of masking it as "nothing to do"', async () => {
    (esClient.get as jest.Mock).mockRejectedValueOnce({ meta: { statusCode: 403 } });

    await expect(
      reconcileCoalesced({ esClient, index: TEST_INDEX, runId: TEST_RUN_ID, type: 'ip_range' })
    ).rejects.toEqual({ meta: { statusCode: 403 } });
  });

  it('is a no-op when the coalesced version already matches the source version', async () => {
    (esClient.get as jest.Mock).mockResolvedValueOnce(stateDoc(3, 3));

    await expect(
      reconcileCoalesced({ esClient, index: TEST_INDEX, runId: TEST_RUN_ID, type: 'ip_range' })
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
      .mockResponseOnce(searchResponse([])) // highest sequence number: none recorded
      .mockResponseOnce(searchResponse([])) // coalesced overlapping the window: none yet
      .mockResponseOnce(searchResponse([sourceBoundDoc(window)])); // sources in the widened region

    const result = await reconcileCoalesced({
      esClient,
      index: TEST_INDEX,
      runId: TEST_RUN_ID,
      type: 'ip_range',
    });

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
      .mockResponseOnce(searchResponse([])) // highest sequence number: none recorded
      .mockResponseOnce(searchResponse([]))
      .mockResponseOnce(searchResponse([sourceBoundDoc(window)]));
    (esClient.update as jest.Mock).mockRejectedValueOnce(new Error('version conflict'));

    await expect(
      reconcileCoalesced({ esClient, index: TEST_INDEX, runId: TEST_RUN_ID, type: 'ip_range' })
    ).resolves.toBe('stale');
  });

  it('rebuilds the whole list from its sources when a dirty state has no markers', async () => {
    (esClient.get as jest.Mock)
      .mockResolvedValueOnce(stateDoc(2, 0))
      .mockResolvedValueOnce(stateDoc(2, 2));
    esClient.search
      .mockResponseOnce(searchResponse([])) // no dirty markers
      .mockResponseOnce(searchResponse([])) // highest sequence number: none recorded
      .mockResponseOnce(
        searchResponse([sourceBoundDoc({ range_end: '10.0.0.255', range_start: '10.0.0.0' })])
      ); // all sources, streamed in start order

    const result = await reconcileCoalesced({
      esClient,
      index: TEST_INDEX,
      runId: TEST_RUN_ID,
      type: 'ip_range',
    });

    expect(result).toBe('clean');
    // the whole list is recomputed from its one source (10.0.0.0/24 -> 10.0.0.0-10.0.0.255)
    expect(bulkCalls()).toContainEqual({
      index: TEST_INDEX,
      operations: expectedIndexCoalescedOps([{ range_end: '10.0.0.255', range_start: '10.0.0.0' }]),
      refresh: true,
    });
    // stale intervals of earlier runs go in one delete by query, after the new ones exist
    expect(esClient.deleteByQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        index: TEST_INDEX,
        query: {
          bool: {
            filter: [{ term: { kind: 'coalesced' } }],
            must_not: [{ term: { built_by: TEST_RUN_ID } }],
          },
        },
        refresh: true,
      })
    );
    const [bulkOrder] = (esClient.bulk as jest.Mock).mock.invocationCallOrder;
    const [deleteOrder] = (esClient.deleteByQuery as jest.Mock).mock.invocationCallOrder;
    expect(bulkOrder).toBeLessThan(deleteOrder);
  });

  // A source written after the markers were drained is not lost, only not yet processed:
  // its writer leaves a marker and bumps the version. The coverage check must leave it to
  // the next pass rather than fail the run. A source written before the drain with no
  // interval is a real loss and still fails the run.
  describe('a source written while the run is in progress', () => {
    const window = { range_end: '10.0.1.255', range_start: '10.0.1.0' };
    const late = { range_end: '10.0.2.255', range_start: '10.0.2.0' };
    const sequenced = (lateSeqNo: number): void => {
      (esClient.get as jest.Mock)
        .mockResolvedValueOnce(stateDoc(2, 1)) // dirty
        .mockResolvedValueOnce(stateDoc(3, 2)); // post-clean re-check: the late writer bumped it
      esClient.search
        .mockResponseOnce(searchResponse([{ _id: 'dirty:m1', _source: window }])) // markers
        .mockResponseOnce(searchResponse([{ _id: 'any', _source: {}, sort: [7] }])) // highest _seq_no: 7
        .mockResponseOnce(searchResponse([])) // coalesced overlapping the window: none
        .mockResponseOnce(searchResponse([sourceBoundDoc(window)])) // sources in the region
        .mockResponseOnce(
          searchResponse([
            { ...sourceBoundDoc(window), sort: ['10.0.1.0', 5] },
            { ...sourceBoundDoc(late), sort: ['10.0.2.0', lateSeqNo] }, // the concurrent write
          ])
        ) // coverage check: sources in the widened window
        .mockResponseOnce(searchResponse([coalescedDoc(window)])); // coverage check: intervals
    };

    it('is left to the next pass when it arrived after the markers were drained', async () => {
      sequenced(9);

      await expect(
        reconcileCoalesced({ esClient, index: TEST_INDEX, runId: TEST_RUN_ID, type: 'ip_range' })
      ).resolves.toBe('stale');
    });

    it('fails the run when it existed before the drain and no interval covers it', async () => {
      sequenced(6);

      await expect(
        reconcileCoalesced({ esClient, index: TEST_INDEX, runId: TEST_RUN_ID, type: 'ip_range' })
      ).rejects.toThrow('does not cover 1 source(s); first: 10.0.2.0-10.0.2.255');
    });
  });
});
