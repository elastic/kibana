/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { createTelemetryCutoffStore } from './telemetry_cutoffs';

const mockStorageClient = { get: jest.fn(), index: jest.fn() };

jest.mock('@kbn/storage-adapter', () => ({
  ...jest.requireActual('@kbn/storage-adapter'),
  StorageIndexAdapter: jest.fn().mockImplementation(() => ({
    getClient: () => mockStorageClient,
  })),
}));

const createStore = () =>
  createTelemetryCutoffStore({
    esClient: elasticsearchServiceMock.createElasticsearchClient(),
    logger: loggingSystemMock.createLogger(),
  });

describe('telemetry cutoff store', () => {
  beforeEach(() => jest.clearAllMocks());

  it('stores a cutoff under its investigation id', async () => {
    await createStore().set('inv-1', '2026-04-19T16:27:00.000Z');

    expect(mockStorageClient.index).toHaveBeenCalledWith({
      id: 'inv-1',
      document: { telemetry_not_after: '2026-04-19T16:27:00.000Z' },
    });
  });

  it('reads the stored cutoff', async () => {
    mockStorageClient.get.mockResolvedValue({
      _id: 'inv-1',
      _source: { telemetry_not_after: '2026-04-19T16:27:00.000Z' },
    });

    await expect(createStore().get('inv-1')).resolves.toBe('2026-04-19T16:27:00.000Z');
    expect(mockStorageClient.get).toHaveBeenCalledWith({ id: 'inv-1' });
  });

  it('reads no cutoff for an investigation that has none', async () => {
    mockStorageClient.get.mockRejectedValue(
      Object.assign(new Error('missing'), { statusCode: 404 })
    );

    await expect(createStore().get('inv-1')).resolves.toBeUndefined();
  });

  it('surfaces any other read failure, so the caller can refuse to run unbounded', async () => {
    mockStorageClient.get.mockRejectedValue(
      Object.assign(new Error('timeout'), { statusCode: 503 })
    );

    await expect(createStore().get('inv-1')).rejects.toThrow('timeout');
  });
});
