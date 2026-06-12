/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TransformGetTransformStatsResponse } from '@elastic/elasticsearch/lib/api/types';
import type { ScopedClusterClientMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { computeHealth } from './compute_health';

const items = [
  { id: 'slo_1', name: 'irrelevant', revision: 1, enabled: true },
  { id: 'slo_2', name: 'irrelevant', revision: 1, enabled: true },
  { id: 'slo_3', name: 'irrelevant', revision: 1, enabled: true },
  { id: 'slo_4', name: 'irrelevant', revision: 1, enabled: true },
  { id: 'slo_5', name: 'irrelevant', revision: 1, enabled: false },
];

describe('computeHealth', () => {
  let mockScopedClusterClient: ScopedClusterClientMock;

  beforeEach(() => {
    mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
  });

  describe('when problematic', () => {
    it('returns problematic when transforms are not found', async () => {
      mockScopedClusterClient.asSecondaryAuthUser.transform.getTransformStats.mockResolvedValue({
        transforms: [],
        count: 0,
      });

      const results = await computeHealth(items, { scopedClusterClient: mockScopedClusterClient });

      expect(results).toHaveLength(5);
      results.forEach((result) => {
        expect(result.health.isProblematic).toBeTruthy();
        expect(result.health.rollup).toEqual({
          isProblematic: true,
          missing: true,
          status: 'unavailable',
          state: 'unavailable',
        });
        expect(result.health.summary).toEqual({
          isProblematic: true,
          missing: true,
          status: 'unavailable',
          state: 'unavailable',
        });
      });
    });

    it('returns problematic when transform is unhealthy', async () => {
      mockScopedClusterClient.asSecondaryAuthUser.transform.getTransformStats.mockResolvedValue({
        transforms: [
          {
            id: 'slo-slo_1-1',
            health: {
              status: 'red',
            },
            state: 'started',
          },
          {
            id: 'slo-summary-slo_1-1',
            health: {
              status: 'yellow',
            },
            state: 'started',
          },
        ],
        count: 1,
      } as TransformGetTransformStatsResponse);

      const results = await computeHealth(
        [{ id: 'slo_1', name: 'irrelevant', revision: 1, enabled: true }],
        { scopedClusterClient: mockScopedClusterClient }
      );

      expect(results).toHaveLength(1);
      expect(results[0].health.isProblematic).toBeTruthy();
      expect(results[0].health.rollup).toEqual({
        isProblematic: true,
        missing: false,
        status: 'unhealthy',
        state: 'started',
        stateMatches: true,
      });
      expect(results[0].health.summary).toEqual({
        isProblematic: true,
        missing: false,
        status: 'unhealthy',
        state: 'started',
        stateMatches: true,
      });
    });

    it('returns problematic when transform state is failed', async () => {
      mockScopedClusterClient.asSecondaryAuthUser.transform.getTransformStats.mockResolvedValue({
        transforms: [
          {
            id: 'slo-slo_1-1',
            health: {
              status: 'green',
            },
            state: 'failed',
          },
          {
            id: 'slo-summary-slo_1-1',
            health: {
              status: 'green',
            },
            state: 'started',
          },
        ],
        count: 1,
      } as TransformGetTransformStatsResponse);

      const results = await computeHealth(
        [{ id: 'slo_1', name: 'irrelevant', revision: 1, enabled: true }],
        { scopedClusterClient: mockScopedClusterClient }
      );

      expect(results).toHaveLength(1);
      expect(results[0].health.isProblematic).toBeTruthy();
      expect(results[0].health.rollup).toEqual({
        isProblematic: true,
        missing: false,
        status: 'healthy',
        state: 'failed',
        stateMatches: false,
      });
      expect(results[0].health.summary).toEqual({
        isProblematic: false,
        missing: false,
        status: 'healthy',
        state: 'started',
        stateMatches: true,
      });
    });

    it('returns problematic when transform state is conflicting (should be started)', async () => {
      mockScopedClusterClient.asSecondaryAuthUser.transform.getTransformStats.mockResolvedValue({
        transforms: [
          {
            id: 'slo-slo_1-1',
            health: {
              status: 'green',
            },
            state: 'stopped',
          },
          {
            id: 'slo-summary-slo_1-1',
            health: {
              status: 'green',
            },
            state: 'stopping',
          },
        ],
        count: 1,
      } as TransformGetTransformStatsResponse);

      const results = await computeHealth(
        [{ id: 'slo_1', name: 'irrelevant', revision: 1, enabled: true }],
        { scopedClusterClient: mockScopedClusterClient }
      );

      expect(results).toHaveLength(1);
      expect(results[0].health.isProblematic).toBeTruthy();
      expect(results[0].health.rollup).toEqual({
        isProblematic: true,
        missing: false,
        status: 'healthy',
        state: 'stopped',
        stateMatches: false,
      });
      expect(results[0].health.summary).toEqual({
        isProblematic: true,
        missing: false,
        status: 'healthy',
        state: 'stopping',
        stateMatches: false,
      });
    });

    it('returns problematic when transform state is conflicting (should be stopped)', async () => {
      mockScopedClusterClient.asSecondaryAuthUser.transform.getTransformStats.mockResolvedValue({
        transforms: [
          {
            id: 'slo-slo_1-1',
            health: {
              status: 'green',
            },
            state: 'started',
          },
          {
            id: 'slo-summary-slo_1-1',
            health: {
              status: 'green',
            },
            state: 'indexing',
          },
        ],
        count: 1,
      } as TransformGetTransformStatsResponse);

      const results = await computeHealth(
        [{ id: 'slo_1', name: 'irrelevant', revision: 1, enabled: false }],
        { scopedClusterClient: mockScopedClusterClient }
      );

      expect(results).toHaveLength(1);
      expect(results[0].health.isProblematic).toBeTruthy();
      expect(results[0].health.rollup).toEqual({
        isProblematic: true,
        missing: false,
        status: 'healthy',
        state: 'started',
        stateMatches: false,
      });
      expect(results[0].health.summary).toEqual({
        isProblematic: true,
        missing: false,
        status: 'healthy',
        state: 'indexing',
        stateMatches: false,
      });
    });
  });
  describe('when healthy', () => {
    it('returns healthy when transforms are healthy and states match', async () => {
      mockScopedClusterClient.asSecondaryAuthUser.transform.getTransformStats.mockResolvedValue({
        transforms: [
          {
            id: 'slo-slo_1-1',
            health: {
              status: 'green',
            },
            state: 'started',
          },
          {
            id: 'slo-summary-slo_1-1',
            health: {
              status: 'green',
            },
            state: 'indexing',
          },
        ],
        count: 1,
      } as TransformGetTransformStatsResponse);

      const results = await computeHealth(
        [{ id: 'slo_1', name: 'irrelevant', revision: 1, enabled: true }],
        { scopedClusterClient: mockScopedClusterClient }
      );

      expect(results).toHaveLength(1);
      expect(results[0].health.isProblematic).toBeFalsy();
      expect(results[0].health.rollup).toEqual({
        isProblematic: false,
        missing: false,
        status: 'healthy',
        state: 'started',
        stateMatches: true,
      });
      expect(results[0].health.summary).toEqual({
        isProblematic: false,
        missing: false,
        status: 'healthy',
        state: 'indexing',
        stateMatches: true,
      });
    });
  });
});
