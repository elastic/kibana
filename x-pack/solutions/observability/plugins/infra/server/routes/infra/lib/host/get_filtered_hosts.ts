/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery } from '@kbn/observability-plugin/server';
import type { estypes } from '@elastic/elasticsearch';
import { castArray } from 'lodash';
import { findInventoryModel } from '@kbn/metrics-data-access-plugin/common';
import { HOST_NAME_FIELD } from '../../../../../common/constants';
import type { GetHostParameters } from '../types';

export const getFilteredHostNames = async ({
  infraMetricsClient,
  from,
  to,
  limit,
  query,
  schema,
}: Required<Pick<GetHostParameters, 'infraMetricsClient' | 'from' | 'to' | 'limit' | 'schema'>> & {
  query?: estypes.QueryDslQueryContainer;
}) => {
  const inventoryModel = findInventoryModel('host');

  const response = await infraMetricsClient.search({
    allow_no_indices: true,
    size: 0,
    track_total_hits: false,
    query: {
      bool: {
        filter: [
          ...castArray(query),
          ...rangeQuery(from, to),
          ...(inventoryModel.nodeFilter?.({ schema }) ?? []),
        ],
      },
    },
    aggs: {
      uniqueHostNames: {
        terms: {
          field: HOST_NAME_FIELD,
          size: limit,
          order: {
            _key: 'asc',
          },
        },
      },
    },
  });

  const { uniqueHostNames } = response.aggregations ?? {};
  return uniqueHostNames?.buckets?.map((p) => p.key as string) ?? [];
};

export const getHasDataFromSystemIntegration = async ({
  infraMetricsClient,
  from,
  to,
  query,
  schema,
}: Required<Pick<GetHostParameters, 'infraMetricsClient' | 'from' | 'to' | 'schema'>> & {
  query?: estypes.QueryDslQueryContainer;
}) => {
  const inventoryModel = findInventoryModel('host');

  const hitCount = await infraMetricsClient.search({
    allow_no_indices: true,
    ignore_unavailable: true,
    size: 0,
    terminate_after: 1,
    track_total_hits: true,
    query: {
      bool: {
        filter: [
          ...castArray(query),
          ...rangeQuery(from, to),
          ...(inventoryModel.nodeFilter?.({ schema }) ?? []),
        ],
      },
    },
  });

  return hitCount.hits.total.value > 0;
};
