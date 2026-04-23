/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MonitoringEntitySource } from '../../../../../../../../common/api/entity_analytics';
import { createSyncMarkersStrategy } from './sync_markers_strategy';

const createMockSource = (): MonitoringEntitySource => ({
  id: 'source-id',
  type: 'entity_analytics_integration',
  indexPattern: 'test-index',
  matchers: [],
});

const createMockService = () => ({
  getLastProcessedMarker: jest.fn(),
  updateLastProcessedMarker: jest.fn(),
});

describe('createSyncMarkersStrategy', () => {
  it('returns no-op strategy when sync markers are disabled', async () => {
    const mockService = createMockService();
    const strategy = createSyncMarkersStrategy(false, mockService as never);
    const source = createMockSource();

    await expect(strategy.getLastProcessedMarker(source)).resolves.toBeUndefined();
    expect(strategy.getSearchTimestamp(undefined)).toBeUndefined();
    expect(strategy.pickLaterTimestamp(undefined, '2024-01-01T00:00:00Z')).toBeUndefined();
    await expect(strategy.updateLastProcessedMarker(source, undefined)).resolves.toBeUndefined();

    expect(mockService.getLastProcessedMarker).not.toHaveBeenCalled();
    expect(mockService.updateLastProcessedMarker).not.toHaveBeenCalled();
  });

  it('delegates operations to sync marker service when enabled', async () => {
    const mockService = createMockService();
    mockService.getLastProcessedMarker.mockResolvedValue('2024-01-01T00:00:00Z');
    const strategy = createSyncMarkersStrategy(true, mockService as never);
    const source = createMockSource();

    await expect(strategy.getLastProcessedMarker(source)).resolves.toBe('2024-01-01T00:00:00Z');
    expect(strategy.getSearchTimestamp('2024-01-02T00:00:00Z')).toBe('2024-01-02T00:00:00Z');
    expect(strategy.pickLaterTimestamp('2024-01-01T00:00:00Z', '2024-02-01T00:00:00Z')).toBe(
      '2024-02-01T00:00:00Z'
    );

    await strategy.updateLastProcessedMarker(source, '2024-03-01T00:00:00Z');
    expect(mockService.getLastProcessedMarker).toHaveBeenCalledWith(source);
    expect(mockService.updateLastProcessedMarker).toHaveBeenCalledWith(
      source,
      '2024-03-01T00:00:00Z'
    );
  });

  it('throws when attempting to update marker without timestamp in enabled mode', () => {
    const mockService = createMockService();
    const strategy = createSyncMarkersStrategy(true, mockService as never);
    const source = createMockSource();

    expect(() => strategy.updateLastProcessedMarker(source, undefined)).toThrow(
      'Expected a timestamp before updating the last processed marker'
    );
    expect(mockService.updateLastProcessedMarker).not.toHaveBeenCalled();
  });
});
