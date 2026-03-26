/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import type { MonitoringEntitySource } from '../../../../../../common/api/entity_analytics';
import { MonitoringEntitySourceDescriptorClient } from '../../../privilege_monitoring/saved_objects';
import { createWatchlistSyncMarkersService } from './sync_markers';

const mockGetLastProcessedMarker = jest.fn();
const mockUpdateLastProcessedMarker = jest.fn();

jest.mock('../../../privilege_monitoring/saved_objects', () => ({
  MonitoringEntitySourceDescriptorClient: jest.fn().mockImplementation(() => ({
    getLastProcessedMarker: mockGetLastProcessedMarker,
    updateLastProcessedMarker: mockUpdateLastProcessedMarker,
  })),
}));

describe('Watchlist sync markers service', () => {
  const createDescriptorClient = () =>
    new MonitoringEntitySourceDescriptorClient({
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
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getLastProcessedMarker', () => {
    it('returns the last processed marker from descriptor client when defined', async () => {
      const lastProcessedMarker = '2024-01-15T12:00:00Z';
      const descriptorClient = createDescriptorClient();
      mockGetLastProcessedMarker.mockResolvedValue(lastProcessedMarker);

      const service = createWatchlistSyncMarkersService(descriptorClient);
      const result = await service.getLastProcessedMarker(mockSource);

      expect(result).toBe(lastProcessedMarker);
      expect(mockGetLastProcessedMarker).toHaveBeenCalledWith(mockSource);
    });

    it('returns a date math expression (now-1M) when descriptor client returns undefined', async () => {
      const descriptorClient = createDescriptorClient();
      mockGetLastProcessedMarker.mockResolvedValue(undefined);

      const service = createWatchlistSyncMarkersService(descriptorClient);
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

      const service = createWatchlistSyncMarkersService(descriptorClient);
      const timestamp = '2024-02-01T00:00:00Z';
      await service.updateLastProcessedMarker(mockSource, timestamp);

      expect(mockUpdateLastProcessedMarker).toHaveBeenCalledWith(mockSource, timestamp);
    });
  });
});
