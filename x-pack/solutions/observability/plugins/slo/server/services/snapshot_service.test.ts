/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClientMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { ALL_VALUE } from '@kbn/slo-schema';
import { SLONotFound } from '../errors';
import { SnapshotService } from './snapshot_service';
import { createSLO, createSLOWithTimeslicesBudgetingMethod } from './fixtures/slo';
import { thirtyDaysRolling, sevenDaysRolling, weeklyCalendarAligned } from './fixtures/time_window';
import { createSLORepositoryMock } from './mocks';
import type { SLODefinitionRepository } from './slo_definition_repository';

const AT = new Date('2024-01-15T12:00:00.000Z');

const buildEsResponse = (aggs: Record<string, unknown> = {}) => ({
  took: 5,
  timed_out: false,
  _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
  hits: { hits: [] },
  aggregations: aggs,
});

describe('SnapshotService', () => {
  let esClientMock: ElasticsearchClientMock;
  let repositoryMock: jest.Mocked<SLODefinitionRepository>;

  beforeEach(() => {
    esClientMock = elasticsearchServiceMock.createElasticsearchClient();
    repositoryMock = createSLORepositoryMock();
  });

  const createService = () => new SnapshotService(esClientMock, repositoryMock, 'default');

  describe('bulkCompute', () => {
    it('returns 404 errors for all unknown SLO ids', async () => {
      repositoryMock.findAllByIds.mockResolvedValueOnce([]);
      const service = createService();

      const result = await service.bulkCompute(AT, [{ id: 'unknown-1' }, { id: 'unknown-2' }]);

      expect(result.results).toHaveLength(2);
      expect(result.results[0]).toMatchObject({ id: 'unknown-1', error: { statusCode: 404 } });
      expect(result.results[1]).toMatchObject({ id: 'unknown-2', error: { statusCode: 404 } });
      expect(esClientMock.search).not.toHaveBeenCalled();
    });

    it('returns summary for found SLO and error for missing SLO', async () => {
      const slo = createSLO({ id: 'found-slo', timeWindow: sevenDaysRolling() });
      repositoryMock.findAllByIds.mockResolvedValueOnce([slo]);

      esClientMock.search.mockResolvedValueOnce(
        buildEsResponse({
          specific_0: { doc_count: 100, good: { value: 90 }, total: { value: 100 } },
        }) as any
      );

      const service = createService();
      const result = await service.bulkCompute(AT, [
        { id: 'missing-slo' },
        { id: 'found-slo', instanceId: 'instance-1' },
      ]);

      expect(result.results).toHaveLength(2);
      expect(result.results.find((r) => r.id === 'missing-slo')).toMatchObject({
        id: 'missing-slo',
        error: { statusCode: 404 },
      });
      expect(result.results.find((r) => r.id === 'found-slo')).toMatchObject({
        id: 'found-slo',
        instanceId: 'instance-1',
        summary: expect.objectContaining({ sliValue: 0.9 }),
      });
    });

    it('returns correct sliValue, good, and total for a specific instanceId with data', async () => {
      const slo = createSLO({ id: 'slo-1', timeWindow: sevenDaysRolling() });
      repositoryMock.findAllByIds.mockResolvedValueOnce([slo]);

      esClientMock.search.mockResolvedValueOnce(
        buildEsResponse({
          specific_0: { doc_count: 1000, good: { value: 800 }, total: { value: 1000 } },
        }) as any
      );

      const service = createService();
      const result = await service.bulkCompute(AT, [{ id: 'slo-1', instanceId: 'host-1' }]);

      expect(result.results).toHaveLength(1);
      const item = result.results[0];
      expect(item).toMatchObject({
        id: 'slo-1',
        instanceId: 'host-1',
      });
      if ('summary' in item) {
        expect(item.summary.sliValue).toBe(0.8);
        expect(item.summary.good).toBe(800);
        expect(item.summary.total).toBe(1000);
      }
    });

    it('returns NO_DATA when specific instanceId has no data', async () => {
      const slo = createSLO({ id: 'slo-1', timeWindow: sevenDaysRolling() });
      repositoryMock.findAllByIds.mockResolvedValueOnce([slo]);

      esClientMock.search.mockResolvedValueOnce(
        buildEsResponse({
          specific_0: { doc_count: 0, good: { value: 0 }, total: { value: 0 } },
        }) as any
      );

      const service = createService();
      const result = await service.bulkCompute(AT, [{ id: 'slo-1', instanceId: 'host-1' }]);

      const item = result.results[0];
      expect(item).toMatchObject({ id: 'slo-1', instanceId: 'host-1' });
      if ('summary' in item) {
        expect(item.summary.status).toBe('NO_DATA');
        expect(item.summary.sliValue).toBeNull();
        expect(item.summary.errorBudget.consumed).toBeNull();
      }
    });

    it('returns one result per instance for wildcard request with 2 instances', async () => {
      const slo = createSLO({ id: 'slo-1', timeWindow: sevenDaysRolling() });
      repositoryMock.findAllByIds.mockResolvedValueOnce([slo]);

      esClientMock.search.mockResolvedValueOnce(
        buildEsResponse({
          wildcard_0: {
            doc_count: 200,
            instances: {
              buckets: [
                { key: 'host-1', doc_count: 100, good: { value: 90 }, total: { value: 100 } },
                { key: 'host-2', doc_count: 100, good: { value: 95 }, total: { value: 100 } },
              ],
            },
          },
        }) as any
      );

      const service = createService();
      const result = await service.bulkCompute(AT, [{ id: 'slo-1' }]);

      expect(result.results).toHaveLength(2);
      expect(result.results[0]).toMatchObject({ id: 'slo-1', instanceId: 'host-1' });
      expect(result.results[1]).toMatchObject({ id: 'slo-1', instanceId: 'host-2' });
    });

    it('returns synthetic NO_DATA result for wildcard with no data in window', async () => {
      const slo = createSLO({ id: 'slo-1', timeWindow: sevenDaysRolling() });
      repositoryMock.findAllByIds.mockResolvedValueOnce([slo]);

      esClientMock.search.mockResolvedValueOnce(
        buildEsResponse({
          wildcard_0: {
            doc_count: 0,
            instances: { buckets: [] },
          },
        }) as any
      );

      const service = createService();
      const result = await service.bulkCompute(AT, [{ id: 'slo-1' }]);

      expect(result.results).toHaveLength(1);
      expect(result.results[0]).toMatchObject({ id: 'slo-1', instanceId: ALL_VALUE });
      if ('summary' in result.results[0]) {
        expect(result.results[0].summary.status).toBe('NO_DATA');
        expect(result.results[0].summary.sliValue).toBeNull();
      }
    });

    it('issues a single ES query for two SLOs sharing the same time window', async () => {
      const slo1 = createSLO({ id: 'slo-1', timeWindow: sevenDaysRolling() });
      const slo2 = createSLO({ id: 'slo-2', timeWindow: sevenDaysRolling() });
      repositoryMock.findAllByIds.mockResolvedValueOnce([slo1, slo2]);

      esClientMock.search.mockResolvedValueOnce(
        buildEsResponse({
          specific_0: { doc_count: 100, good: { value: 90 }, total: { value: 100 } },
          specific_1: { doc_count: 200, good: { value: 180 }, total: { value: 200 } },
        }) as any
      );

      const service = createService();
      const result = await service.bulkCompute(AT, [
        { id: 'slo-1', instanceId: 'inst-1' },
        { id: 'slo-2', instanceId: 'inst-1' },
      ]);

      expect(esClientMock.search).toHaveBeenCalledTimes(1);
      expect(result.results).toHaveLength(2);
    });

    it('issues separate ES queries for two SLOs with different time windows', async () => {
      const slo1 = createSLO({ id: 'slo-1', timeWindow: sevenDaysRolling() });
      const slo2 = createSLO({ id: 'slo-2', timeWindow: thirtyDaysRolling() });
      repositoryMock.findAllByIds.mockResolvedValueOnce([slo1, slo2]);

      esClientMock.search
        .mockResolvedValueOnce(
          buildEsResponse({
            specific_0: { doc_count: 100, good: { value: 90 }, total: { value: 100 } },
          }) as any
        )
        .mockResolvedValueOnce(
          buildEsResponse({
            specific_0: { doc_count: 200, good: { value: 180 }, total: { value: 200 } },
          }) as any
        );

      const service = createService();
      const result = await service.bulkCompute(AT, [
        { id: 'slo-1', instanceId: 'inst-1' },
        { id: 'slo-2', instanceId: 'inst-1' },
      ]);

      expect(esClientMock.search).toHaveBeenCalledTimes(2);
      expect(result.results).toHaveLength(2);
    });

    it('uses value_count(isGoodSlice) for timeslices budgeting method', async () => {
      const slo = createSLOWithTimeslicesBudgetingMethod({
        id: 'slo-1',
        timeWindow: sevenDaysRolling(),
      });
      repositoryMock.findAllByIds.mockResolvedValueOnce([slo]);

      esClientMock.search.mockResolvedValueOnce(
        buildEsResponse({
          specific_0: { doc_count: 100, good: { value: 90 }, total: { value: 100 } },
        }) as any
      );

      const service = createService();
      await service.bulkCompute(AT, [{ id: 'slo-1', instanceId: 'inst-1' }]);

      expect(esClientMock.search).toHaveBeenCalledTimes(1);
      const searchCall = esClientMock.search.mock.calls[0][0] as any;
      expect(searchCall.aggs.specific_0.aggs).toEqual({
        good: { sum: { field: 'slo.isGoodSlice' } },
        total: { value_count: { field: 'slo.isGoodSlice' } },
      });
    });

    it('clamps the calendar-aligned date range upper bound to the requested date', async () => {
      const slo = createSLO({ id: 'slo-1', timeWindow: weeklyCalendarAligned() });
      repositoryMock.findAllByIds.mockResolvedValueOnce([slo]);

      esClientMock.search.mockResolvedValueOnce(
        buildEsResponse({
          specific_0: { doc_count: 50, good: { value: 45 }, total: { value: 50 } },
        }) as any
      );

      const midWeek = new Date('2024-01-10T10:00:00.000Z');
      const service = createService();
      await service.bulkCompute(midWeek, [{ id: 'slo-1', instanceId: 'inst-1' }]);

      const searchCall = esClientMock.search.mock.calls[0][0] as any;
      const rangeFilter = searchCall.query.bool.filter.find(
        (f: { range?: unknown }) => f.range !== undefined
      );
      expect(rangeFilter).toBeDefined();
      expect(rangeFilter.range['@timestamp'].gte).toContain('2024-01-08');
      // The calendar week ends 2024-01-14, but a snapshot at `at` must not aggregate
      // documents newer than the requested point in time.
      expect(rangeFilter.range['@timestamp'].lte).toBe('2024-01-10T10:00:00.000Z');
    });

    it('uses the full calendar period for the timeslices denominator, not the elapsed portion', async () => {
      // ISO week of 2024-01-08 (Mon 00:00Z) → 2024-01-14 (Sun 23:59:59.999Z).
      // moment.diff in minutes = 10079  ⇒  Math.ceil(10079 / 2) = 5040 slices (full period).
      // timesliceWindow = 2 minutes.
      // Snapshot at 2024-01-10T10:00Z (~2.4 days elapsed).
      // Elapsed: Math.ceil(3480 / 2) = 1740 slices.
      // good=100, total=200.
      //
      // Correct (full-period denominator):   SLI = 1 - (200 - 100) / 5040 ≈ 0.98016
      // Wrong   (clamped/elapsed denom):     SLI = 1 - (200 - 100) / 1740 ≈ 0.94253
      //
      // The two values are far enough apart to catch the regression unambiguously.
      const slo = createSLOWithTimeslicesBudgetingMethod({
        id: 'slo-cal-timeslices',
        timeWindow: weeklyCalendarAligned(),
      });
      repositoryMock.findAllByIds.mockResolvedValueOnce([slo]);

      esClientMock.search.mockResolvedValueOnce(
        buildEsResponse({
          specific_0: { doc_count: 200, good: { value: 100 }, total: { value: 200 } },
        }) as any
      );

      const midWeek = new Date('2024-01-10T10:00:00.000Z');
      const service = createService();
      const result = await service.bulkCompute(midWeek, [
        { id: 'slo-cal-timeslices', instanceId: 'inst-1' },
      ]);

      // Query is still clamped to `at`
      const searchCall = esClientMock.search.mock.calls[0][0] as any;
      const rangeFilter = searchCall.query.bool.filter.find(
        (f: { range?: unknown }) => f.range !== undefined
      );
      expect(rangeFilter.range['@timestamp'].lte).toBe('2024-01-10T10:00:00.000Z');

      // SLI must use the full 7-day period (2520 slices), not the elapsed ~2.4 days
      const item = result.results[0];
      expect(item).toMatchObject({ id: 'slo-cal-timeslices', instanceId: 'inst-1' });
      if ('summary' in item) {
        // Full-period: 1 - (200 - 100) / 5040 ≈ 0.98016
        expect(item.summary.sliValue).toBeCloseTo(1 - 100 / 5040, 4);
        // Elapsed-period value (wrong): 1 - 100 / 1740 ≈ 0.94253 — must not match
        expect(item.summary.sliValue).not.toBeCloseTo(1 - 100 / 1740, 3);
      }
    });

    it('returns per-item errors when a time-window group query fails', async () => {
      const slo1 = createSLO({ id: 'slo-1', timeWindow: sevenDaysRolling() });
      const slo2 = createSLO({ id: 'slo-2', timeWindow: thirtyDaysRolling() });
      repositoryMock.findAllByIds.mockResolvedValueOnce([slo1, slo2]);

      esClientMock.search
        .mockResolvedValueOnce(
          buildEsResponse({
            specific_0: { doc_count: 100, good: { value: 90 }, total: { value: 100 } },
          }) as any
        )
        .mockRejectedValueOnce(new Error('search failed'));

      const service = createService();
      const result = await service.bulkCompute(AT, [
        { id: 'slo-1', instanceId: 'inst-1' },
        { id: 'slo-2', instanceId: 'inst-1' },
      ]);

      expect(result.results).toHaveLength(2);
      expect(result.results.find((r) => r.id === 'slo-1')).toMatchObject({
        id: 'slo-1',
        instanceId: 'inst-1',
        summary: expect.objectContaining({ sliValue: 0.9 }),
      });
      expect(result.results.find((r) => r.id === 'slo-2')).toMatchObject({
        id: 'slo-2',
        instanceId: 'inst-1',
        error: { statusCode: 500, message: 'search failed' },
      });
    });
  });

  describe('compute', () => {
    it('throws SLONotFound when the SLO id is unknown', async () => {
      repositoryMock.findAllByIds.mockResolvedValueOnce([]);
      const service = createService();

      await expect(service.compute(AT, 'unknown-slo')).rejects.toThrow(SLONotFound);
      expect(esClientMock.search).not.toHaveBeenCalled();
    });

    it('returns a single result with correct sliValue, good, and total for a specific instanceId', async () => {
      const slo = createSLO({ id: 'slo-1', timeWindow: sevenDaysRolling() });
      repositoryMock.findAllByIds.mockResolvedValueOnce([slo]);

      esClientMock.search.mockResolvedValueOnce(
        buildEsResponse({
          specific_0: { doc_count: 1000, good: { value: 800 }, total: { value: 1000 } },
        }) as any
      );

      const service = createService();
      const result = await service.compute(AT, 'slo-1', 'host-1');

      expect(result.at).toBe(AT.toISOString());
      expect(result.results).toHaveLength(1);
      const item = result.results[0];
      expect(item).toMatchObject({ id: 'slo-1', instanceId: 'host-1' });
      if ('summary' in item) {
        expect(item.summary.sliValue).toBe(0.8);
        expect(item.summary.good).toBe(800);
        expect(item.summary.total).toBe(1000);
      }
    });

    it('returns a single NO_DATA result when the specific instanceId has no data', async () => {
      const slo = createSLO({ id: 'slo-1', timeWindow: sevenDaysRolling() });
      repositoryMock.findAllByIds.mockResolvedValueOnce([slo]);

      esClientMock.search.mockResolvedValueOnce(
        buildEsResponse({
          specific_0: { doc_count: 0, good: { value: 0 }, total: { value: 0 } },
        }) as any
      );

      const service = createService();
      const result = await service.compute(AT, 'slo-1', 'host-1');

      expect(result.results).toHaveLength(1);
      const item = result.results[0];
      expect(item).toMatchObject({ id: 'slo-1', instanceId: 'host-1' });
      if ('summary' in item) {
        expect(item.summary.status).toBe('NO_DATA');
        expect(item.summary.sliValue).toBeNull();
        expect(item.summary.errorBudget.consumed).toBeNull();
      }
    });

    it('returns one result per instance when instanceId is omitted', async () => {
      const slo = createSLO({ id: 'slo-1', timeWindow: sevenDaysRolling() });
      repositoryMock.findAllByIds.mockResolvedValueOnce([slo]);

      esClientMock.search.mockResolvedValueOnce(
        buildEsResponse({
          wildcard_0: {
            doc_count: 200,
            instances: {
              buckets: [
                { key: 'host-1', doc_count: 100, good: { value: 90 }, total: { value: 100 } },
                { key: 'host-2', doc_count: 100, good: { value: 95 }, total: { value: 100 } },
              ],
            },
          },
        }) as any
      );

      const service = createService();
      const result = await service.compute(AT, 'slo-1');

      expect(result.results).toHaveLength(2);
      expect(result.results[0]).toMatchObject({ id: 'slo-1', instanceId: 'host-1' });
      expect(result.results[1]).toMatchObject({ id: 'slo-1', instanceId: 'host-2' });
    });
  });
});
