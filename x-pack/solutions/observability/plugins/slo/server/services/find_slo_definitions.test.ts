/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TransformGetTransformStatsTransformStats } from '@elastic/elasticsearch/lib/api/types';
import { elasticsearchServiceMock, type ScopedClusterClientMock } from '@kbn/core/server/mocks';
import type { FindSLODefinitionsWithHealthResponse } from '@kbn/slo-schema';
import { getSLOSummaryTransformId, getSLOTransformId } from '../../common/constants';
import { createSLO } from './fixtures/slo';
import { aHitFromSummaryIndex, aSummaryDocument } from './fixtures/summary_search_document';
import { createSLORepositoryMock } from './mocks';
import type { SLORepository } from './slo_repository';
import { FindSLODefinitions } from './find_slo_definitions';

describe('FindSLODefinitions with Health validation', () => {
  let mockRepository: jest.Mocked<SLORepository>;
  let findSLODefinitions: FindSLODefinitions;
  let mockScopedClusterClient: ScopedClusterClientMock;

  const generateSearchResponse = (hits: any[]) => ({
    took: 0,
    timed_out: false,
    _shards: {
      total: hits.length,
      successful: hits.length,
      skipped: 0,
      failed: 0,
    },
    hits: {
      total: {
        value: 1,
        relation: 'eq' as const,
      },
      max_score: 1,
      hits,
    },
  });

  const slo = createSLO();
  beforeEach(() => {
    mockRepository = createSLORepositoryMock();
    mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
    findSLODefinitions = new FindSLODefinitions(mockRepository, mockScopedClusterClient);
  });

  const results = {
    page: 1,
    perPage: 10,
    total: 1,
    results: [slo],
  };

  describe('validate health response', () => {
    it('calls the repository with includeHealth', async () => {
      mockRepository.search.mockResolvedValueOnce(results);
      // Mock the search response for computeHealth which uses asCurrentUser.search

      const searchResponse = generateSearchResponse([
        aHitFromSummaryIndex(aSummaryDocument(slo)),
        aHitFromSummaryIndex(aSummaryDocument(slo)),
      ]);
      mockScopedClusterClient.asCurrentUser.search.mockResolvedValue(searchResponse); // Mock the transform stats response with healthy transforms
      mockScopedClusterClient.asSecondaryAuthUser.transform.getTransformStats.mockResolvedValue({
        transforms: [
          {
            id: getSLOTransformId(slo.id, slo.revision),
            health: { status: 'green' },
            state: 'started',
          } as TransformGetTransformStatsTransformStats,
          {
            id: getSLOSummaryTransformId(slo.id, slo.revision),
            health: { status: 'green' },
            state: 'started',
          } as TransformGetTransformStatsTransformStats,
        ],
      } as any);

      const result: FindSLODefinitionsWithHealthResponse = await findSLODefinitions.execute({
        includeHealth: true,
      });

      expect(mockRepository.search).toHaveBeenCalledWith(
        '',
        { page: 1, perPage: 100 },
        {
          includeOutdatedOnly: false,
          tags: [],
        }
      );

      expect(result.results[0].health).toEqual({
        overall: 'healthy',
        rollup: {
          status: 'healthy',
          alignedWithSLO: true,
          transformState: 'started',
        },
        summary: {
          status: 'healthy',
          alignedWithSLO: true,
          transformState: 'started',
        },
      });
    });

    it('does not call computeHealth without includeHealth', async () => {
      mockRepository.search.mockResolvedValueOnce(results);

      const result: FindSLODefinitionsWithHealthResponse = await findSLODefinitions.execute({
        includeHealth: false,
      });

      expect(mockScopedClusterClient.asCurrentUser.search).not.toHaveBeenCalled();
      expect(mockRepository.search).toHaveBeenCalledWith(
        '',
        { page: 1, perPage: 100 },
        {
          includeOutdatedOnly: false,
          tags: [],
        }
      );

      expect(result.results[0].health).toEqual(undefined);
    });
  });
});
