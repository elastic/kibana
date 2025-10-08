/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAggregations, createCompositeAggregations } from './create_aggregations';
import moment from 'moment';
import type { MetricsAPIRequest } from '../../../../common/http_api';

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
    expect(createCompositeAggregations(optionsWithGroupBy)).toEqual({
      groupings: expect.objectContaining({
        composite: {
          size: 20,
          sources: [
            {
              groupBy0: {
                terms: {
                  field: 'host.name',
                },
              },
            },
          ],
        },
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

  it('should return direct metric aggregations without groupBy (no histogram wrapper)', () => {
    expect(createAggregations(options)).toEqual({
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
    });
  });
});
