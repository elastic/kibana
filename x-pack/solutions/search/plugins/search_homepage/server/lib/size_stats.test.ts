/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScopedClusterClientMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { fetchSizeStats } from './size_stats';
import type { MeteringStatsResponse } from './types';

describe('fetchSizeStats', () => {
  let mockScopedClusterClient: ScopedClusterClientMock;

  beforeEach(() => {
    mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('serverless mode', () => {
    it('should fetch stats from metering API and return formatted response', async () => {
      const mockMeteringResponse: MeteringStatsResponse = {
        _total: {
          num_docs: 1000000,
          size_in_bytes: 10737418240, // 10 GB in bytes
        },
        indices: [
          {
            name: 'test-index-1',
            num_docs: 500000,
            size_in_bytes: 5368709120,
          },
          {
            name: 'test-index-2',
            num_docs: 500000,
            size_in_bytes: 5368709120,
          },
        ],
      };

      mockScopedClusterClient.asSecondaryAuthUser.transport.request.mockResolvedValue(
        mockMeteringResponse
      );

      const result = await fetchSizeStats(mockScopedClusterClient, true);

      expect(mockScopedClusterClient.asSecondaryAuthUser.transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/_metering/stats',
      });

      expect(result).toEqual({
        sizeStats: {
          size: '10gb',
          documents: 1000000,
        },
      });
    });

    it('should propagate errors from metering API', async () => {
      const error = new Error('Metering API error');
      mockScopedClusterClient.asSecondaryAuthUser.transport.request.mockRejectedValue(error);

      await expect(fetchSizeStats(mockScopedClusterClient, true)).rejects.toThrow(
        'Metering API error'
      );
    });
  });

  describe('hosted/self-managed mode', () => {
    it('should fetch stats from indices stats API and return formatted response', async () => {
      const mockIndicesStatsResponse = {
        indices: {
          'my-user-index': {
            primaries: {
              docs: {
                count: 500000,
                deleted: 0,
              },
            },
            total: {
              store: {
                size_in_bytes: 5368709120, // 5 GB in bytes
                total_data_set_size_in_bytes: 5368709120,
              },
            },
          },
        },
      };

      mockScopedClusterClient.asCurrentUser.indices.stats.mockResolvedValue(
        mockIndicesStatsResponse as any
      );

      const result = await fetchSizeStats(mockScopedClusterClient, false);

      expect(mockScopedClusterClient.asCurrentUser.indices.stats).toHaveBeenCalledWith({
        expand_wildcards: ['open', 'closed'],
        forbid_closed_indices: false,
        metric: ['docs', 'store'],
      });

      expect(result).toEqual({
        sizeStats: {
          size: '5gb',
          documents: 500000,
        },
      });
    });

    it('should exclude dot-prefix (system/hidden) indices from document and size count', async () => {
      const mockIndicesStatsResponse = {
        indices: {
          'my-user-index': {
            primaries: { docs: { count: 300, deleted: 0 } },
            total: { store: { size_in_bytes: 1024 } },
          },
          '.kibana': {
            primaries: { docs: { count: 50000, deleted: 0 } },
            total: { store: { size_in_bytes: 10485760 } },
          },
          '.fleet-actions': {
            primaries: { docs: { count: 100, deleted: 0 } },
            total: { store: { size_in_bytes: 2048 } },
          },
        },
      };

      mockScopedClusterClient.asCurrentUser.indices.stats.mockResolvedValue(
        mockIndicesStatsResponse as any
      );

      const result = await fetchSizeStats(mockScopedClusterClient, false);

      // Only 'my-user-index' should be counted; dot-prefix indices are excluded
      expect(result).toEqual({
        sizeStats: {
          size: '1kb',
          documents: 300,
        },
      });
    });

    it('should return zero documents when only dot-prefix indices exist (new ECH deployment)', async () => {
      const mockIndicesStatsResponse = {
        indices: {
          '.kibana': {
            primaries: { docs: { count: 500, deleted: 0 } },
            total: { store: { size_in_bytes: 1048576 } },
          },
          '.security-7': {
            primaries: { docs: { count: 10, deleted: 0 } },
            total: { store: { size_in_bytes: 4096 } },
          },
        },
      };

      mockScopedClusterClient.asCurrentUser.indices.stats.mockResolvedValue(
        mockIndicesStatsResponse as any
      );

      const result = await fetchSizeStats(mockScopedClusterClient, false);

      expect(result).toEqual({
        sizeStats: {
          size: '0b',
          documents: 0,
        },
      });
    });

    it('should handle missing store stats with default value', async () => {
      const mockIndicesStatsResponse = {
        indices: {
          'my-user-index': {
            primaries: {
              docs: {
                count: 1000,
                deleted: 0,
              },
            },
            total: {},
          },
        },
      };

      mockScopedClusterClient.asCurrentUser.indices.stats.mockResolvedValue(
        mockIndicesStatsResponse as any
      );

      const result = await fetchSizeStats(mockScopedClusterClient, false);

      expect(result).toEqual({
        sizeStats: {
          size: '0b',
          documents: 1000,
        },
      });
    });

    it('should handle missing docs stats with default value', async () => {
      const mockIndicesStatsResponse = {
        indices: {
          'my-user-index': {
            primaries: {},
            total: {
              store: {
                size_in_bytes: 1024000,
              },
            },
          },
        },
      };

      mockScopedClusterClient.asCurrentUser.indices.stats.mockResolvedValue(
        mockIndicesStatsResponse as any
      );

      const result = await fetchSizeStats(mockScopedClusterClient, false);

      expect(result).toEqual({
        sizeStats: {
          size: '1000kb',
          documents: 0,
        },
      });
    });

    it('should handle completely missing indices with defaults', async () => {
      const mockIndicesStatsResponse = {};

      mockScopedClusterClient.asCurrentUser.indices.stats.mockResolvedValue(
        mockIndicesStatsResponse as any
      );

      const result = await fetchSizeStats(mockScopedClusterClient, false);

      expect(result).toEqual({
        sizeStats: {
          size: '0b',
          documents: 0,
        },
      });
    });

    it('should propagate errors from indices stats API', async () => {
      const error = new Error('Indices stats API error');
      mockScopedClusterClient.asCurrentUser.indices.stats.mockRejectedValue(error);

      await expect(fetchSizeStats(mockScopedClusterClient, false)).rejects.toThrow(
        'Indices stats API error'
      );
    });
  });

  describe('byte size formatting', () => {
    it('should format bytes correctly', async () => {
      const testCases = [
        { bytes: 1024, expected: '1kb' },
        { bytes: 1048576, expected: '1mb' },
        { bytes: 1073741824, expected: '1gb' },
        { bytes: 1099511627778, expected: '1024gb' }, // ByteSizeValueUnit doesn't have more than gb
        { bytes: 1536, expected: '1.5kb' },
      ];

      for (const testCase of testCases) {
        const mockMeteringResponse: MeteringStatsResponse = {
          _total: {
            num_docs: 100,
            size_in_bytes: testCase.bytes,
          },
          indices: [],
        };

        mockScopedClusterClient.asSecondaryAuthUser.transport.request.mockResolvedValue(
          mockMeteringResponse
        );

        const result = await fetchSizeStats(mockScopedClusterClient, true);
        expect(result.sizeStats.size).toBe(testCase.expected);
      }
    });
  });
});
