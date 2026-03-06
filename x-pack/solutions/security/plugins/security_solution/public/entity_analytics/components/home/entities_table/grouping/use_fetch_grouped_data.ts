/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type { IKibanaSearchResponse } from '@kbn/search-types';
import type { GenericBuckets, GroupingQuery, RootAggregation } from '@kbn/grouping/src';
import { useQuery } from '@kbn/react-query';
import { lastValueFrom } from 'rxjs';
import { showErrorToast } from '@kbn/cloud-security-posture';
import { useContext, useMemo } from 'react';
import { useKibana } from '../../../../../common/lib/kibana';
import { QUERY_KEY_GROUPING_DATA, QUERY_KEY_ENTITY_ANALYTICS } from '../constants';
import { DataViewContext } from '../index';

export interface EntitiesGroupingAggregation {
  entityType?: {
    buckets?: GenericBuckets[];
  };
}

export type EntitiesRootGroupingAggregation = RootAggregation<EntitiesGroupingAggregation>;

export const getGroupedEntitiesQuery = (query: GroupingQuery, indexPattern: string) => {
  return {
    ...query,
    index: indexPattern,
    ignore_unavailable: true,
    size: 0,
  };
};

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

  const { dataView } = useContext(DataViewContext);

  const dataViewIndexPattern = useMemo(() => {
    return dataView?.getIndexPattern();
  }, [dataView]);

  return useQuery(
    [QUERY_KEY_ENTITY_ANALYTICS, QUERY_KEY_GROUPING_DATA, { query }],
    async () => {
      const {
        rawResponse: { aggregations },
      } = await lastValueFrom(
        data.search.search<
          {},
          IKibanaSearchResponse<SearchResponse<{}, EntitiesRootGroupingAggregation>>
        >({
          params: getGroupedEntitiesQuery(query, dataViewIndexPattern),
        })
      );

      if (!aggregations) throw new Error('Failed to aggregate by, missing resource id');

      return aggregations;
    },
    {
      onError: (err: Error) => showErrorToast(toasts, err),
      enabled: enabled && !!dataViewIndexPattern,
      keepPreviousData: true,
    }
  );
};
