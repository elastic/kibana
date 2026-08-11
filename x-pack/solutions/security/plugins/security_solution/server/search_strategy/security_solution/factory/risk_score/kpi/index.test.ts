/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from '@kbn/search-types';
import { RiskSeverity, EntityType } from '../../../../../../common/search_strategy';
import { kpiRiskScore } from '.';
import * as buildQuery from './query.kpi_risk_score.dsl';

import { mockOptions } from './__mocks__';

describe('buildKpiRiskScoreQuery search strategy', () => {
  const buildKpiRiskScoreQuery = jest.spyOn(buildQuery, 'buildKpiRiskScoreQuery');

  describe('buildDsl', () => {
    test('should build dsl query', () => {
      kpiRiskScore.buildDsl(mockOptions);
      expect(buildKpiRiskScoreQuery).toHaveBeenCalledWith(mockOptions);
    });
  });

  describe('parse', () => {
    it('should aggregate severity counts from single entity type', async () => {
      const mockResponse: IEsSearchResponse<unknown> = {
        rawResponse: {
          took: 1,
          timed_out: false,
          _shards: {
            total: 2,
            successful: 2,
            skipped: 0,
            failed: 0,
          },
          hits: {
            total: 0,
            max_score: 0,
            hits: [],
          },
          aggregations: {
            host: {
              buckets: [
                {
                  key: RiskSeverity.Critical,
                  doc_count: 10,
                  unique_entries: { value: 1 },
                },
                {
                  key: RiskSeverity.High,
                  doc_count: 20,
                  unique_entries: { value: 2 },
                },
                {
                  key: RiskSeverity.Moderate,
                  doc_count: 15,
                  unique_entries: { value: 3 },
                },
              ],
            },
          },
        },
        isPartial: false,
        isRunning: false,
        total: 0,
        loaded: 0,
      };

      const result = await kpiRiskScore.parse(mockOptions, mockResponse);

      expect(result.kpiRiskScore).toEqual({
        [RiskSeverity.Unknown]: 0,
        [RiskSeverity.Low]: 0,
        [RiskSeverity.Moderate]: 3,
        [RiskSeverity.High]: 2,
        [RiskSeverity.Critical]: 1,
      });
    });

    it('should aggregate severity counts from multiple entity types', async () => {
      const mockResponse: IEsSearchResponse<unknown> = {
        rawResponse: {
          took: 1,
          timed_out: false,
          _shards: {
            total: 2,
            successful: 2,
            skipped: 0,
            failed: 0,
          },
          hits: {
            total: 0,
            max_score: 0,
            hits: [],
          },
          aggregations: {
            host: {
              buckets: [
                {
                  key: RiskSeverity.Critical,
                  doc_count: 10,
                  unique_entries: { value: 1 },
                },
                {
                  key: RiskSeverity.High,
                  doc_count: 20,
                  unique_entries: { value: 2 },
                },
              ],
            },
            user: {
              buckets: [
                {
                  key: RiskSeverity.High,
                  doc_count: 15,
                  unique_entries: { value: 3 },
                },
                {
                  key: RiskSeverity.Low,
                  doc_count: 5,
                  unique_entries: { value: 4 },
                },
              ],
            },
          },
        },
        isPartial: false,
        isRunning: false,
        total: 0,
        loaded: 0,
      };

      const optionsWithMultipleEntities = {
        ...mockOptions,
        entity: [EntityType.host, EntityType.user],
      };

      const result = await kpiRiskScore.parse(optionsWithMultipleEntities, mockResponse);

      expect(result.kpiRiskScore).toEqual({
        [RiskSeverity.Unknown]: 0,
        [RiskSeverity.Low]: 4,
        [RiskSeverity.Moderate]: 0,
        [RiskSeverity.High]: 5, // 2 from host + 3 from user
        [RiskSeverity.Critical]: 1,
      });
    });

    it('should calculate total count correctly', async () => {
      const mockResponse: IEsSearchResponse<unknown> = {
        rawResponse: {
          took: 1,
          timed_out: false,
          _shards: {
            total: 2,
            successful: 2,
            skipped: 0,
            failed: 0,
          },
          hits: {
            total: 0,
            max_score: 0,
            hits: [],
          },
          aggregations: {
            host: {
              buckets: [
                {
                  key: RiskSeverity.Critical,
                  doc_count: 10,
                  unique_entries: { value: 1 },
                },
                {
                  key: RiskSeverity.High,
                  doc_count: 20,
                  unique_entries: { value: 2 },
                },
                {
                  key: RiskSeverity.Moderate,
                  doc_count: 15,
                  unique_entries: { value: 3 },
                },
                {
                  key: RiskSeverity.Low,
                  doc_count: 5,
                  unique_entries: { value: 4 },
                },
              ],
            },
          },
        },
        isPartial: false,
        isRunning: false,
        total: 0,
        loaded: 0,
      };

      const result = await kpiRiskScore.parse(mockOptions, mockResponse);

      const total = Object.values(result.kpiRiskScore).reduce((sum, count) => sum + count, 0);
      expect(total).toBe(10); // 1 + 2 + 3 + 4
    });

    it('should handle empty aggregations', async () => {
      const mockResponse: IEsSearchResponse<unknown> = {
        rawResponse: {
          took: 1,
          timed_out: false,
          _shards: {
            total: 2,
            successful: 2,
            skipped: 0,
            failed: 0,
          },
          hits: {
            total: 0,
            max_score: 0,
            hits: [],
          },
          aggregations: {
            host: {
              buckets: [],
            },
          },
        },
        isPartial: false,
        isRunning: false,
        total: 0,
        loaded: 0,
      };

      const result = await kpiRiskScore.parse(mockOptions, mockResponse);

      expect(result.kpiRiskScore).toEqual({
        [RiskSeverity.Unknown]: 0,
        [RiskSeverity.Low]: 0,
        [RiskSeverity.Moderate]: 0,
        [RiskSeverity.High]: 0,
        [RiskSeverity.Critical]: 0,
      });
    });

    it('should handle missing aggregations', async () => {
      const mockResponse: IEsSearchResponse<unknown> = {
        rawResponse: {
          took: 1,
          timed_out: false,
          _shards: {
            total: 2,
            successful: 2,
            skipped: 0,
            failed: 0,
          },
          hits: {
            total: 0,
            max_score: 0,
            hits: [],
          },
        },
        isPartial: false,
        isRunning: false,
        total: 0,
        loaded: 0,
      };

      const result = await kpiRiskScore.parse(mockOptions, mockResponse);

      expect(result.kpiRiskScore).toEqual({
        [RiskSeverity.Unknown]: 0,
        [RiskSeverity.Low]: 0,
        [RiskSeverity.Moderate]: 0,
        [RiskSeverity.High]: 0,
        [RiskSeverity.Critical]: 0,
      });
    });

    it('should include inspect object in response', async () => {
      const mockResponse: IEsSearchResponse<unknown> = {
        rawResponse: {
          took: 1,
          timed_out: false,
          _shards: {
            total: 2,
            successful: 2,
            skipped: 0,
            failed: 0,
          },
          hits: {
            total: 0,
            max_score: 0,
            hits: [],
          },
          aggregations: {
            host: {
              buckets: [],
            },
          },
        },
        isPartial: false,
        isRunning: false,
        total: 0,
        loaded: 0,
      };

      const result = await kpiRiskScore.parse(mockOptions, mockResponse);

      expect(result.inspect).toBeDefined();
      expect(result.inspect?.dsl).toBeDefined();
      expect(Array.isArray(result.inspect?.dsl)).toBe(true);
    });
  });
});
