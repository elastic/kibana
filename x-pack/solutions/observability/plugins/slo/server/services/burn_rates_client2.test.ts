/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_VALUE } from '@kbn/slo-schema';
import { Duration, DurationUnit } from '../domain/models';
import { DefaultBurnRatesClient } from './burn_rates_client';
import { createSLO } from './fixtures/slo';
import ElasticsearchMock from '@elastic/elasticsearch-mock';
import { Client } from '@elastic/elasticsearch';

const commonEsResponse = {
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
};

// const TEST_DATE = new Date('2023-01-01T00:00:00.000Z');

describe('SummaryClient', () => {
  const esMock = new ElasticsearchMock();
  const esClientMock = new Client({
    node: 'http://localhost:9200', // required but will not actually be used
    Connection: esMock.getConnection(), // critical for intercepting requests
  });
  const searchSpy = jest.spyOn(esClientMock, 'search');
  beforeEach(() => {
    // jest.useFakeTimers().setSystemTime(TEST_DATE);
    esMock.clearAll();
  });

  afterAll(() => {
    // jest.useRealTimers();
  });

  const expectTimeDifferences = (
    longRange: { from: string; to: string },
    shortRange: { from: string; to: string },
    expectedLong: number,
    expectedShort: number,
    unit: 'minutes' | 'hours'
  ) => {
    const getDiff = (from: string, to: string) => {
      const diffMs = Math.abs(new Date(to).getTime() - new Date(from).getTime());
      return unit === 'hours' ? diffMs / (1000 * 60 * 60) : diffMs / (1000 * 60);
    };

    expect(getDiff(longRange.from, longRange.to)).toBe(expectedLong);
    expect(getDiff(shortRange.from, shortRange.to)).toBe(expectedShort);
  };

  describe('burnRatesClient', () => {
    const LONG_WINDOW = 'long_window';
    const SHORT_WINDOW = 'short_window';

    describe('for SLO defined with occurrences budgeting method', () => {
      it('calls ES with the lookback windows aggregations', async () => {
        const slo = createSLO({ budgetingMethod: 'occurrences' });
        const lookbackWindows = [
          { name: LONG_WINDOW, duration: new Duration(1, DurationUnit.Hour) },
          { name: SHORT_WINDOW, duration: new Duration(5, DurationUnit.Minute) },
        ];
        esMock.add(
          {
            method: 'POST',
            path: '/:index/_search', // dynamic index
          },
          (params) => {
            // You can access params.index if needed
            return {
              ...commonEsResponse,
              aggregations: {
                [LONG_WINDOW]: {
                  buckets: [
                    {
                      key: '2022-12-31T22:54:00.000Z-2022-12-31T23:54:00.000Z',
                      from: 1672527240000,
                      from_as_string: '2022-12-31T22:54:00.000Z',
                      to: 1672530840000,
                      to_as_string: '2022-12-31T23:54:00.000Z',
                      doc_count: 60,
                      total: {
                        value: 5000,
                      },
                      good: {
                        value: 4500,
                      },
                    },
                  ],
                },
                [SHORT_WINDOW]: {
                  buckets: [
                    {
                      key: '2022-12-31T23:49:00.000Z-2022-12-31T23:54:00.000Z',
                      from: 1672530540000,
                      from_as_string: '2022-12-31T23:49:00.000Z',
                      to: 1672530840000,
                      to_as_string: '2022-12-31T23:54:00.000Z',
                      doc_count: 5,
                      total: {
                        value: 300,
                      },
                      good: {
                        value: 290,
                      },
                    },
                  ],
                },
              },
            };
          }
        );

        const client = new DefaultBurnRatesClient(esClientMock);

        const results = await client.calculate(slo, ALL_VALUE, lookbackWindows);

        expect(searchSpy?.mock?.lastCall?.[0]).toMatchObject({
          aggs: {
            [LONG_WINDOW]: {
              date_range: {
                field: '@timestamp',
                ranges: [
                  {
                    from: expect.any(String),
                    to: expect.any(String),
                  },
                ],
              },
              aggs: {
                good: { sum: { field: 'slo.numerator' } },
                total: { sum: { field: 'slo.denominator' } },
              },
            },
            [SHORT_WINDOW]: {
              date_range: {
                field: '@timestamp',
                ranges: [
                  {
                    from: expect.any(String),
                    to: expect.any(String),
                  },
                ],
              },
              aggs: {
                good: { sum: { field: 'slo.numerator' } },
                total: { sum: { field: 'slo.denominator' } },
              },
            },
          },
        });
        // Assertion for the time difference
        const longRange = searchSpy.mock.lastCall[0].aggs.long_window.date_range.ranges[0];
        const shortRange = searchSpy.mock.lastCall[0].aggs.short_window.date_range.ranges[0];
        expectTimeDifferences(longRange, shortRange, 60, 5, 'minutes');

        expect(results.find((result) => result.name === LONG_WINDOW)).toMatchObject({
          name: LONG_WINDOW,
          sli: 0.9,
          burnRate: 100,
        });
        expect(results.find((result) => result.name === SHORT_WINDOW)).toMatchObject({
          name: SHORT_WINDOW,
          sli: 0.966667,
          burnRate: 33.333,
        });
      });
    });

    describe('for SLO defined with timeslices budgeting method', () => {
      it('calls ES with the lookback windows aggregations', async () => {
        const slo = createSLO({
          budgetingMethod: 'timeslices',
          objective: {
            target: 0.95,
            timesliceTarget: 0.9,
            timesliceWindow: new Duration(5, DurationUnit.Minute),
          },
        });

        const lookbackWindows = [
          { name: LONG_WINDOW, duration: new Duration(1, DurationUnit.Hour) },
          { name: SHORT_WINDOW, duration: new Duration(5, DurationUnit.Minute) },
        ];
        esMock.add(
          {
            method: 'POST',
            path: '/:index/_search', // dynamic index
          },
          (params) => {
            // You can access params.index if needed
            return {
              ...commonEsResponse,
              aggregations: {
                [LONG_WINDOW]: {
                  buckets: [
                    {
                      key: '2022-12-31T22:46:00.000Z-2022-12-31T23:46:00.000Z',
                      from: 1672526160000,
                      from_as_string: '2022-12-31T22:46:00.000Z',
                      to: 1672529760000,
                      to_as_string: '2022-12-31T23:46:00.000Z',
                      doc_count: 12,
                      total: {
                        value: 12,
                      },
                      good: {
                        value: 10,
                      },
                    },
                  ],
                },
                [SHORT_WINDOW]: {
                  buckets: [
                    {
                      key: '2022-12-31T23:41:00.000Z-2022-12-31T23:46:00.000Z',
                      from: 1672529460000,
                      from_as_string: '2022-12-31T23:41:00.000Z',
                      to: 1672529760000,
                      to_as_string: '2022-12-31T23:46:00.000Z',
                      doc_count: 1,
                      total: {
                        value: 1,
                      },
                      good: {
                        value: 1,
                      },
                    },
                  ],
                },
              },
            };
          }
        );
        const client = new DefaultBurnRatesClient(esClientMock);

        const results = await client.calculate(slo, ALL_VALUE, lookbackWindows);

        expect(esClientMock?.search?.mock?.lastCall?.[0]).toMatchObject({
          aggs: {
            [LONG_WINDOW]: {
              date_range: {
                field: '@timestamp',
                ranges: [
                  {
                    from: expect.any(String),
                    to: expect.any(String),
                  },
                ],
              },
              aggs: {
                good: {
                  sum: {
                    field: 'slo.isGoodSlice',
                  },
                },
                total: {
                  value_count: {
                    field: 'slo.isGoodSlice',
                  },
                },
              },
            },
            [SHORT_WINDOW]: {
              date_range: {
                field: '@timestamp',
                ranges: [
                  {
                    from: expect.any(String),
                    to: expect.any(String),
                  },
                ],
              },
              aggs: {
                good: {
                  sum: {
                    field: 'slo.isGoodSlice',
                  },
                },
                total: {
                  value_count: {
                    field: 'slo.isGoodSlice',
                  },
                },
              },
            },
          },
        });
        // Assertion for the time difference
        const longRange = searchSpy.mock.lastCall[0].aggs.long_window.date_range.ranges[0];
        const shortRange = searchSpy.mock.lastCall[0].aggs.short_window.date_range.ranges[0];
        expectTimeDifferences(longRange, shortRange, 60, 5, 'minutes');

        expect(results.find((result) => result.name === LONG_WINDOW)).toMatchObject({
          name: LONG_WINDOW,
          sli: 0.833333,
          burnRate: 3.33334,
        });
        expect(results.find((result) => result.name === SHORT_WINDOW)).toMatchObject({
          name: SHORT_WINDOW,
          sli: 1,
          burnRate: 0,
        });
      });
    });
  });
});
