/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  STATE_DOC_ID,
  deleteAuthoredLookupItem,
  deleteLookupItemByValue,
} from '../../write_lookup_items';

import type { EsClientMock } from './test_helpers';
import {
  TEST_INDEX,
  TEST_LIST_ID,
  createEsClientMock,
  expectedDirtyMarkerOps,
  searchResponse,
  sourceBoundDoc,
  sourceId,
} from './test_helpers';

// Delete by value on a range list has the shared stream's meaning: the value is an
// address (or number, or instant), and every stored range that contains it is removed,
// found by a `term` on the range field, then deleted by the same query. Nothing is
// coalesced inline: each removed range's region gets a dirty marker and the source
// version is bumped, and the reconcile task re-coalesces from the sources that remain.
describe('deleteLookupItemByValue (range types)', () => {
  let esClient: EsClientMock;

  const containing = (value: string): unknown => ({
    bool: { filter: [{ term: { kind: 'source' } }, { term: { src_range: value } }] },
  });
  const bulkCall = (n: number): { index: string; operations: unknown[]; refresh: unknown } =>
    (esClient.bulk as jest.Mock).mock.calls[n][0];

  beforeEach(() => {
    jest.clearAllMocks();
    esClient = createEsClientMock();
  });

  it('removes every range containing the address, marks their regions dirty, and returns them', async () => {
    const a = { range_end: '10.0.0.255', range_start: '10.0.0.0' };
    const b = { range_end: '10.0.1.255', range_start: '10.0.0.128' };
    esClient.search.mockResponseOnce(searchResponse([sourceBoundDoc(a), sourceBoundDoc(b)]));

    const deleted = await deleteLookupItemByValue({
      esClient,
      index: TEST_INDEX,
      listId: TEST_LIST_ID,
      type: 'ip_range',
      value: '10.0.0.200',
    });

    // 1) the containing ranges are found with the shared stream's query shape
    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({ index: TEST_INDEX, query: containing('10.0.0.200') })
    );
    // 2) and deleted by the same query, refreshed so the caller's next read sees it
    expect(esClient.deleteByQuery).toHaveBeenCalledWith({
      conflicts: 'proceed',
      index: TEST_INDEX,
      query: containing('10.0.0.200'),
      refresh: true,
    });
    // 3) one dirty marker spanning the removed ranges (they overlap, so they merge)
    expect(bulkCall(0)).toEqual({
      index: TEST_INDEX,
      operations: expectedDirtyMarkerOps([{ range_end: '10.0.1.255', range_start: '10.0.0.0' }]),
      refresh: true,
    });
    // 4) __state is bumped dirty
    expect(esClient.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: STATE_DOC_ID, index: TEST_INDEX, scripted_upsert: true })
    );
    // 5) the removed documents come back for the response
    expect(deleted.map((d) => d.source)).toEqual([
      { src_end: a.range_end, src_start: a.range_start },
      { src_end: b.range_end, src_start: b.range_start },
    ]);
    expect(esClient.delete).not.toHaveBeenCalled();
  });

  it('works the same on a numeric range list', async () => {
    esClient.search.mockResponseOnce(
      searchResponse([sourceBoundDoc({ range_end: '10', range_start: '1' })])
    );

    const deleted = await deleteLookupItemByValue({
      esClient,
      index: TEST_INDEX,
      listId: TEST_LIST_ID,
      type: 'integer_range',
      value: '5',
    });

    expect(esClient.deleteByQuery).toHaveBeenCalledWith(
      expect.objectContaining({ query: containing('5') })
    );
    expect(bulkCall(0).operations).toEqual(
      expectedDirtyMarkerOps([{ range_end: '10', range_start: '1' }])
    );
    expect(deleted).toHaveLength(1);
  });

  it('returns nothing and changes nothing when no range contains the value', async () => {
    esClient.search.mockResponseOnce(searchResponse([]));

    const deleted = await deleteLookupItemByValue({
      esClient,
      index: TEST_INDEX,
      listId: TEST_LIST_ID,
      type: 'ip_range',
      value: '192.168.1.1',
    });

    expect(deleted).toEqual([]);
    expect(esClient.deleteByQuery).not.toHaveBeenCalled();
    expect(esClient.bulk).not.toHaveBeenCalled();
    expect(esClient.update).not.toHaveBeenCalled();
  });

  it('honors an explicit refresh: false', async () => {
    esClient.search.mockResponseOnce(
      searchResponse([sourceBoundDoc({ range_end: '10.0.0.255', range_start: '10.0.0.0' })])
    );

    await deleteLookupItemByValue({
      esClient,
      index: TEST_INDEX,
      listId: TEST_LIST_ID,
      refresh: false,
      type: 'ip_range',
      value: '10.0.0.1',
    });

    expect(esClient.deleteByQuery).toHaveBeenCalledWith(
      expect.objectContaining({ refresh: false })
    );
  });

  it('lets the error Elasticsearch gives for a range string reach the caller, as the shared stream does', async () => {
    // a `term` on a range field cannot take a CIDR or a `start-end` string; the shared
    // stream returns Elasticsearch's rejection, and so does this rather than deleting the
    // authored range by its id, so both storages answer the same request the same way
    esClient.search.mockRejectedValueOnce(
      Object.assign(new Error("'10.0.0.0/24' is not an IP string literal."), {
        meta: { statusCode: 400 },
      })
    );

    await expect(
      deleteLookupItemByValue({
        esClient,
        index: TEST_INDEX,
        listId: TEST_LIST_ID,
        type: 'ip_range',
        value: '10.0.0.0/24',
      })
    ).rejects.toThrow('is not an IP string literal');
    expect(esClient.deleteByQuery).not.toHaveBeenCalled();
    expect(esClient.bulk).not.toHaveBeenCalled();
  });

  it('propagates a failure marking the state dirty', async () => {
    esClient.search.mockResponseOnce(
      searchResponse([sourceBoundDoc({ range_end: '10.0.0.255', range_start: '10.0.0.0' })])
    );
    (esClient.update as jest.Mock).mockRejectedValueOnce(new Error('state boom'));

    await expect(
      deleteLookupItemByValue({
        esClient,
        index: TEST_INDEX,
        listId: TEST_LIST_ID,
        type: 'ip_range',
        value: '10.0.0.1',
      })
    ).rejects.toThrow('state boom');
  });
});

