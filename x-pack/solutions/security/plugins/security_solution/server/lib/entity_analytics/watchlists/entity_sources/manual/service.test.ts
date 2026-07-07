/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createManualEntityService } from './service';
import { MANUAL_SOURCE_ID } from './constants';
import { loggerMock } from '@kbn/logging-mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { CRUDClient } from '@kbn/entity-store/server/domain/crud/crud_client';
import { bulkUpsertOperationsFactory } from '../bulk/upsert';

jest.mock('../sync/utils');
jest.mock('../bulk/upsert');
jest.mock('../sync/entity_store_sync');
jest.mock('../bulk/soft_delete');

const bulkUpsertOperationsFactoryMock = bulkUpsertOperationsFactory as jest.Mock;

describe('manual entity service', () => {
  const logger = loggerMock.create();
  const watchlist = { name: 'test-watchlist', id: 'test-id', index: 'test-index' };

  const createService = () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const crudClient = {
      listEntities: jest.fn(),
      bulkUpdateEntity: jest.fn(),
    } as unknown as jest.Mocked<CRUDClient>;

    const service = createManualEntityService({
      esClient,
      crudClient,
      logger,
      watchlist,
    });

    return { esClient, crudClient, service };
  };

  beforeEach(() => {
    bulkUpsertOperationsFactoryMock.mockReturnValue(() => [{ index: {} }, {}]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('assign', () => {
    it('returns not_found for entities not in the store', async () => {
      const { crudClient, service } = createService();
      (crudClient.listEntities as jest.Mock).mockResolvedValue({ entities: [] });

      const result = await service.assign(['user:unknown']);

      expect(result).toEqual({
        successful: 0,
        failed: 0,
        not_found: 1,
        total: 1,
        items: [{ euid: 'user:unknown', status: 'not_found', error: expect.any(String) }],
      });
    });

    it('assigns found entities successfully', async () => {
      const { esClient, crudClient, service } = createService();
      (crudClient.listEntities as jest.Mock).mockResolvedValue({
        entities: [
          {
            entity: {
              id: 'user:known',
              type: 'user',
              name: 'Known User',
              attributes: { watchlists: ['other-watchlist'] },
            },
          },
        ],
      });
      esClient.bulk.mockResolvedValue({
        errors: false,
        took: 1,
        items: [{ index: { _id: 'user:known', _index: 'test-index', status: 200 } }],
      });

      const result = await service.assign(['user:known', 'user:unknown']);

      expect(result).toEqual({
        successful: 1,
        failed: 0,
        not_found: 1,
        total: 2,
        items: [
          { euid: 'user:unknown', status: 'not_found', error: expect.any(String) },
          { euid: 'user:known', status: 'success' },
        ],
      });

      expect(crudClient.listEntities).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: { terms: { 'entity.id': ['user:known', 'user:unknown'] } },
        })
      );
    });

    it('reports per-item failures on partial bulk errors', async () => {
      const { esClient, crudClient, service } = createService();
      (crudClient.listEntities as jest.Mock).mockResolvedValue({
        entities: [
          {
            entity: { id: 'user:ok', type: 'user', name: 'OK', attributes: { watchlists: [] } },
          },
          {
            entity: {
              id: 'user:fail',
              type: 'user',
              name: 'Fail',
              attributes: { watchlists: [] },
            },
          },
        ],
      });
      esClient.bulk.mockResolvedValue({
        errors: true,
        took: 1,
        items: [
          { index: { _id: 'user:ok', _index: 'test-index', status: 200 } },
          {
            index: {
              _id: 'user:fail',
              _index: 'test-index',
              status: 400,
              error: { type: 'mapper_parsing_exception', reason: 'field mapping error' },
            },
          },
        ],
      });

      const result = await service.assign(['user:ok', 'user:fail']);

      expect(result).toEqual({
        successful: 1,
        failed: 1,
        not_found: 0,
        total: 2,
        items: [
          { euid: 'user:ok', status: 'success' },
          {
            euid: 'user:fail',
            status: 'failure',
            error: 'mapper_parsing_exception: field mapping error',
          },
        ],
      });
    });

    it('handles errors during assignment', async () => {
      const { esClient, crudClient, service } = createService();
      (crudClient.listEntities as jest.Mock).mockResolvedValue({
        entities: [{ entity: { id: 'user:known', type: 'user' } }],
      });
      esClient.bulk.mockRejectedValue(new Error('Bulk failed'));

      const result = await service.assign(['user:known']);

      expect(result).toEqual({
        successful: 0,
        failed: 1,
        not_found: 0,
        total: 1,
        items: [{ euid: 'user:known', status: 'failure', error: 'Bulk failed' }],
      });
    });
  });

  describe('unassign', () => {
    it('returns not_found for entities not manually assigned', async () => {
      const { esClient, service } = createService();
      esClient.search.mockResolvedValue({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: { hits: [] },
      });

      const result = await service.unassign(['user:unknown']);

      expect(result).toEqual({
        successful: 0,
        failed: 0,
        not_found: 1,
        total: 1,
        items: [{ euid: 'user:unknown', status: 'not_found', error: expect.any(String) }],
      });
    });

    it('unassigns manually assigned entities successfully', async () => {
      const { esClient, crudClient, service } = createService();
      esClient.search.mockResolvedValueOnce({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          hits: [{ _id: 'doc-1', _index: 'test-index', _source: { entity: { id: 'user:known' } } }],
        },
      });
      (crudClient.listEntities as jest.Mock).mockResolvedValue({
        entities: [
          {
            entity: {
              id: 'user:known',
              type: 'user',
              attributes: { watchlists: ['test-id'] },
            },
          },
        ],
      });

      const result = await service.unassign(['user:known', 'user:unknown']);

      expect(result).toEqual({
        successful: 1,
        failed: 0,
        not_found: 1,
        total: 2,
        items: [
          { euid: 'user:unknown', status: 'not_found', error: expect.any(String) },
          { euid: 'user:known', status: 'success' },
        ],
      });

      expect(esClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: watchlist.index,
          query: {
            bool: {
              must: [
                { terms: { 'entity.id': ['user:known', 'user:unknown'] } },
                { term: { 'watchlist.id': watchlist.id } },
                { term: { 'labels.source_ids': MANUAL_SOURCE_ID } },
              ],
            },
          },
        })
      );
    });

    it('handles errors during unassignment', async () => {
      const { esClient, crudClient, service } = createService();
      esClient.search.mockResolvedValueOnce({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          hits: [{ _id: 'doc-1', _index: 'test-index', _source: { entity: { id: 'user:known' } } }],
        },
      });
      (crudClient.listEntities as jest.Mock).mockRejectedValue(new Error('Store search failed'));

      const result = await service.unassign(['user:known']);

      expect(result).toEqual({
        successful: 0,
        failed: 1,
        not_found: 0,
        total: 1,
        items: [{ euid: 'user:known', status: 'failure', error: 'Store search failed' }],
      });
    });
  });
});
