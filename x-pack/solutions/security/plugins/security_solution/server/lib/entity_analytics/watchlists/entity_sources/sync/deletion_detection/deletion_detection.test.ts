/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { CRUDClient } from '@kbn/entity-store/server/domain/crud/crud_client';
import type { WatchlistDataSources } from '../../../../../../../common/api/entity_analytics';
import type { WatchlistsByEuid } from '../../../entities/service';
import { createDeletionDetectionService } from './deletion_detection';

const createMockCrudClient = (): jest.Mocked<CRUDClient> =>
  ({
    searchLatestEntities: jest
      .fn()
      .mockResolvedValue({ records: [], total: 0, inspect: { dsl: [], response: [] } }),
    bulkUpdateEntity: jest.fn().mockResolvedValue([]),
  } as unknown as jest.Mocked<CRUDClient>);

const emptyWatchlistsByEuid: WatchlistsByEuid = new Map();

jest.mock('../../bulk/soft_delete');

const { applyBulkRemoveSource } = jest.requireMock('../../bulk/soft_delete') as {
  applyBulkRemoveSource: jest.Mock;
};

describe('DeletionDetectionService', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const logger = loggingSystemMock.createLogger();
  const watchlist = {
    id: 'test-watchlist-id',
    name: 'test-watchlist',
    index: '.entity-analytics.watchlists.test-default',
  };

  const createService = () =>
    createDeletionDetectionService({
      esClient,
      crudClient: createMockCrudClient(),
      logger,
      watchlist,
    });

  const indexSource: WatchlistDataSources.MonitoringEntitySource = {
    id: 'source-idx',
    type: 'index',
    name: 'test-index-source',
    indexPattern: 'my-index-*',
    identifierField: 'user.name',
    enabled: true,
  };

  const integrationSource: WatchlistDataSources.MonitoringEntitySource = {
    id: 'source-int',
    type: 'entity_analytics_integration',
    name: 'test-integration-source',
    indexPattern: 'logs-entityanalytics_okta.user-default',
    integrationName: 'entityanalytics_okta',
    enabled: true,
    integrations: {
      syncMarkerIndex: 'logs-entityanalytics_okta.entity-default',
      syncData: {},
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: no stale entities found
    esClient.search.mockResolvedValue({
      hits: { hits: [], total: { value: 0, relation: 'eq' } },
    } as unknown as ReturnType<typeof esClient.search>);
  });

  describe('index sources', () => {
    it('skips bulk operations when no stale entities are found', async () => {
      const service = createService();
      await service.deletionDetection(indexSource, ['euid-1', 'euid-2'], emptyWatchlistsByEuid);

      expect(esClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: watchlist.index,
          query: {
            bool: {
              must: [
                { term: { 'labels.source_ids': 'source-idx' } },
                { term: { 'watchlist.id': watchlist.id } },
              ],
              must_not: [{ terms: { 'entity.id': ['euid-1', 'euid-2'] } }],
            },
          },
        })
      );
      expect(applyBulkRemoveSource).not.toHaveBeenCalled();
    });

    it('calls applyBulkRemoveSource when stale entities are found', async () => {
      esClient.search.mockResolvedValueOnce({
        hits: {
          hits: [
            { _id: 'doc-stale-1', _source: {}, sort: ['sort-1'] },
            { _id: 'doc-stale-2', _source: {}, sort: ['sort-2'] },
          ],
          total: { value: 2, relation: 'eq' },
        },
      } as unknown as ReturnType<typeof esClient.search>);

      const service = createService();
      await service.deletionDetection(indexSource, ['euid-1'], emptyWatchlistsByEuid);

      expect(applyBulkRemoveSource).toHaveBeenCalledWith(
        expect.objectContaining({
          staleEntities: [
            { docId: 'doc-stale-1', sourceId: 'source-idx' },
            { docId: 'doc-stale-2', sourceId: 'source-idx' },
          ],
          sourceType: 'index',
          watchlist,
        })
      );
    });

    it('omits must_not when currentEuids is empty (all entities are stale)', async () => {
      const service = createService();
      await service.deletionDetection(indexSource, [], emptyWatchlistsByEuid);

      expect(esClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: {
            bool: {
              must: [
                { term: { 'labels.source_ids': 'source-idx' } },
                { term: { 'watchlist.id': watchlist.id } },
              ],
            },
          },
        })
      );
    });

    it('scopes the query to the page range when range is provided', async () => {
      const service = createService();
      await service.deletionDetection(indexSource, ['euid-1'], emptyWatchlistsByEuid, {
        gt: 'host:z',
        lte: 'user:b',
      });

      expect(esClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: {
            bool: {
              must: [
                { term: { 'labels.source_ids': 'source-idx' } },
                { term: { 'watchlist.id': watchlist.id } },
                { range: { 'entity.id': { gt: 'host:z', lte: 'user:b' } } },
              ],
              must_not: [{ terms: { 'entity.id': ['euid-1'] } }],
            },
          },
        })
      );
    });

    it('omits lte from range for the tail pass', async () => {
      const service = createService();
      await service.deletionDetection(indexSource, [], emptyWatchlistsByEuid, {
        gt: 'user:z',
      });

      expect(esClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: {
            bool: {
              must: [
                { term: { 'labels.source_ids': 'source-idx' } },
                { term: { 'watchlist.id': watchlist.id } },
                { range: { 'entity.id': { gt: 'user:z' } } },
              ],
            },
          },
        })
      );
    });

    it('ignores hasNewFullSync for index sources (only entity_analytics_integration sources gate on it)', async () => {
      const service = createService();
      await service.deletionDetection(
        indexSource,
        ['euid-1'],
        emptyWatchlistsByEuid,
        undefined,
        false
      );

      // The only search call should be the stale entity query on the target index — index
      // sources always run, regardless of hasNewFullSync.
      expect(esClient.search).toHaveBeenCalledTimes(1);
      expect(esClient.search).toHaveBeenCalledWith(
        expect.objectContaining({ index: watchlist.index })
      );
    });
  });

  describe('integration sources', () => {
    it('warns and skips deletion detection when syncMarkerIndex is not configured', async () => {
      const sourceWithoutMarkerIndex: WatchlistDataSources.MonitoringEntitySource = {
        ...integrationSource,
        integrations: undefined,
      };

      const service = createService();
      await service.deletionDetection(
        sourceWithoutMarkerIndex,
        ['euid-1'],
        emptyWatchlistsByEuid,
        undefined,
        true
      );

      // No search at all — syncMarkerIndex is checked before anything else runs.
      expect(esClient.search).not.toHaveBeenCalled();
      expect(applyBulkRemoveSource).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          `Source ${sourceWithoutMarkerIndex.id} (${sourceWithoutMarkerIndex.name}) has no integrations.syncMarkerIndex configured`
        )
      );
    });

    it('skips deletion detection when hasNewFullSync is false', async () => {
      const service = createService();
      await service.deletionDetection(
        integrationSource,
        ['euid-1'],
        emptyWatchlistsByEuid,
        undefined,
        false
      );

      expect(esClient.search).not.toHaveBeenCalled();
      expect(applyBulkRemoveSource).not.toHaveBeenCalled();
    });

    it('skips deletion detection when hasNewFullSync is omitted', async () => {
      const service = createService();
      await service.deletionDetection(integrationSource, ['euid-1'], emptyWatchlistsByEuid);

      expect(esClient.search).not.toHaveBeenCalled();
      expect(applyBulkRemoveSource).not.toHaveBeenCalled();
    });

    it('runs deletion detection when hasNewFullSync is true', async () => {
      esClient.search.mockResolvedValueOnce({
        hits: {
          hits: [{ _id: 'doc-stale', _source: {}, sort: ['s'] }],
          total: { value: 1, relation: 'eq' },
        },
      } as unknown as ReturnType<typeof esClient.search>);

      const service = createService();
      await service.deletionDetection(
        integrationSource,
        ['euid-1'],
        emptyWatchlistsByEuid,
        undefined,
        true
      );

      expect(esClient.search).toHaveBeenCalledTimes(1);
      expect(esClient.search).toHaveBeenCalledWith(
        expect.objectContaining({ index: watchlist.index })
      );
      expect(applyBulkRemoveSource).toHaveBeenCalledWith(
        expect.objectContaining({
          staleEntities: [{ docId: 'doc-stale', sourceId: 'source-int' }],
          sourceType: 'entity_analytics_integration',
        })
      );
    });
  });
});