// The by-id paths (delete by id, update by id) resolve an item id to its authored value
// and must remove exactly that document. On a range list the authored value is a range
// string, which a delete by value would hand to Elasticsearch as an address and fail on.
describe('deleteAuthoredLookupItem (range types)', () => {
  let esClient: EsClientMock;

  const stored = {
    created_at: '2026-01-01T00:00:00.000Z',
    src_end: '10.0.0.100',
    src_start: '10.0.0.0',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    esClient = createEsClientMock();
  });

  it('deletes the range string by its document id, marks its region dirty, and returns it', async () => {
    (esClient.get as jest.Mock).mockResolvedValueOnce({
      _id: sourceId('10.0.0.0-10.0.0.100'),
      _source: stored,
    });

    const deleted = await deleteAuthoredLookupItem({
      esClient,
      index: TEST_INDEX,
      listId: TEST_LIST_ID,
      type: 'ip_range',
      value: '10.0.0.0-10.0.0.100',
    });

    // the document is addressed by id: no search, no delete by query
    expect(esClient.search).not.toHaveBeenCalled();
    expect(esClient.deleteByQuery).not.toHaveBeenCalled();
    expect(esClient.delete).toHaveBeenCalledWith({
      id: sourceId('10.0.0.0-10.0.0.100'),
      index: TEST_INDEX,
      refresh: 'wait_for',
    });
    // its region owes a re-coalesce
    expect((esClient.bulk as jest.Mock).mock.calls[0][0]).toEqual({
      index: TEST_INDEX,
      operations: expectedDirtyMarkerOps([{ range_end: '10.0.0.100', range_start: '10.0.0.0' }]),
      refresh: true,
    });
    expect(esClient.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: STATE_DOC_ID, index: TEST_INDEX, scripted_upsert: true })
    );
    expect(deleted).toEqual([{ id: sourceId('10.0.0.0-10.0.0.100'), source: stored }]);
  });

  it('accepts a CIDR the same way', async () => {
    (esClient.get as jest.Mock).mockResolvedValueOnce({
      _id: sourceId('10.0.0.0/24'),
      _source: { src_end: '10.0.0.255', src_start: '10.0.0.0' },
    });

    const deleted = await deleteAuthoredLookupItem({
      esClient,
      index: TEST_INDEX,
      listId: TEST_LIST_ID,
      type: 'ip_range',
      value: '10.0.0.0/24',
    });

    expect(esClient.delete).toHaveBeenCalledWith(
      expect.objectContaining({ id: sourceId('10.0.0.0/24') })
    );
    expect((esClient.bulk as jest.Mock).mock.calls[0][0].operations).toEqual(
      expectedDirtyMarkerOps([{ range_end: '10.0.0.255', range_start: '10.0.0.0' }])
    );
    expect(deleted).toHaveLength(1);
  });

  it('returns nothing and changes nothing when the value is not in the list', async () => {
    (esClient.get as jest.Mock).mockRejectedValueOnce(
      Object.assign(new Error('not found'), { meta: { statusCode: 404 } })
    );

    const deleted = await deleteAuthoredLookupItem({
      esClient,
      index: TEST_INDEX,
      listId: TEST_LIST_ID,
      type: 'ip_range',
      value: '10.0.0.0-10.0.0.100',
    });

    expect(deleted).toEqual([]);
    expect(esClient.delete).not.toHaveBeenCalled();
    expect(esClient.bulk).not.toHaveBeenCalled();
    expect(esClient.update).not.toHaveBeenCalled();
  });
});
