/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { RulesClientApi } from '@kbn/alerting-plugin/server/types';
import type { AlertsClient } from '@kbn/rule-registry-plugin/server';
import { loggerMock } from '@kbn/logging-mocks';
import { ES_PAGESIZE_LIMIT, GetSLOStatsOverview } from './get_slo_stats_overview';
import { getSloSettings, getSummaryIndices } from './slo_settings';
import { getElasticsearchQueryOrThrow } from './transform_generators/common';
import { typedSearch } from '../utils/queries';

const mockSoClient = {
  get: jest.fn(),
} as unknown as SavedObjectsClientContract;

const mockEsClient = {
  search: jest.fn(),
} as unknown as ElasticsearchClient;

const mockScopedClusterClient = {
  asCurrentUser: mockEsClient,
  asInternalUser: mockEsClient,
};

const mockRulesClient = {
  find: jest.fn(),
} as unknown as RulesClientApi;

const mockRacClient = {
  getAlertSummary: jest.fn(),
} as unknown as AlertsClient;

const mockLogger = loggerMock.create();

// Mock problematic dependencies first
jest.mock('@kbn/data-views-plugin/common', () => ({
  DataView: jest.fn(),
}));

jest.mock('./transform_generators/transform_generator', () => ({
  TransformGenerator: class {
    constructor() {}
  },
}));

// Mock the utility functions
jest.mock('./slo_settings', () => ({
  getSloSettings: jest.fn().mockResolvedValue({
    staleThresholdInHours: 24,
  }),
  getSummaryIndices: jest.fn().mockResolvedValue({
    indices: ['.slo-observability.summary-v3'],
  }),
}));

jest.mock('./transform_generators/common', () => {
  const actual = jest.requireActual('./transform_generators/common');
  return {
    ...actual,
    getElasticsearchQueryOrThrow: jest.fn().mockReturnValue({ match_all: {} }),
    // Use the real parseStringFilters implementation
    parseStringFilters: actual.parseStringFilters,
  };
});

jest.mock('../utils/queries', () => ({
  typedSearch: jest.fn(),
}));

// Helper functions to build expected typedSearch payloads
const buildExpectedTypedSearchPayload = (filters: any[] = []) => ({
  index: ['.slo-observability.summary-v3'],
  size: 0,
  query: {
    bool: {
      filter: [
        { term: { spaceId: 'default' } },
        { match_all: {} }, // KQL query (always mocked to match_all)
        ...filters,
      ],
      must_not: [],
    },
  },
  aggs: buildSLOStatsAggregations(),
});

const buildSLOStatsAggregations = () => ({
  stale: {
    filter: {
      range: {
        summaryUpdatedAt: {
          lt: 'now-24h',
        },
      },
    },
  },
  not_stale: {
    filter: {
      range: {
        summaryUpdatedAt: {
          gte: 'now-24h',
        },
      },
    },
    aggs: {
      violated: {
        filter: {
          term: {
            status: 'VIOLATED',
          },
        },
      },
      healthy: {
        filter: {
          term: {
            status: 'HEALTHY',
          },
        },
      },
      degrading: {
        filter: {
          term: {
            status: 'DEGRADING',
          },
        },
      },
      noData: {
        filter: {
          term: {
            status: 'NO_DATA',
          },
        },
      },
    },
  },
});

const expectTypedSearchCalledWith = (additionalFilters: any[] = []) => {
  expect(typedSearch).toHaveBeenCalledWith(
    mockEsClient,
    buildExpectedTypedSearchPayload(additionalFilters)
  );
};

// Helper function to build expected composite query payload for asCurrentUser.search
const buildExpectedCompositeQueryPayload = (boolFilters: any, includeInstanceId = false) => ({
  size: 0,
  aggs: {
    sloIds: {
      composite: {
        size: ES_PAGESIZE_LIMIT,
        sources: [
          {
            sloId: { terms: { field: 'slo.id' } },
          },
          ...(includeInstanceId
            ? [
                {
                  sloInstanceId: { terms: { field: 'slo.instanceId' } },
                },
              ]
            : []),
        ],
      },
    },
  },
  index: ['.slo-observability.summary-v3'],
  ...(Object.values(boolFilters).some((value: any) => Array.isArray(value) && value.length > 0)
    ? {
        query: {
          bool: boolFilters,
        },
      }
    : {}),
});

const expectCompositeQueryCalledWith = (
  boolFilters: any,
  includeInstanceId = false,
  callIndex = 0
) => {
  expect(mockEsClient.search).toHaveBeenNthCalledWith(
    callIndex + 1,
    buildExpectedCompositeQueryPayload(boolFilters, includeInstanceId)
  );
};

