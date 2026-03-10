/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createWatchlistSyncMarkersService } from './sync_markers';
import type { MonitoringEntitySource } from '../../../../../../../common/api/entity_analytics';

describe('Watchlist sync markers service', () => {
  const mockSource: MonitoringEntitySource = {
    id: 'source-1',
    type: 'entity_analytics_integration',
    name: 'test-source',
    indexPattern: 'logs-entityanalytics_okta.user-default',
    integrationName: 'entityanalytics_okta',
    enabled: true,
  };

  describe('getLastProcessedMarker', () => {
    it('returns the last processed marker from descriptor client when defined', async () => {
      const lastProcessedMarker = '2024-01-15T12:00:00Z';
      const descriptorClient = {
        getLastProcessedMarker: jest.fn().mockResolvedValue(lastProcessedMarker),
        updateLastProcessedMarker: jest.fn().mockResolvedValue(undefined),
      };

      const service = createWatchlistSyncMarkersService(descriptorClient);
      const result = await service.getLastProcessedMarker(mockSource);

      expect(result).toBe(lastProcessedMarker);
      expect(descriptorClient.getLastProcessedMarker).toHaveBeenCalledWith(mockSource);
    });

    it('returns a date math expression (now-1M) when descriptor client returns undefined', async () => {
      const descriptorClient = {
        getLastProcessedMarker: jest.fn().mockResolvedValue(undefined),
        updateLastProcessedMarker: jest.fn().mockResolvedValue(undefined),
      };

      const service = createWatchlistSyncMarkersService(descriptorClient);
      const result = await service.getLastProcessedMarker(mockSource);

      expect(typeof result).toBe('string');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(descriptorClient.getLastProcessedMarker).toHaveBeenCalledWith(mockSource);
    });
  });

  describe('updateLastProcessedMarker', () => {
    it('delegates to descriptor client', async () => {
      const descriptorClient = {
        getLastProcessedMarker: jest.fn().mockResolvedValue(undefined),
        updateLastProcessedMarker: jest.fn().mockResolvedValue(undefined),
      };

      const service = createWatchlistSyncMarkersService(descriptorClient);
      const timestamp = '2024-02-01T00:00:00Z';
      await service.updateLastProcessedMarker(mockSource, timestamp);

      expect(descriptorClient.updateLastProcessedMarker).toHaveBeenCalledWith(
        mockSource,
        timestamp
      );
    });
  });
});
