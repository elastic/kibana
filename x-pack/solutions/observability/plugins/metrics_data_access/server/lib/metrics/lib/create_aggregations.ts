/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { afterKeyObjectRT } from '../../../../common/http_api';
import type { MetricsAPIRequest } from '../../../../common/http_api/metrics_api';
import { createMetricsAggregations } from './create_metrics_aggregations';

const DEFAULT_LIMIT = 9;
const METRICSET_AGGS = {
  metricsets: {
    terms: {
      field: 'metricset.name',
    },
  },
};

const getAfterKey = (options: MetricsAPIRequest) => {
  if (!options.afterKey) {
    return null;
  }
  if (afterKeyObjectRT.is(options.afterKey)) {
    return options.afterKey;
  } else {
    return { groupBy0: options.afterKey };
  }
};
export const createCompositeAggregations = (options: MetricsAPIRequest) => {
  if (!Array.isArray(options.groupBy) || !options.groupBy.length) {
    throw Boom.badRequest('groupBy must be informed.');
  }

  const after = getAfterKey(options);

  return {
    groupings: {
      composite: {
        size: options.limit ?? DEFAULT_LIMIT,
        sources: options.groupBy.map((field, index) => ({
          [`groupBy${index}`]: { terms: { field } },
        })),
        ...(after ? { after } : {}),
      },
      aggs: {
        ...createMetricsAggregations(options),
        ...METRICSET_AGGS,
      },
    },
  };
};

export const createAggregations = (options: MetricsAPIRequest) => {
  return {
    ...createMetricsAggregations(options),
    ...METRICSET_AGGS,
  };
};
