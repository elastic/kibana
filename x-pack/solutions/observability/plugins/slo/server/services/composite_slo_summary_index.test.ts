/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { COMPOSITE_SUMMARY_INDEX_NAME } from '../../common/constants';
import {
  buildCompositeSloSummaryDocId,
  fetchCompositeSloSummariesFromIndex,
  mapCompositeSummaryIndexSource,
} from './composite_slo_summary_index';

describe('composite_slo_summary_index', () => {
  describe('buildCompositeSloSummaryDocId', () => {
    it('matches task document id format', () => {
      expect(buildCompositeSloSummaryDocId('default', 'abc-123')).toBe('default:abc-123');
    });
  });

  describe('mapCompositeSummaryIndexSource', () => {
    it('maps stored summary fields to API summary shape', () => {
      const persisted = mapCompositeSummaryIndexSource({
        sliValue: 0.99,
        status: 'HEALTHY',
        errorBudgetInitial: 0.01,
        errorBudgetConsumed: 0.2,
        errorBudgetRemaining: 0.8,
        errorBudgetIsEstimated: false,
        fiveMinuteBurnRate: 0.1,
        oneHourBurnRate: 0.2,
        oneDayBurnRate: 0.3,
      });
      expect(persisted?.summary).toEqual({
        sliValue: 0.99,
        status: 'HEALTHY',
        errorBudget: {
          initial: 0.01,
          consumed: 0.2,
          remaining: 0.8,
          isEstimated: false,
        },
        fiveMinuteBurnRate: 0.1,
        oneHourBurnRate: 0.2,
        oneDayBurnRate: 0.3,
      });
      expect(persisted?.members).toBeUndefined();
    });

    it('extracts members when present', () => {
      const persisted = mapCompositeSummaryIndexSource({
        sliValue: 0.99,
        status: 'HEALTHY',
        errorBudgetInitial: 0.01,
        errorBudgetConsumed: 0.2,
        errorBudgetRemaining: 0.8,
        errorBudgetIsEstimated: false,
        fiveMinuteBurnRate: 0.1,
        oneHourBurnRate: 0.2,
        oneDayBurnRate: 0.3,
        members: [
          {
            id: 'slo-a',
            name: 'Service A',
            weight: 6,
            normalisedWeight: 0.6,
            sliValue: 0.995,
            contribution: 0.597,
            status: 'HEALTHY',
          },
        ],
      });
      expect(persisted?.members).toHaveLength(1);
      expect(persisted?.members?.[0].id).toBe('slo-a');
    });

    it('ignores extra keys on the index document', () => {
      const persisted = mapCompositeSummaryIndexSource({
        spaceId: 'default',
        summaryUpdatedAt: '2026-01-01T00:00:00.000Z',
        sliValue: 0.99,
        status: 'HEALTHY',
        errorBudgetInitial: 0.01,
        errorBudgetConsumed: 0.2,
        errorBudgetRemaining: 0.8,
        errorBudgetIsEstimated: false,
        fiveMinuteBurnRate: 0.1,
        oneHourBurnRate: 0.2,
        oneDayBurnRate: 0.3,
      });
      expect(persisted?.summary.sliValue).toBe(0.99);
    });

    it('returns undefined when a field is missing', () => {
      expect(
        mapCompositeSummaryIndexSource({
          sliValue: 0.99,
          status: 'HEALTHY',
        })
      ).toBeUndefined();
    });

    it('returns undefined for invalid status', () => {
      expect(
        mapCompositeSummaryIndexSource({
          sliValue: 0.99,
          status: 'UNKNOWN',
          errorBudgetInitial: 0.01,
          errorBudgetConsumed: 0.2,
          errorBudgetRemaining: 0.8,
          errorBudgetIsEstimated: false,
          fiveMinuteBurnRate: 0.1,
          oneHourBurnRate: 0.2,
          oneDayBurnRate: 0.3,
        })
      ).toBeUndefined();
    });
  });

  describe('fetchCompositeSloSummariesFromIndex', () => {
    it('mgets expected ids and maps found sources', async () => {
      const mget = jest.fn().mockResolvedValue({
        docs: [
          {
            found: true,
            _source: {
              sliValue: 0.99,
              status: 'HEALTHY',
              errorBudgetInitial: 0.01,
              errorBudgetConsumed: 0,
              errorBudgetRemaining: 1,
              errorBudgetIsEstimated: false,
              fiveMinuteBurnRate: 0,
              oneHourBurnRate: 0,
              oneDayBurnRate: 0,
            },
          },
          { found: false },
        ],
      });
      const esClient = { mget } as unknown as import('@kbn/core/server').ElasticsearchClient;

      const map = await fetchCompositeSloSummariesFromIndex(esClient, 'default', [
        'comp-a',
        'comp-b',
      ]);

      expect(mget).toHaveBeenCalledWith({
        index: COMPOSITE_SUMMARY_INDEX_NAME,
        ids: ['default:comp-a', 'default:comp-b'],
      });
      expect(map.size).toBe(1);
      expect(map.get('comp-a')?.summary.sliValue).toBe(0.99);
      expect(map.get('comp-b')).toBeUndefined();
    });
  });
});
