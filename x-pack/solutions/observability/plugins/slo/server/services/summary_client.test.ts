/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClientMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import moment from 'moment';
import { SLI_DESTINATION_INDEX_PATTERN } from '../../common/constants';
import { Duration, DurationUnit } from '../domain/models';
import type { BurnRatesClient } from './burn_rates_client';
import { createSLO } from './fixtures/slo';
import { sevenDaysRolling, weeklyCalendarAligned } from './fixtures/time_window';
import { createBurnRatesClientMock } from './mocks';
import { DefaultSummaryClient } from './summary_client';

const createEsResponse = (good: number = 90, total: number = 100) => ({
  took: 100,
  timed_out: false,
  _shards: {
    total: 0,
    successful: 0,
    skipped: 0,
    failed: 0,
  },
  hits: {
    hits: [],
  },
  aggregations: {
    good: { value: good },
    total: { value: total },
  },
});

describe('SummaryClient', () => {
  let esClientMock: ElasticsearchClientMock;
  let burnRatesClientMock: jest.Mocked<BurnRatesClient>;

  beforeEach(() => {
    esClientMock = elasticsearchServiceMock.createElasticsearchClient();
    burnRatesClientMock = createBurnRatesClientMock();

    burnRatesClientMock.calculate.mockResolvedValueOnce([
      { name: '5m', burnRate: 0.5, sli: 0.9 },
      { name: '1h', burnRate: 0.6, sli: 0.9 },
      { name: '1d', burnRate: 0.7, sli: 0.9 },
    ]);
  });

  describe('computeSummaries', () => {
    it('uses named filter aggregations when all members share the same index and date range', async () => {
      const slo1 = createSLO({ timeWindow: sevenDaysRolling() });
      const slo2 = createSLO({ timeWindow: sevenDaysRolling() });
      const sharedTimeWindow = sevenDaysRolling();

      esClientMock.search.mockResolvedValueOnce({
        took: 10,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: { hits: [] },
        aggregations: {
          member_0: { doc_count: 100, good: { value: 90 }, total: { value: 100 } },
          member_1: { doc_count: 200, good: { value: 180 }, total: { value: 200 } },
        },
      } as any);

      burnRatesClientMock.calculateBatch.mockResolvedValueOnce([
        [
          { name: '5m', burnRate: 0.5, sli: 0.9 },
          { name: '1h', burnRate: 0.6, sli: 0.9 },
          { name: '1d', burnRate: 0.7, sli: 0.9 },
        ],
        [
          { name: '5m', burnRate: 0.3, sli: 0.9 },
          { name: '1h', burnRate: 0.4, sli: 0.9 },
          { name: '1d', burnRate: 0.5, sli: 0.9 },
        ],
      ]);

      const summaryClient = new DefaultSummaryClient(esClientMock, burnRatesClientMock);
      const results = await summaryClient.computeSummaries([
        { slo: slo1, timeWindowOverride: sharedTimeWindow },
        { slo: slo2, timeWindowOverride: sharedTimeWindow },
      ]);

      expect(results).toHaveLength(2);
      expect(results[0].summary.sliValue).toEqual(0.9);
      expect(results[1].summary.sliValue).toEqual(0.9);

      expect(esClientMock.search).toHaveBeenCalledTimes(1);
      expect(esClientMock.msearch).not.toHaveBeenCalled();

      const searchCall = esClientMock.search.mock.calls[0][0] as any;
      expect(searchCall.query.bool.filter).toEqual(
        expect.arrayContaining([
          { terms: { 'slo.id': expect.arrayContaining([slo1.id, slo2.id]) } },
        ])
      );
      expect(searchCall.aggs.member_0.filter.bool.filter).toEqual(
        expect.arrayContaining([
          { term: { 'slo.id': slo1.id } },
          { term: { 'slo.revision': slo1.revision } },
        ])
      );
      expect(searchCall.aggs.member_1.filter.bool.filter).toEqual(
        expect.arrayContaining([
          { term: { 'slo.id': slo2.id } },
          { term: { 'slo.revision': slo2.revision } },
        ])
      );
    });

    it('falls back to msearch when members use different indices', async () => {
      const slo1 = createSLO({ timeWindow: sevenDaysRolling() });
      const slo2 = createSLO({ timeWindow: sevenDaysRolling() });
      const sharedTimeWindow = sevenDaysRolling();

      esClientMock.msearch.mockResolvedValueOnce({
        took: 10,
        responses: [
          {
            took: 5,
            timed_out: false,
            _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
            hits: { hits: [] },
            aggregations: { good: { value: 90 }, total: { value: 100 } },
            status: 200,
          },
          {
            took: 5,
            timed_out: false,
            _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
            hits: { hits: [] },
            aggregations: { good: { value: 80 }, total: { value: 100 } },
            status: 200,
          },
        ],
      } as any);

      burnRatesClientMock.calculateBatch.mockResolvedValueOnce([
        [
          { name: '5m', burnRate: 0.5, sli: 0.9 },
          { name: '1h', burnRate: 0.6, sli: 0.9 },
          { name: '1d', burnRate: 0.7, sli: 0.9 },
        ],
        [
          { name: '5m', burnRate: 0.3, sli: 0.8 },
          { name: '1h', burnRate: 0.4, sli: 0.8 },
          { name: '1d', burnRate: 0.5, sli: 0.8 },
        ],
      ]);

      const summaryClient = new DefaultSummaryClient(esClientMock, burnRatesClientMock);
      const results = await summaryClient.computeSummaries([
        { slo: slo1, timeWindowOverride: sharedTimeWindow },
        { slo: slo2, timeWindowOverride: sharedTimeWindow, remoteName: 'remote_cluster' },
      ]);

      expect(results).toHaveLength(2);
      expect(esClientMock.msearch).toHaveBeenCalledTimes(1);
      expect(esClientMock.search).not.toHaveBeenCalled();
    });

    it('falls back to msearch for a single member', async () => {
      const slo1 = createSLO({ timeWindow: sevenDaysRolling() });

      esClientMock.msearch.mockResolvedValueOnce({
        took: 10,
        responses: [
          {
            took: 5,
            timed_out: false,
            _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
            hits: { hits: [] },
            aggregations: { good: { value: 90 }, total: { value: 100 } },
            status: 200,
          },
        ],
      } as any);

      burnRatesClientMock.calculateBatch.mockResolvedValueOnce([
        [
          { name: '5m', burnRate: 0.5, sli: 0.9 },
          { name: '1h', burnRate: 0.6, sli: 0.9 },
          { name: '1d', burnRate: 0.7, sli: 0.9 },
        ],
      ]);

      const summaryClient = new DefaultSummaryClient(esClientMock, burnRatesClientMock);
      const results = await summaryClient.computeSummaries([{ slo: slo1 }]);

      expect(results).toHaveLength(1);
      expect(esClientMock.msearch).toHaveBeenCalledTimes(1);
      expect(esClientMock.search).not.toHaveBeenCalled();
    });
  });

  describe('fetchSummary', () => {
    describe('with rolling and occurrences SLO', () => {
      it('returns the summary', async () => {
        const slo = createSLO({ timeWindow: sevenDaysRolling() });
        esClientMock.search.mockResolvedValueOnce(createEsResponse());
        const summaryClient = new DefaultSummaryClient(esClientMock, burnRatesClientMock);

        const result = await summaryClient.computeSummary({ slo });

        expect(result).toMatchSnapshot();
        expect(esClientMock.search.mock.calls[0][0]).toEqual({
          index: SLI_DESTINATION_INDEX_PATTERN,
          size: 0,
          query: {
            bool: {
              filter: [
                { term: { 'slo.id': slo.id } },
                { term: { 'slo.revision': slo.revision } },
                {
                  range: {
                    '@timestamp': { gte: expect.anything(), lte: expect.anything() },
                  },
                },
              ],
            },
          },
          aggs: {
            good: { sum: { field: 'slo.numerator' } },
            total: { sum: { field: 'slo.denominator' } },
          },
        });
      });
    });

    describe('with calendar aligned and occurrences SLO', () => {
      it('returns the summary', async () => {
        const slo = createSLO({
          timeWindow: weeklyCalendarAligned(),
        });
        esClientMock.search.mockResolvedValueOnce(createEsResponse());
        const summaryClient = new DefaultSummaryClient(esClientMock, burnRatesClientMock);

        await summaryClient.computeSummary({ slo });

        expect(esClientMock.search.mock.calls[0][0]).toEqual({
          index: SLI_DESTINATION_INDEX_PATTERN,
          size: 0,
          query: {
            bool: {
              filter: [
                { term: { 'slo.id': slo.id } },
                { term: { 'slo.revision': slo.revision } },
                {
                  range: {
                    '@timestamp': {
                      gte: expect.anything(),
                      lte: expect.anything(),
                    },
                  },
                },
              ],
            },
          },
          aggs: {
            good: { sum: { field: 'slo.numerator' } },
            total: { sum: { field: 'slo.denominator' } },
          },
        });
      });
    });

    describe('with rolling and timeslices SLO', () => {
      it('returns the summary', async () => {
        const slo = createSLO({
          budgetingMethod: 'timeslices',
          objective: {
            target: 0.95,
            timesliceTarget: 0.9,
            timesliceWindow: new Duration(10, DurationUnit.Minute),
          },
          timeWindow: sevenDaysRolling(),
        });
        esClientMock.search.mockResolvedValueOnce(createEsResponse());
        const summaryClient = new DefaultSummaryClient(esClientMock, burnRatesClientMock);

        const result = await summaryClient.computeSummary({ slo });

        expect(result).toMatchSnapshot();
        expect(esClientMock.search.mock.calls[0][0]).toEqual({
          index: SLI_DESTINATION_INDEX_PATTERN,
          size: 0,
          query: {
            bool: {
              filter: [
                { term: { 'slo.id': slo.id } },
                { term: { 'slo.revision': slo.revision } },
                {
                  range: {
                    '@timestamp': { gte: expect.anything(), lte: expect.anything() },
                  },
                },
              ],
            },
          },
          aggs: {
            good: { sum: { field: 'slo.isGoodSlice' } },
            total: { value_count: { field: 'slo.isGoodSlice' } },
          },
        });
      });
    });

    describe('with calendar aligned and timeslices SLO', () => {
      it('returns the summary', async () => {
        const slo = createSLO({
          budgetingMethod: 'timeslices',
          objective: {
            target: 0.95,
            timesliceTarget: 0.9,
            timesliceWindow: new Duration(10, DurationUnit.Minute),
          },
          timeWindow: weeklyCalendarAligned(),
        });
        esClientMock.search.mockResolvedValueOnce(createEsResponse());
        const summaryClient = new DefaultSummaryClient(esClientMock, burnRatesClientMock);

        const result = await summaryClient.computeSummary({ slo });

        expect(result).toMatchSnapshot();

        expect(esClientMock.search.mock.calls[0][0]).toEqual({
          index: SLI_DESTINATION_INDEX_PATTERN,
          size: 0,
          query: {
            bool: {
              filter: [
                { term: { 'slo.id': slo.id } },
                { term: { 'slo.revision': slo.revision } },
                {
                  range: {
                    '@timestamp': {
                      gte: expect.anything(),
                      lte: expect.anything(),
                    },
                  },
                },
              ],
            },
          },
          aggs: {
            good: { sum: { field: 'slo.isGoodSlice' } },
            total: { value_count: { field: 'slo.isGoodSlice' } },
          },
        });
      });
    });
  });
});

expect.extend({
  toBeClose(received: Date | string, actual: Date | string) {
    const receivedDate = moment(received);
    const actualDate = moment(actual);
    return {
      message: () =>
        `expected ${receivedDate.toISOString()} to be close to ${actualDate.toISOString()}`,
      pass: Math.abs(receivedDate.diff(actualDate, 'seconds')) <= 120,
    };
  },
});

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toBeClose(actual: Date | string): R;
    }
  }
}
