/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, Logger } from '@kbn/core/server';
import type {
  SecuritySolutionPluginStart,
  SecuritySolutionPluginStartDependencies,
} from '../../../../plugin_contract';
import { registerAssetInventoryUsageCollector } from './register';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';

const mockEntityStatsResult = { doc_count: 1, last_doc_timestamp: '2025-01-05T00:00:00Z' };
const mockEntityTypeStatsResult = [
  { entity_type: 'host', doc_count: 5, last_doc_timestamp: '2025-01-01T00:00:00Z' },
];
const mockEntityStoreStatsResult = [
  { entity_store: 'storeA', doc_count: 3, last_doc_timestamp: '2025-01-02T00:00:00Z' },
];
const mockEntitySourceStatsResult = [
  { entity_source: 'sourceA', doc_count: 2, last_doc_timestamp: '2025-01-03T00:00:00Z' },
];
const mockAssetCriticalityStatsResult = [
  { criticality: 'high', doc_count: 7, last_doc_timestamp: '2025-01-04T00:00:00Z' },
];

jest.mock('./entities_stats_collector', () => ({
  getEntityStats: jest.fn().mockResolvedValue({
    doc_count: 1,
    last_doc_timestamp: '2025-01-05T00:00:00Z',
  }),
}));

jest.mock('./entities_type_stats_collector', () => ({
  getEntitiesTypeStats: jest
    .fn()
    .mockResolvedValue([
      { entity_type: 'host', doc_count: 5, last_doc_timestamp: '2025-01-01T00:00:00Z' },
    ]),
}));

jest.mock('./entity_store_stats_collector', () => ({
  getEntityStoreStats: jest
    .fn()
    .mockResolvedValue([
      { entity_store: 'storeA', doc_count: 3, last_doc_timestamp: '2025-01-02T00:00:00Z' },
    ]),
}));

jest.mock('./entity_source_stats_collector', () => ({
  getEntitySourceStats: jest
    .fn()
    .mockResolvedValue([
      { entity_source: 'sourceA', doc_count: 2, last_doc_timestamp: '2025-01-03T00:00:00Z' },
    ]),
}));

jest.mock('./asset_criticality_stats_collector', () => ({
  getAssetCriticalityStats: jest
    .fn()
    .mockResolvedValue([
      { criticality: 'high', doc_count: 7, last_doc_timestamp: '2025-01-04T00:00:00Z' },
    ]),
}));

describe('registerAssetInventoryUsageCollector', () => {
  let mockLogger: jest.Mocked<Logger>;
  const mockEsClient = {};
  const mockCollectorFetchContext = { esClient: mockEsClient };

  const mockCoreServicesTuple: [
    CoreStart,
    SecuritySolutionPluginStartDependencies,
    SecuritySolutionPluginStart
  ] = [
    {} as CoreStart,
    {} as SecuritySolutionPluginStartDependencies,
    {} as SecuritySolutionPluginStart,
  ];

  let mockCoreServices: Promise<typeof mockCoreServicesTuple>;

  let mockUsageCollection: UsageCollectionSetup & {
    makeUsageCollector: jest.Mock;
    registerCollector: jest.Mock;
  };

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<Logger>;

    mockCoreServices = Promise.resolve(mockCoreServicesTuple);

    mockUsageCollection = {
      makeUsageCollector: jest.fn().mockImplementation((config) => config),
      registerCollector: jest.fn(),
    } as unknown as UsageCollectionSetup & {
      makeUsageCollector: jest.Mock;
      registerCollector: jest.Mock;
    };

    jest.clearAllMocks();

    registerAssetInventoryUsageCollector(mockLogger, mockCoreServices, mockUsageCollection);
  });

  it('isReady should return true after core services resolve', async () => {
    const { isReady } = mockUsageCollection.makeUsageCollector.mock.results[0].value;
    await expect(isReady()).resolves.toBe(true);
  });

  it('isReady should throw if coreServices fails to resolve', async () => {
    const failingCoreServices = Promise.reject(new Error('Core services failed'));
    registerAssetInventoryUsageCollector(mockLogger, failingCoreServices, mockUsageCollection);

    const { isReady } = mockUsageCollection.makeUsageCollector.mock.results[1].value;
    await expect(isReady()).rejects.toThrow('Core services failed');
  });

  it('fetch should return combined results from all collectors', async () => {
    const { fetch } = mockUsageCollection.makeUsageCollector.mock.results[0].value;

    const result = await fetch(mockCollectorFetchContext);

    expect(result).toEqual({
      entities: mockEntityStatsResult,
      entities_type_stats: mockEntityTypeStatsResult,
      entity_store_stats: mockEntityStoreStatsResult,
      entity_source_stats: mockEntitySourceStatsResult,
      asset_criticality_stats: mockAssetCriticalityStatsResult,
    });

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('Asset Inventory telemetry: Entities payload was sent successfully')
    );
  });

  it('fetch result should have correct AssetInventoryUsage schema shape', async () => {
    const { fetch } = mockUsageCollection.makeUsageCollector.mock.results[0].value;

    const result = await fetch(mockCollectorFetchContext);

    // Check root-level keys exist
    expect(result).toHaveProperty('entities');
    expect(result).toHaveProperty('entities_type_stats');
    expect(result).toHaveProperty('entity_store_stats');
    expect(result).toHaveProperty('entity_source_stats');
    expect(result).toHaveProperty('asset_criticality_stats');

    // Check that arrays are arrays
    expect(Array.isArray(result.entities_type_stats)).toBe(true);
    expect(Array.isArray(result.entity_store_stats)).toBe(true);
    expect(Array.isArray(result.entity_source_stats)).toBe(true);
    expect(Array.isArray(result.asset_criticality_stats)).toBe(true);

    // entities can be string (mock) or object (real) - adapt if needed
    expect(typeof result.entities === 'object' || typeof result.entities === 'string').toBe(true);

    // Validate one entity_type_stats item
    if (result.entities_type_stats.length > 0) {
      const item = result.entities_type_stats[0];
      expect(item).toHaveProperty('entity_type');
      expect(typeof item.entity_type).toBe('string');

      expect(item).toHaveProperty('doc_count');
      expect(typeof item.doc_count).toBe('number');

      expect(item).toHaveProperty('last_doc_timestamp');
      expect(typeof item.last_doc_timestamp).toBe('string');
    }

    // Validate one entity_store_stats item
    if (result.entity_store_stats.length > 0) {
      const item = result.entity_store_stats[0];
      expect(item).toHaveProperty('entity_store');
      expect(typeof item.entity_store).toBe('string');

      expect(item).toHaveProperty('doc_count');
      expect(typeof item.doc_count).toBe('number');
    }

    // Validate one entity_source_stats item
    if (result.entity_source_stats.length > 0) {
      const item = result.entity_source_stats[0];
      expect(item).toHaveProperty('entity_source');
      expect(typeof item.entity_source).toBe('string');

      expect(item).toHaveProperty('doc_count');
      expect(typeof item.doc_count).toBe('number');
    }

    // Validate one asset_criticality_stats item
    if (result.asset_criticality_stats.length > 0) {
      const item = result.asset_criticality_stats[0];
      expect(item).toHaveProperty('criticality');
      expect(typeof item.criticality).toBe('string');

      expect(item).toHaveProperty('doc_count');
      expect(typeof item.doc_count).toBe('number');
    }
  });
});
