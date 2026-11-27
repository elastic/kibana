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
});
