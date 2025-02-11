/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MetricsAPIRequest } from '@kbn/metrics-data-access-plugin/common';
import { createAggregations, createCompositeAggregations } from './create_aggregations';
import moment from 'moment';

const options: MetricsAPIRequest = {
  timerange: {
    from: moment('2020-01-01T00:00:00Z').valueOf(),
    to: moment('2020-01-01T01:00:00Z').valueOf(),
    interval: '>=1m',
  },
  limit: 20,
  indexPattern: 'metrics-*',
  metrics: [
    { id: 'metric_0', aggregations: { metric_0: { avg: { field: 'system.cpu.user.pct' } } } },
  ],
  includeTimeseries: true,
};

describe('createAggregations(options)', () => {
  it('should return groupings aggregation with groupBy', () => {
    const optionsWithGroupBy: MetricsAPIRequest = { ...options, groupBy: ['host.name'] };
    expect(createCompositeAggregations(optionsWithGroupBy)).toMatchSnapshot();
  });
  it('should return groupings aggregation with afterKey', () => {
    const optionsWithGroupBy: MetricsAPIRequest = {
      ...options,
      groupBy: ['host.name'],
      afterKey: { group0: 'host-0' },
    };
    expect(createCompositeAggregations(optionsWithGroupBy)).toEqual({
      groupings: expect.objectContaining({
        composite: expect.objectContaining({
          after: { group0: 'host-0' },
        }),
      }),
    });
  });

  it('should return groupings aggregation without date histogram', () => {
    const optionsWithGroupBy: MetricsAPIRequest = {
      ...options,
      groupBy: ['host.name'],
      includeTimeseries: false,
    };
    expect(createCompositeAggregations(optionsWithGroupBy)).toEqual({
      groupings: expect.objectContaining({
        aggs: {
          metric_0: {
            avg: {
              field: 'system.cpu.user.pct',
            },
          },
          metricsets: {
            terms: {
              field: 'metricset.name',
            },
          },
        },
      }),
    });
  });

  it('should return just histogram aggregation without groupBy', () => {
    expect(createAggregations(options)).toMatchSnapshot();
  });

  it('should return add offset to histogram', () => {
    const optionsWithAlignDataToEnd = {
      ...options,
      timerange: {
        ...options.timerange,
        from: moment('2020-01-01T00:00:00Z').subtract(28, 'minutes').valueOf(),
        to: moment('2020-01-01T01:00:00Z').subtract(28, 'minutes').valueOf(),
      },
      alignDataToEnd: true,
    };
    expect(createAggregations(optionsWithAlignDataToEnd)).toMatchSnapshot();
  });
});
