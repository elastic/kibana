/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type { IKibanaSearchResponse } from '@kbn/search-types';
import type { GenericBuckets, GroupingQuery, RootAggregation } from '@kbn/grouping/src';
import { useQuery } from '@tanstack/react-query';
import { lastValueFrom } from 'rxjs';
import { showErrorToast } from '@kbn/cloud-security-posture';
import { useKibana } from '../../../common/lib/kibana';
import { ASSET_INVENTORY_INDEX_PATTERN, QUERY_KEY_GROUPING_DATA } from '../../constants';

type NumberOrNull = number | null;

export interface AssetsGroupingAggregation {
  unitsCount?: {
    value?: NumberOrNull;
  };
  groupsCount?: {
    value?: NumberOrNull;
  };
  groupByFields?: {
    buckets?: GenericBuckets[];
  };
  assetCriticality?: {
    buckets?: GenericBuckets[];
  };
  entityType?: {
    buckets?: GenericBuckets[];
  };
  accountId?: {
    buckets?: GenericBuckets[];
  };
  accountName?: {
    buckets?: GenericBuckets[];
  };
  cloudProvider?: {
    buckets?: GenericBuckets[];
  };
  source?: {
    buckets?: GenericBuckets[];
  };
}

export type AssetsRootGroupingAggregation = RootAggregation<AssetsGroupingAggregation>;

export const getGroupedAssetsQuery = (query: GroupingQuery) => ({
  ...query,
  index: ASSET_INVENTORY_INDEX_PATTERN,
  ignore_unavailable: true,
  size: 0,
});

export const useFetchGroupedData = ({
  query,
  enabled = true,
}: {
  query: GroupingQuery;
  enabled: boolean;
}) => {
  const {
    data,
    notifications: { toasts },
  } = useKibana().services;

  return useQuery(
    [QUERY_KEY_GROUPING_DATA, { query }],
    async () => {
      const {
        rawResponse: { aggregations },
      } = await lastValueFrom(
        data.search.search<
          {},
          IKibanaSearchResponse<SearchResponse<{}, AssetsRootGroupingAggregation>>
        >({
          params: getGroupedAssetsQuery(query),
        })
      );

      if (!aggregations) throw new Error('Failed to aggregate by, missing resource id');

      return aggregations;
    },
    {
      onError: (err: Error) => showErrorToast(toasts, err),
      enabled,
      keepPreviousData: true,
    }
  );
};
