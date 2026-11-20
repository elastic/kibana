/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { AggregatedFeature, Feature } from '@kbn/significant-events-schema';
import { useDiscoveryFeaturesApi } from './use_discovery_features_api';

const mockFetch = jest.fn();

jest.mock('../../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: { significantEvents: { significantEventsRepositoryClient: { fetch: mockFetch } } },
  }),
}));

const feature = (uuid: string, overrides: Partial<Feature> = {}): Feature => ({
  uuid,
  id: 'redis',
  source_id: 'src-logs',
  type: 'technology',
  description: 'cache',
  properties: {},
  confidence: 80,
  ...overrides,
});

const aggregated: AggregatedFeature = {
  ...feature('u1'),
  sources: ['src-logs', 'src-payments'],
  instances: [feature('u1'), feature('u2', { source_id: 'src-payments', confidence: 70 })],
};

const expectOperations = (operations: unknown[]) =>
  expect(mockFetch).toHaveBeenCalledWith(
    'POST /internal/streams/features/_bulk',
    expect.objectContaining({ params: { body: { operations } } })
  );

describe('useDiscoveryFeaturesApi', () => {
  beforeEach(() => {
    mockFetch.mockReset().mockResolvedValue({
      succeeded: 2,
      failed: 0,
      conflicts: 0,
      skipped: 0,
      failedIds: [],
      conflictIds: [],
    });
  });

  it('fans an aggregated row out to every instance', async () => {
    const { result } = renderHook(() => useDiscoveryFeaturesApi());

    const outcome = await result.current.setFeaturesDurabilityInBulk([aggregated], true);

    expectOperations([
      { durability: { id: 'u1', durable: true } },
      { durability: { id: 'u2', durable: true } },
    ]);
    expect(outcome).toEqual({
      succeededCount: 2,
      failedCount: 0,
      conflictCount: 0,
      failedIds: [],
      conflictIds: [],
    });
  });

  it('targets the feature uuid when there are no instances', async () => {
    const { result } = renderHook(() => useDiscoveryFeaturesApi());

    await result.current.deleteFeaturesInBulk([feature('u1')]);

    expectOperations([{ delete: { id: 'u1' } }]);
  });
});
