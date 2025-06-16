/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClientMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';
import moment from 'moment';
import { SLI_DESTINATION_INDEX_PATTERN } from '../../common/constants';
import { Duration, DurationUnit } from '../domain/models';
import { BurnRatesClient } from './burn_rates_client';
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
