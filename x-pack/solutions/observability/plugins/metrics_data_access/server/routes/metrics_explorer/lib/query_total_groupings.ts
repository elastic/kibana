/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { castArray, isArray } from 'lodash';
import { existsQuery } from '@kbn/observability-utils-common/es/queries/exists_query';
import { rangeQuery } from '@kbn/observability-utils-common/es/queries/range_query';
import type { MetricsAPIRequest } from '../../../../common/http_api';
import type { ESSearchClient } from '../../../lib/metrics/types';

interface GroupingResponse {
  count: {
    value: number;
  };
}

export const queryTotalGroupings = async (
  client: ESSearchClient,
  options: MetricsAPIRequest
): Promise<number> => {
  if (!options.groupBy || (isArray(options.groupBy) && options.groupBy.length === 0)) {
    return Promise.resolve(0);
  }

  const groupByFilter = options.groupBy
    .filter((field): field is string => !!field)
    .flatMap((field) => existsQuery(field));

  const params = {
    allow_no_indices: true,
    ignore_unavailable: true,
    index: options.indexPattern,
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            ...castArray(options.filters),
            ...rangeQuery(options.timerange.from, options.timerange.to),
            ...groupByFilter,
          ],
        },
      },
      aggs: {
        count: {
          cardinality: {
            script: options.groupBy.map((field) => `doc['${field}'].value`).join('+'),
          },
        },
      },
    },
  };

  const response = await client<{}, GroupingResponse>(params);
  return response.aggregations?.count.value ?? 0;
};