describe('GetSLOStatsOverview', () => {
  let service: GetSLOStatsOverview;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset all mocks to their default values
    (mockEsClient.search as jest.Mock).mockResolvedValue({
      hits: { total: { value: 0 } },
      aggregations: { sloIds: { buckets: [] } },
    });

    service = new GetSLOStatsOverview(
      mockSoClient,
      mockScopedClusterClient as any,
      'default',
      mockLogger,
      mockRulesClient,
      mockRacClient
    );
  });

  describe('execute', () => {
    const mockSearchResponse = {
      aggregations: {
        stale: { doc_count: 5 },
        not_stale: {
          violated: { doc_count: 2 },
          degrading: { doc_count: 3 },
          healthy: { doc_count: 10 },
          noData: { doc_count: 1 },
        },
      },
    };

    const mockRulesResponse = {
      total: 15,
      data: [],
    };

    const mockAlertsResponse = {
      activeAlertCount: 8,
      recoveredAlertCount: 12,
    };

    beforeEach(() => {
      (typedSearch as jest.Mock).mockResolvedValue(mockSearchResponse);
      (mockRulesClient.find as jest.Mock).mockResolvedValue(mockRulesResponse);
      (mockRacClient.getAlertSummary as jest.Mock).mockResolvedValue(mockAlertsResponse);
    });

    it('should return SLO stats overview with default parameters', async () => {
      const result = await service.execute({});

      expect(result).toEqual({
        violated: 2,
        degrading: 3,
        healthy: 10,
        noData: 1,
        stale: 5,
        burnRateRules: 15,
        burnRateActiveAlerts: 8, // totalHits is truthy when no filters are provided
        burnRateRecoveredAlerts: 12, // totalHits is truthy when no filters are provided
      });

      expect(getSloSettings).toHaveBeenCalledWith(mockSoClient);
      expect(getSummaryIndices).toHaveBeenCalled();
      expectTypedSearchCalledWith(); // No additional filters for default parameters
      expect(mockRulesClient.find).toHaveBeenCalled();
      expect(mockRacClient.getAlertSummary).toHaveBeenCalled();
    });

    it('should handle KQL query parameter', async () => {
      // Configure mocks for SLO ID composite query
      (mockEsClient.search as jest.Mock).mockResolvedValueOnce({
        hits: { total: { value: 2 } },
        aggregations: {
          sloIds: {
            buckets: [
              { key: { sloId: 'slo-1', sloInstanceId: '*' } },
              { key: { sloId: 'slo-2', sloInstanceId: '*' } },
            ],
          },
        },
      });

      const params = {
        kqlQuery: 'slo.name: "test"',
      };

      const result = await service.execute(params);

      expect(getElasticsearchQueryOrThrow).toHaveBeenCalledWith('slo.name: "test"');
      expectTypedSearchCalledWith(); // No additional filters (KQL is handled by getElasticsearchQueryOrThrow mock)
      // Verify the service executed successfully with KQL query
      expect(result).toEqual({
        violated: 2,
        degrading: 3,
        healthy: 10,
        noData: 1,
        stale: 5,
        burnRateRules: 15,
        burnRateActiveAlerts: 8, // Should be included when SLOs are found
        burnRateRecoveredAlerts: 12, // Should be included when SLOs are found
      });
    });

    it('should handle filters parameter with valid JSON', async () => {
      // Configure mocks for SLO ID composite query
      (mockEsClient.search as jest.Mock).mockResolvedValueOnce({
        hits: { total: { value: 2 } },
        aggregations: {
          sloIds: {
            buckets: [
              { key: { sloId: 'slo-1', sloInstanceId: '*' } },
              { key: { sloId: 'slo-2', sloInstanceId: '*' } },
            ],
          },
        },
      });

      const params = {
        filters: '{"filter": [{"term": {"slo.name": "test"}}]}', // Valid JSON filter
      };

      const result = await service.execute(params);

      // Verify composite query was called with expected payload
      expectCompositeQueryCalledWith({
        filter: [{ term: { 'slo.name': 'test' } }],
      });

      expectTypedSearchCalledWith([{ term: { 'slo.name': 'test' } }]); // From parsed filters
      // Verify the service executed successfully with valid JSON filters
      expect(result).toEqual({
        violated: 2,
        degrading: 3,
        healthy: 10,
        noData: 1,
        stale: 5,
        burnRateRules: 15,
        burnRateActiveAlerts: 8,
        burnRateRecoveredAlerts: 12,
      });
    });

    it('should handle both KQL query and filters', async () => {
      // Configure mocks for SLO ID composite query
      (mockEsClient.search as jest.Mock).mockResolvedValueOnce({
        hits: { total: { value: 2 } },
        aggregations: {
          sloIds: {
            buckets: [
              { key: { sloId: 'slo-1', sloInstanceId: '*' } },
              { key: { sloId: 'slo-2', sloInstanceId: '*' } },
            ],
          },
        },
      });

      const params = {
        kqlQuery: 'slo.name: "test"',
        filters: '{"filter": [{"term": {"slo.tags": "prod"}}]}', // Valid JSON filter
      };

      const result = await service.execute(params);

      expect(getElasticsearchQueryOrThrow).toHaveBeenCalledWith('slo.name: "test"');

      // Verify composite query was called with expected payload
      expectCompositeQueryCalledWith({
        filter: [{ term: { 'slo.tags': 'prod' } }],
        must: [{ kql: { query: 'slo.name: "test"' } }],
      });

      expectTypedSearchCalledWith([{ term: { 'slo.tags': 'prod' } }]); // From parsed filters
      // Verify the service executed successfully with both KQL and filters
      expect(result).toEqual({
        violated: 2,
        degrading: 3,
        healthy: 10,
        noData: 1,
        stale: 5,
        burnRateRules: 15,
        burnRateActiveAlerts: 8,
        burnRateRecoveredAlerts: 12,
      });
    });

    it('should handle SLO ID composite queries when filters are provided', async () => {
      const mockCompositeResponse = {
        hits: { total: { value: 100 } },
        aggregations: {
          sloIds: {
            buckets: [
              { key: { sloId: 'slo-1', sloInstanceId: '*' } },
              { key: { sloId: 'slo-2', sloInstanceId: '*' } },
            ],
          },
        },
      };

      (mockEsClient.search as jest.Mock).mockResolvedValue(mockCompositeResponse);

      const params = {
        filters: '{"filter": [{"term": {"slo.name": "test"}}]}',
      };

      await service.execute(params);

      // Verify composite query was called with expected payload
      expectCompositeQueryCalledWith({
        filter: [{ term: { 'slo.name': 'test' } }],
      });

      // Verify typedSearch was called with correct payload
      expectTypedSearchCalledWith([{ term: { 'slo.name': 'test' } }]);
    });

    it('should handle pagination for composite queries', async () => {
      const mockFirstResponse = {
        hits: { total: { value: 3 } },
        aggregations: {
          sloIds: {
            buckets: [
              { key: { sloId: 'slo-1', sloInstanceId: '*' } },
              { key: { sloId: 'slo-2', sloInstanceId: '*' } },
            ],
            after_key: { sloId: 'slo-2', sloInstanceId: '*' },
          },
        },
      };

      const mockSecondResponse = {
        hits: { total: { value: 3 } },
        aggregations: {
          sloIds: {
            buckets: [{ key: { sloId: 'slo-3', sloInstanceId: '*' } }],
            // No after_key means end of pagination
          },
        },
      };

      (mockEsClient.search as jest.Mock)
        .mockResolvedValueOnce(mockFirstResponse)
        .mockResolvedValueOnce(mockSecondResponse);

      const params = {
        filters: '{"filter": [{"term": {"slo.name": "test"}}]}',
      };

      await service.execute(params);

      // Verify first composite query call
      expectCompositeQueryCalledWith(
        {
          filter: [{ term: { 'slo.name': 'test' } }],
        },
        false,
        0
      );

      // Verify pagination worked correctly - should have been called twice
      expect(mockEsClient.search).toHaveBeenCalledTimes(2);

      // Second call should include the after_key from first response
      const secondCallArgs = (mockEsClient.search as jest.Mock).mock.calls[1][0];
      expect(secondCallArgs.aggs.sloIds.composite.after).toEqual({
        sloId: 'slo-2',
        sloInstanceId: '*',
      });

      // Verify typedSearch was called with correct payload
      expectTypedSearchCalledWith([{ term: { 'slo.name': 'test' } }]);
    });

    it('should skip rules and alerts queries when no SLOs match filters', async () => {
      // Mock empty SLO ID response
      (mockEsClient.search as jest.Mock).mockResolvedValue({
        hits: { total: { value: 0 } },
        aggregations: { sloIds: { buckets: [] } },
      });

      const params = {
        filters: '{"filter": [{"term": {"slo.name": "nonexistent"}}]}',
      };

      const result = await service.execute(params);

      // Verify composite query was called with expected payload
      expectCompositeQueryCalledWith({
        filter: [{ term: { 'slo.name': 'nonexistent' } }],
      });

      expectTypedSearchCalledWith([{ term: { 'slo.name': 'nonexistent' } }]);

      // Should still return results from the main query
      expect(result).toEqual({
        violated: 2,
        degrading: 3,
        healthy: 10,
        noData: 1,
        stale: 5,
        burnRateRules: 0, // Should be 0 when no SLOs match
        burnRateActiveAlerts: 0, // Should be 0 when no SLOs match
        burnRateRecoveredAlerts: 0, // Should be 0 when no SLOs match
      });
    });

    it('should handle instanceId in queries', async () => {
      const mockCompositeResponse = {
        hits: { total: { value: 2 } },
        aggregations: {
          sloIds: {
            buckets: [{ key: { sloId: 'slo-1', sloInstanceId: 'instance-1' } }],
          },
        },
      };

      (mockEsClient.search as jest.Mock).mockResolvedValue(mockCompositeResponse);

      const params = {
        filters: '{"filter": [{"term": {"slo.instanceId": "instance-1"}}]}',
      };

      await service.execute(params);

      // Verify composite query was called with instanceId included
      expectCompositeQueryCalledWith(
        {
          filter: [{ term: { 'slo.instanceId': 'instance-1' } }],
        },
        true
      ); // includeInstanceId = true

      // Verify typedSearch was called with instanceId filter
      expectTypedSearchCalledWith([{ term: { 'slo.instanceId': 'instance-1' } }]);
    });

    it('should handle errors in filter parsing gracefully', async () => {
      // Mock no SLO IDs found to avoid rules/alerts queries
      (mockEsClient.search as jest.Mock).mockResolvedValue({
        hits: { total: { value: 0 } },
        aggregations: { sloIds: { buckets: [] } },
      });

      const params = {
        kqlQuery: 'slo.name: "test"',
        filters: 'invalid-json-filter', // This will fail to parse and return {}
      };

      // The service should continue execution despite filter parsing errors
      const result = await service.execute(params);

      expectTypedSearchCalledWith(); // No additional filters (invalid JSON parsing returns empty)

      // Should still return results from the main query
      expect(result).toEqual({
        violated: 2,
        degrading: 3,
        healthy: 10,
        noData: 1,
        stale: 5,
        burnRateRules: 0, // Should be 0 when no SLOs match the query
        burnRateActiveAlerts: 0, // Should be 0 when no SLOs match the query
        burnRateRecoveredAlerts: 0, // Should be 0 when no SLOs match the query
      });
    });

    it('should handle errors in SLO ID querying gracefully', async () => {
      // Configure mocks to fail on the SLO ID composite query
      (mockEsClient.search as jest.Mock).mockRejectedValue(new Error('ES query failed'));

      const params = {
        filters: '{"filter": [{"term": {"slo.name": "test"}}]}', // Valid JSON filter
      };

      // The service should throw the error since it can't handle ES failures gracefully
      await expect(service.execute(params)).rejects.toThrow('ES query failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error querying SLOs for IDs')
      );
    });

    it('should handle missing aggregations gracefully', async () => {
      // Mock response without aggregations
      (typedSearch as jest.Mock).mockResolvedValue({
        hits: { total: { value: 0 } },
        // No aggregations
      });

      const result = await service.execute({});

      expectTypedSearchCalledWith(); // No additional filters for default params

      // Should handle missing aggregations by defaulting to 0
      expect(result).toEqual({
        violated: 0,
        degrading: 0,
        healthy: 0,
        noData: 0,
        stale: 0,
        burnRateRules: 15,
        burnRateActiveAlerts: 8, // totalHits is truthy for default params
        burnRateRecoveredAlerts: 12, // totalHits is truthy for default params
      });
    });

    it('should handle rules client errors gracefully', async () => {
      (mockRulesClient.find as jest.Mock).mockRejectedValue(new Error('Rules client error'));

      await expect(service.execute({})).rejects.toThrow('Rules client error');

      // Verify typedSearch was still called despite rules client error
      expectTypedSearchCalledWith(); // No additional filters for default params
    });

    it('should handle alerts client errors gracefully', async () => {
      (mockRacClient.getAlertSummary as jest.Mock).mockRejectedValue(
        new Error('Alerts client error')
      );

      await expect(service.execute({})).rejects.toThrow('Alerts client error');

      // Verify typedSearch was still called despite alerts client error
      expectTypedSearchCalledWith(); // No additional filters for default params
    });
  });
});
