/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { MonitoringEntitySource } from '../../../../../../common/api/entity_analytics';
import { createWatchlistSyncMarkersService } from './sync_markers';
import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';

jest.mock('../infra/entity_source_client');

const {
  WatchlistEntitySourceClient,
  mockGetLastProcessedMarker,
  mockUpdateLastProcessedMarker,
  mockGetLastFullSyncMarker,
  mockUpdateLastFullSyncMarker,
} = jest.requireMock('../infra/entity_source_client') as {
  WatchlistEntitySourceClient: jest.Mock;
  mockGetLastProcessedMarker: jest.Mock;
  mockUpdateLastProcessedMarker: jest.Mock;
  mockGetLastFullSyncMarker: jest.Mock;
  mockUpdateLastFullSyncMarker: jest.Mock;
};

describe('Watchlist sync markers service', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();

  const createDescriptorClient = () =>
    new WatchlistEntitySourceClient({
      soClient: savedObjectsClientMock.create(),
      namespace: 'default',
    });

  const mockSource: MonitoringEntitySource = {
    id: 'source-1',
    type: 'entity_analytics_integration',
    name: 'test-source',
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
  });

  describe('getLastProcessedMarker', () => {
    it('returns the last processed marker from descriptor client when defined', async () => {
      const lastProcessedMarker = '2024-01-15T12:00:00Z';
      const descriptorClient = createDescriptorClient();
      mockGetLastProcessedMarker.mockResolvedValue(lastProcessedMarker);

      const service = createWatchlistSyncMarkersService(descriptorClient, esClient);
      const result = await service.getLastProcessedMarker(mockSource);

      expect(result).toBe(lastProcessedMarker);
      expect(mockGetLastProcessedMarker).toHaveBeenCalledWith(mockSource);
    });

    it('returns a date math expression (now-1M) when descriptor client returns undefined', async () => {
      const descriptorClient = createDescriptorClient();
      mockGetLastProcessedMarker.mockResolvedValue(undefined);

      const service = createWatchlistSyncMarkersService(descriptorClient, esClient);
      const result = await service.getLastProcessedMarker(mockSource);

      expect(typeof result).toBe('string');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(mockGetLastProcessedMarker).toHaveBeenCalledWith(mockSource);
    });
  });

  describe('updateLastProcessedMarker', () => {
    it('delegates to descriptor client', async () => {
      const descriptorClient = createDescriptorClient();
      mockUpdateLastProcessedMarker.mockResolvedValue(undefined);

      const service = createWatchlistSyncMarkersService(descriptorClient, esClient);
      const timestamp = '2024-02-01T00:00:00Z';
      await service.updateLastProcessedMarker(mockSource, timestamp);

      expect(mockUpdateLastProcessedMarker).toHaveBeenCalledWith(mockSource, timestamp);
    });
  });

  describe('findLastEventMarkerInIndex', () => {
    it('returns the timestamp of the latest event marker', async () => {
      const descriptorClient = createDescriptorClient();

      esClient.search.mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _id: '1',
              _source: { '@timestamp': '2024-03-01T00:00:00Z' },
            },
          ],
        },
      } as unknown as SearchResponse<unknown>);

      const service = createWatchlistSyncMarkersService(descriptorClient, esClient);
      const result = await service.findLastEventMarkerInIndex(mockSource, 'completed');

      expect(result).toBe('2024-03-01T00:00:00Z');
      expect(esClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 'logs-entityanalytics_okta.entity-default',
          query: { term: { 'event.action': 'completed' } },
        })
      );
    });

    it('returns undefined when no event marker is found', async () => {
      const descriptorClient = createDescriptorClient();
      esClient.search.mockResolvedValueOnce({
        hits: { hits: [] },
      } as unknown as SearchResponse<unknown>);

      const service = createWatchlistSyncMarkersService(descriptorClient, esClient);
      const result = await service.findLastEventMarkerInIndex(mockSource, 'completed');

      expect(result).toBeUndefined();
    });

    it('returns undefined when syncMarkerIndex is not configured', async () => {
      const descriptorClient = createDescriptorClient();
      const sourceWithoutMarkerIndex: MonitoringEntitySource = {
        ...mockSource,
        integrations: undefined,
      };

      const service = createWatchlistSyncMarkersService(descriptorClient, esClient);
      const result = await service.findLastEventMarkerInIndex(
        sourceWithoutMarkerIndex,
        'completed'
      );

      expect(result).toBeUndefined();
      expect(esClient.search).not.toHaveBeenCalled();
    });
  });

  describe('detectNewFullSync', () => {
    it('returns true when a completed event is found and no previous marker exists', async () => {
      const descriptorClient = createDescriptorClient();
      mockGetLastFullSyncMarker.mockResolvedValue(undefined);
      mockUpdateLastFullSyncMarker.mockResolvedValue(undefined);
      esClient.search.mockResolvedValueOnce({
        hits: {
          hits: [{ _id: '1', _source: { '@timestamp': '2024-03-01T00:00:00Z' } }],
        },
      } as unknown as SearchResponse<unknown>);

      const service = createWatchlistSyncMarkersService(descriptorClient, esClient);
      const result = await service.detectNewFullSync(mockSource);

      expect(result).toBe(true);
      expect(mockUpdateLastFullSyncMarker).toHaveBeenCalledWith(mockSource, '2024-03-01T00:00:00Z');
    });

    it('returns true when a completed event is newer than the saved marker', async () => {
      const descriptorClient = createDescriptorClient();
      mockGetLastFullSyncMarker.mockResolvedValue('2024-02-01T00:00:00Z');
      mockUpdateLastFullSyncMarker.mockResolvedValue(undefined);
      esClient.search.mockResolvedValueOnce({
        hits: {
          hits: [{ _id: '1', _source: { '@timestamp': '2024-03-01T00:00:00Z' } }],
        },
      } as unknown as SearchResponse<unknown>);

      const service = createWatchlistSyncMarkersService(descriptorClient, esClient);
      const result = await service.detectNewFullSync(mockSource);

      expect(result).toBe(true);
      expect(mockUpdateLastFullSyncMarker).toHaveBeenCalledWith(mockSource, '2024-03-01T00:00:00Z');
    });

    it('returns false when the completed event is not newer than the saved marker', async () => {
      const descriptorClient = createDescriptorClient();
      mockGetLastFullSyncMarker.mockResolvedValue('2024-03-01T00:00:00Z');
      esClient.search.mockResolvedValueOnce({
        hits: {
          hits: [{ _id: '1', _source: { '@timestamp': '2024-03-01T00:00:00Z' } }],
        },
      } as unknown as SearchResponse<unknown>);

      const service = createWatchlistSyncMarkersService(descriptorClient, esClient);
      const result = await service.detectNewFullSync(mockSource);

      expect(result).toBe(false);
      expect(mockUpdateLastFullSyncMarker).not.toHaveBeenCalled();
    });

    it('returns false when no completed event exists in the sync marker index', async () => {
      const descriptorClient = createDescriptorClient();
      mockGetLastFullSyncMarker.mockResolvedValue(undefined);
      esClient.search.mockResolvedValueOnce({
        hits: { hits: [] },
      } as unknown as SearchResponse<unknown>);

      const service = createWatchlistSyncMarkersService(descriptorClient, esClient);
      const result = await service.detectNewFullSync(mockSource);

      expect(result).toBe(false);
      expect(mockUpdateLastFullSyncMarker).not.toHaveBeenCalled();
    });
  });
});
