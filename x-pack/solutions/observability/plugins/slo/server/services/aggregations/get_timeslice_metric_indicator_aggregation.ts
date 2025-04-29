/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimesliceMetricIndicator, timesliceMetricMetricDef } from '@kbn/slo-schema';
import * as t from 'io-ts';
import { assertNever } from '@kbn/std';

import { getElasticsearchQueryOrThrow } from '../transform_generators';

type TimesliceMetricDef = TimesliceMetricIndicator['params']['metric'];
type TimesliceMetricMetricDef = t.TypeOf<typeof timesliceMetricMetricDef>;

export class GetTimesliceMetricIndicatorAggregation {
  constructor(private indicator: TimesliceMetricIndicator) {}

  private buildAggregation(metric: TimesliceMetricMetricDef) {
    const { aggregation } = metric;
    switch (aggregation) {
      case 'doc_count':
        return {};
      case 'std_deviation':
        return {
          extended_stats: { field: metric.field },
        };
      case 'percentile':
        if (metric.percentile == null) {
          throw new Error('You must provide a percentile value for percentile aggregations.');
        }
        return {
          percentiles: {
            field: metric.field,
            percents: [metric.percentile],
            keyed: true,
          },
        };
      case 'last_value':
        return {
          top_metrics: {
            metrics: { field: metric.field },
            sort: { [this.indicator.params.timestampField]: 'desc' },
          },
        };
      case 'avg':
      case 'max':
      case 'min':
      case 'sum':
      case 'cardinality':
        if (metric.field == null) {
          throw new Error('You must provide a field for basic metric aggregations.');
        }
        return {
          [aggregation]: { field: metric.field },
        };
      default:
        assertNever(aggregation);
    }
  }

  private buildBucketPath(prefix: string, metric: TimesliceMetricMetricDef) {
    const { aggregation } = metric;
    switch (aggregation) {
      case 'doc_count':
        return `${prefix}>_count`;
      case 'std_deviation':
        return `${prefix}>metric[std_deviation]`;
      case 'percentile':
        return `${prefix}>metric[${metric.percentile}]`;
      case 'last_value':
        return `${prefix}>metric[${metric.field}]`;
      case 'avg':
      case 'max':
      case 'min':
      case 'sum':
      case 'cardinality':
        return `${prefix}>metric`;
      default:
        assertNever(aggregation);
    }
  }

  private buildMetricAggregations(metricDef: TimesliceMetricDef) {
    return metricDef.metrics.reduce((acc, metric) => {
      const filter = metric.filter
        ? getElasticsearchQueryOrThrow(metric.filter)
        : { match_all: {} };
      const aggs = { metric: this.buildAggregation(metric) };
      return {
        ...acc,
        [`_${metric.name}`]: {
          filter,
          ...(metric.aggregation !== 'doc_count' ? { aggs } : {}),
        },
      };
    }, {});
  }

  private convertEquationToPainless(bucketsPath: Record<string, string>, equation: string) {
    const workingEquation = equation || Object.keys(bucketsPath).join(' + ');
    return Object.keys(bucketsPath).reduce((acc, key) => {
      return acc.replaceAll(key, `params.${key}`);
    }, workingEquation);
  }

  private buildMetricEquation(definition: TimesliceMetricDef) {
    const bucketsPath = definition.metrics.reduce(
      (acc, metric) => ({ ...acc, [metric.name]: this.buildBucketPath(`_${metric.name}`, metric) }),
      {}
    );
    return {
      bucket_script: {
        buckets_path: bucketsPath,
        script: {
          source: this.convertEquationToPainless(bucketsPath, definition.equation),
          lang: 'painless',
        },
      },
    };
  }

  public execute(aggregationKey: string) {
    return {
      ...this.buildMetricAggregations(this.indicator.params.metric),
      [aggregationKey]: this.buildMetricEquation(this.indicator.params.metric),
    };
  }
}
