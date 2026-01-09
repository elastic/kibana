/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isArray } from 'lodash';
import { kqlQuery } from '@kbn/observability-utils-common/es/queries/kql_query';
import type { MetricsAPIRequest, MetricsExplorerRequestBody } from '../../../../common/http_api';
import { afterKeyObjectRT } from '../../../../common/http_api';
import { convertMetricToMetricsAPIMetric } from './convert_metric_to_metrics_api_metric';

export const convertRequestToMetricsAPIOptions = (
  options: MetricsExplorerRequestBody
): MetricsAPIRequest => {
  const metrics = options.metrics
    .map(convertMetricToMetricsAPIMetric)
    .filter(<M>(m: M): m is NonNullable<M> => !!m);
  const { limit, timerange, indexPattern } = options;

  const metricsApiOptions: MetricsAPIRequest = {
    timerange,
    indexPattern,
    limit,
    metrics,
    dropPartialBuckets: true,
    includeTimeseries: true,
  };

  if (options.afterKey) {
    metricsApiOptions.afterKey = afterKeyObjectRT.is(options.afterKey)
      ? options.afterKey
      : { groupBy0: options.afterKey };
  }

  if (options.groupBy) {
    metricsApiOptions.groupBy = isArray(options.groupBy) ? options.groupBy : [options.groupBy];
  }

  if (options.groupInstance) {
    metricsApiOptions.groupInstance = isArray(options.groupInstance)
      ? options.groupInstance
      : [options.groupInstance];
  }
  if (options.kuery) {
    // First, check if kuery is a JSON DSL query (sent by infrastructure tables)
    try {
      const parsed = JSON.parse(options.kuery);
      // If it parses as JSON and looks like an ES DSL query, use it directly
      if (typeof parsed === 'object' && parsed !== null) {
        metricsApiOptions.filters = parsed;
      }
    } catch {
      // Not JSON, try to parse as KQL
      try {
        metricsApiOptions.filters = {
          bool: {
            filter: [...kqlQuery(options.kuery)],
          },
        };
      } catch (err) {
        // Fallback to query_string for Lucene-style queries
        metricsApiOptions.filters = {
          bool: {
            must: [
              {
                query_string: {
                  query: options.kuery,
                  analyze_wildcard: true,
                },
              },
            ],
          },
        };
      }
    }
  }

  return metricsApiOptions;
};
