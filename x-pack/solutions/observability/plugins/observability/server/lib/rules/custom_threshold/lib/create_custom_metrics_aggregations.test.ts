/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import type { DataViewBase } from '@kbn/es-query';
import { Aggregators } from '../../../../../common/custom_threshold_rule/types';
import { createCustomMetricsAggregations } from './create_custom_metrics_aggregations';

describe('createCustomMetricsAggregations', () => {
  const dataView: DataViewBase = {
    title: 'logs-*',
    fields: [
      {
        name: 'machine.os.keyword',
        type: 'string',
        esTypes: ['keyword'],
      },
    ],
  };

  it('uses wildcard query for keyword wildcard metric filter when data view is provided', () => {
    const aggregations = createCustomMetricsAggregations(
      'aggregatedValue',
      [
        {
          name: 'A',
          aggType: Aggregators.COUNT,
          filter: 'machine.os.keyword: *win 7*',
        },
      ],
      { start: 0, end: 1 },
      '@timestamp',
      undefined,
      dataView
    );

    expect(aggregations).toMatchObject({
      aggregatedValue_A: {
        filter: {
          bool: {
            should: [
              {
                wildcard: {
                  'machine.os.keyword': {
                    value: '*win 7*',
                  },
                },
              },
            ],
            minimum_should_match: 1,
          },
        },
      },
    });
  });

  it('does not fallback to query_string for keyword wildcard metric filter', () => {
    const aggregations = createCustomMetricsAggregations(
      'aggregatedValue',
      [
        {
          name: 'A',
          aggType: Aggregators.COUNT,
          filter: 'machine.os.keyword: *win 7*',
        },
      ],
      { start: 0, end: 1 },
      '@timestamp',
      undefined,
      dataView
    );

    expect(aggregations).toEqual(
      expect.not.objectContaining({
        aggregatedValue_A: expect.objectContaining({
          filter: expect.objectContaining({
            query_string: expect.anything(),
          }),
        }),
      })
    );
  });

  describe('metric filters', () => {
    const KQL_FILTER = 'status: 500';
    const filterQuery = toElasticsearchQuery(fromKueryExpression(KQL_FILTER));
    const timeFrame = { start: 0, end: 1 };

    const getBucketsPath = (aggregations: Record<string, any>) =>
      aggregations.aggregatedValue.bucket_script.buckets_path;

    describe.each([
      Aggregators.AVERAGE,
      Aggregators.SUM,
      Aggregators.MIN,
      Aggregators.MAX,
      Aggregators.CARDINALITY,
    ])('%s', (aggType) => {
      it('nests the metric under a filter aggregation when a filter is set', () => {
        const aggregations = createCustomMetricsAggregations(
          'aggregatedValue',
          [{ name: 'A', aggType, field: 'metric', filter: KQL_FILTER }],
          timeFrame,
          '@timestamp'
        ) as Record<string, any>;

        expect(aggregations.aggregatedValue_A).toEqual({
          filter: filterQuery,
          aggs: { filtered_metric: { [aggType]: { field: 'metric' } } },
        });
        expect(getBucketsPath(aggregations)).toEqual({ A: 'aggregatedValue_A>filtered_metric' });
      });

      it('keeps the bare metric aggregation when no filter is set', () => {
        const aggregations = createCustomMetricsAggregations(
          'aggregatedValue',
          [{ name: 'A', aggType, field: 'metric' }],
          timeFrame,
          '@timestamp'
        ) as Record<string, any>;

        expect(aggregations.aggregatedValue_A).toEqual({ [aggType]: { field: 'metric' } });
        expect(getBucketsPath(aggregations)).toEqual({ A: 'aggregatedValue_A' });
      });
    });

    describe.each([
      [Aggregators.MED, 50],
      [Aggregators.P95, 95],
      [Aggregators.P99, 99],
    ])('%s', (aggType, percent) => {
      it('nests the percentiles aggregation under a filter aggregation when a filter is set', () => {
        const aggregations = createCustomMetricsAggregations(
          'aggregatedValue',
          [{ name: 'A', aggType, field: 'metric', filter: KQL_FILTER }],
          timeFrame,
          '@timestamp'
        ) as Record<string, any>;

        expect(aggregations.aggregatedValue_A).toEqual({
          filter: filterQuery,
          aggs: {
            filtered_metric: { percentiles: { field: 'metric', percents: [percent], keyed: true } },
          },
        });
        expect(getBucketsPath(aggregations)).toEqual({ A: 'aggregatedValue_A>filtered_metric' });
      });

      it('keeps the bare percentiles aggregation when no filter is set', () => {
        const aggregations = createCustomMetricsAggregations(
          'aggregatedValue',
          [{ name: 'A', aggType, field: 'metric' }],
          timeFrame,
          '@timestamp'
        ) as Record<string, any>;

        expect(aggregations.aggregatedValue_A).toEqual({
          percentiles: { field: 'metric', percents: [percent], keyed: true },
        });
        expect(getBucketsPath(aggregations)).toEqual({ A: 'aggregatedValue_A' });
      });
    });

    it('uses the filter as the aggregation for count and match_all when there is no filter', () => {
      const aggregations = createCustomMetricsAggregations(
        'aggregatedValue',
        [
          { name: 'A', aggType: Aggregators.COUNT, filter: KQL_FILTER },
          { name: 'B', aggType: Aggregators.COUNT },
        ],
        timeFrame,
        '@timestamp'
      ) as Record<string, any>;

      expect(aggregations.aggregatedValue_A).toEqual({ filter: filterQuery });
      expect(aggregations.aggregatedValue_B).toEqual({ filter: { match_all: {} } });
      expect(getBucketsPath(aggregations)).toEqual({
        A: 'aggregatedValue_A>_count',
        B: 'aggregatedValue_B>_count',
      });
    });

    it('filters each metric independently and builds the equation over all of them', () => {
      const aggregations = createCustomMetricsAggregations(
        'aggregatedValue',
        [
          { name: 'A', aggType: Aggregators.AVERAGE, field: 'metric', filter: KQL_FILTER },
          { name: 'B', aggType: Aggregators.AVERAGE, field: 'metric' },
        ],
        timeFrame,
        '@timestamp',
        'A / B'
      ) as Record<string, any>;

      expect(aggregations.aggregatedValue_A).toHaveProperty('filter', filterQuery);
      expect(aggregations.aggregatedValue_B).toEqual({ avg: { field: 'metric' } });
      expect(getBucketsPath(aggregations)).toEqual({
        A: 'aggregatedValue_A>filtered_metric',
        B: 'aggregatedValue_B',
      });
      expect(aggregations.aggregatedValue.bucket_script.script.source).toBe('params.A / params.B');
    });

    it('applies the filter to both rate windows without changing the rate buckets path', () => {
      const aggregations = createCustomMetricsAggregations(
        'aggregatedValue',
        [{ name: 'A', aggType: Aggregators.RATE, field: 'metric', filter: KQL_FILTER }],
        { start: 0, end: 120_000 },
        '@timestamp'
      ) as Record<string, any>;

      expect(aggregations.aggregatedValue_A_first_bucket.filter.bool.must).toContainEqual(
        filterQuery
      );
      expect(aggregations.aggregatedValue_A_second_bucket.filter.bool.must).toContainEqual(
        filterQuery
      );
      expect(getBucketsPath(aggregations)).toEqual({ A: 'aggregatedValue_A' });
    });

    it('applies the filter to the last_value bucket without changing its buckets path', () => {
      const aggregations = createCustomMetricsAggregations(
        'aggregatedValue',
        [{ name: 'A', aggType: Aggregators.LAST_VALUE, field: 'metric', filter: KQL_FILTER }],
        timeFrame,
        '@timestamp'
      ) as Record<string, any>;

      expect(aggregations._aggregatedValue_A.filter.bool.must).toEqual([
        { exists: { field: 'metric' } },
        filterQuery,
      ]);
      expect(getBucketsPath(aggregations)).toEqual({ A: 'aggregatedValue_A' });
    });

    it('throws when the filter is not valid KQL', () => {
      expect(() =>
        createCustomMetricsAggregations(
          'aggregatedValue',
          [{ name: 'A', aggType: Aggregators.AVERAGE, field: 'metric', filter: 'status: (' }],
          timeFrame,
          '@timestamp'
        )
      ).toThrow();
    });
  });
});
