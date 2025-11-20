/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import type { AggregationsAutoDateHistogramAggregation } from '@elastic/elasticsearch/lib/api/types';

export const OBSERVABILITY_GET_LOG_CHANGE_POINTS_TOOL_ID = 'observability.get_log_change_points';
export const OBSERVABILITY_GET_METRIC_CHANGE_POINTS_TOOL_ID =
  'observability.get_metric_change_points';

export const dateHistogram: AggregationsAutoDateHistogramAggregation = {
  field: '@timestamp',
  buckets: 100,
};

export const getFilters = ({
  start,
  end,
  kqlFilter,
}: {
  start: string;
  end: string;
  kqlFilter?: string;
}) => {
  const filters = [
    {
      range: {
        '@timestamp': {
          gte: start,
          lt: end,
        },
      },
    },
  ];
  return [...filters, ...(kqlFilter ? [toElasticsearchQuery(fromKueryExpression(kqlFilter))] : [])];
};
