/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { addHistogramAggregationToQuery } from './log_threshold_chart_preview';

describe('addHistogramAggregationToQuery', () => {
  const rangeFilter = {
    range: {
      '@timestamp': {
        gte: 'now-1h/h',
        lte: 'now',
      },
    },
  };

  const interval = '1m';
  const timestampField = '@timestamp';

  it('should add histogram aggregation to a non-grouped query', () => {
    const query = {
      query: {
        match_all: {},
      },
    };

    const result = addHistogramAggregationToQuery(
      query,
      rangeFilter,
      interval,
      timestampField,
      false
    );

    expect(result.aggregations).toHaveProperty('histogramBuckets');
    expect(result.aggregations!.histogramBuckets).toEqual({
      date_histogram: {
        field: '@timestamp',
        fixed_interval: '1m',
        extended_bounds: {
          min: 'now-1h/h',
          max: 'now',
        },
      },
    });
  });

  it('should add histogram inside grouped query (optimized case)', () => {
    const query = {
      aggregations: {
        groups: {
          terms: {
            field: 'user.id',
          },
          aggregations: {},
        },
      },
    };

    const result = addHistogramAggregationToQuery(
      query,
      rangeFilter,
      interval,
      timestampField,
      true
    );

    expect(result.aggregations!.groups.aggregations).toHaveProperty('histogramBuckets');
    expect(result.aggregations!.groups.aggregations!.histogramBuckets).toEqual({
      date_histogram: {
        field: '@timestamp',
        fixed_interval: '1m',
        extended_bounds: {
          min: 'now-1h/h',
          max: 'now',
        },
      },
    });
  });

  it('should add histogram inside filtered_results if it exists (non-optimized case)', () => {
    const query = {
      aggregations: {
        groups: {
          terms: {
            field: 'user.id',
          },
          aggregations: {
            filtered_results: {
              filter: {
                term: { status: 'ok' },
              },
              aggregations: {},
            },
          },
        },
      },
    };

    const result = addHistogramAggregationToQuery(
      query,
      rangeFilter,
      interval,
      timestampField,
      true
    );

    expect(result.aggregations!.groups.aggregations!.filtered_results.aggregations).toHaveProperty(
      'histogramBuckets'
    );
    expect(
      result.aggregations!.groups.aggregations!.filtered_results.aggregations!.histogramBuckets
    ).toEqual({
      date_histogram: {
        field: '@timestamp',
        fixed_interval: '1m',
        extended_bounds: {
          min: 'now-1h/h',
          max: 'now',
        },
      },
    });
  });

  it('should return the original query if grouped but required structure is missing', () => {
    const query = {
      aggregations: {},
    };

    const result = addHistogramAggregationToQuery(
      query,
      rangeFilter,
      interval,
      timestampField,
      true
    );

    expect(result).toEqual(query);
  });
});
