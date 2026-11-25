/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { AlertOutcomeTrackingStore } from './tracking_store';
import type { TrackingRecord } from './types';

const client = { index: jest.fn(), search: jest.fn() };

jest.mock('@kbn/storage-adapter', () => ({
  ...jest.requireActual('@kbn/storage-adapter'),
  StorageIndexAdapter: jest.fn().mockImplementation(() => ({ getClient: () => client })),
}));

const conflict = () =>
  new errors.ResponseError({
    statusCode: 409,
    body: { error: { type: 'version_conflict_engine_exception' } },
    headers: {},
    warnings: [],
    meta: {} as never,
  });

const record: TrackingRecord = {
  investigation_id: 'inv-1',
  space_id: 'default',
  post_received_at: '2026-11-24T10:00:00.000Z',
  created_at: '2026-11-24T10:01:00.000Z',
  updated_at: '2026-11-24T10:01:00.000Z',
  state: 'tracking',
  next_check_at: '2026-11-24T10:01:00.000Z',
  consecutive_failures: 0,
};

const createStore = () =>
  new AlertOutcomeTrackingStore(
    elasticsearchServiceMock.createElasticsearchClient(),
    loggingSystemMock.createLogger()
  );

describe('AlertOutcomeTrackingStore', () => {
  beforeEach(() => {
    client.index.mockReset();
    client.search.mockReset();
  });

  it('creates one record per investigation', async () => {
    client.index.mockResolvedValueOnce({}).mockRejectedValueOnce(conflict());
    const store = createStore();
    await expect(store.create(record)).resolves.toBe(true);
    await expect(store.create(record)).resolves.toBe(false);
    expect(client.index).toHaveBeenCalledWith({ id: 'inv-1', document: record, op_type: 'create' });
  });

  it('updates only the version it read', async () => {
    client.index
      .mockResolvedValueOnce({ _seq_no: 8, _primary_term: 1 })
      .mockRejectedValueOnce(conflict());
    const store = createStore();
    const stored = { record, seqNo: 7, primaryTerm: 1 };

    await expect(store.update(stored, { state: 'recovering' })).resolves.toEqual({
      record: { ...record, state: 'recovering' },
      seqNo: 8,
      primaryTerm: 1,
    });
    expect(client.index).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'inv-1', if_seq_no: 7, if_primary_term: 1 })
    );
    await expect(store.update(stored, { state: 'recovering' })).resolves.toBeUndefined();
  });

  it('rethrows other errors', async () => {
    client.index.mockRejectedValue(new Error('cluster down'));
    await expect(createStore().create(record)).rejects.toThrow('cluster down');
  });

  it('reads a record of one space with its version', async () => {
    client.search.mockResolvedValue({
      hits: { hits: [{ _source: record, _seq_no: 3, _primary_term: 2 }] },
    });
    await expect(createStore().get('default', 'inv-1')).resolves.toEqual({
      record,
      seqNo: 3,
      primaryTerm: 2,
    });
    expect(client.search).toHaveBeenCalledWith({
      track_total_hits: false,
      size: 1,
      seq_no_primary_term: true,
      query: {
        bool: { filter: [{ term: { space_id: 'default' } }, { term: { _id: 'inv-1' } }] },
      },
    });
  });

  it('skips hits without a version', async () => {
    client.search.mockResolvedValue({ hits: { hits: [{ _source: record }] } });
    await expect(createStore().get('default', 'inv-1')).resolves.toBeUndefined();
  });

  it('finds due records of one space, oldest first, with their versions', async () => {
    client.search.mockResolvedValue({
      hits: { hits: [{ _source: record, _seq_no: 3, _primary_term: 2 }, { _source: record }] },
    });
    await expect(
      createStore().findDue({ spaceId: 'default', now: '2026-11-24T10:05:00.000Z', size: 50 })
    ).resolves.toEqual([{ record, seqNo: 3, primaryTerm: 2 }]);
    expect(client.search).toHaveBeenCalledWith({
      track_total_hits: false,
      size: 50,
      seq_no_primary_term: true,
      query: {
        bool: {
          filter: [
            { term: { space_id: 'default' } },
            { term: { state: 'tracking' } },
            { range: { next_check_at: { lte: '2026-11-24T10:05:00.000Z' } } },
          ],
        },
      },
      sort: [{ next_check_at: { order: 'asc' } }],
    });
  });

  it('finds claims without a recovery round', async () => {
    client.search.mockResolvedValue({ hits: { hits: [] } });
    await createStore().findStuckRecovering({
      spaceId: 'default',
      before: '2026-11-24T10:00:00.000Z',
      size: 20,
    });
    expect(client.search.mock.calls[0][0].query.bool).toEqual({
      filter: [
        { term: { space_id: 'default' } },
        { term: { state: 'recovering' } },
        { range: { recovering_since: { lte: '2026-11-24T10:00:00.000Z' } } },
      ],
      must_not: [{ exists: { field: 'recovery_execution_id' } }],
    });
  });
});
