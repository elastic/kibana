/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { ANALYTICS_CLUSTER_STATE_PATH } from '../../../common/analytics';
import { useKibana } from '../../hooks/use_kibana';
import type { AnalyticsClusterState, AnalyticsClusterStateResult } from '../types';

const ANALYTICS_CLUSTER_STATE_QUERY_KEY = ['searchHomepageAnalyticsClusterState'];
export const NO_DATA_POLL_INTERVAL_MS = 10_000;
export const REFRESH_INTERVAL_MS = 60_000;

/**
 * What the cluster holds for the analytics pages. With `poll`, keeps asking while the tab is
 * visible: often while the stage is `noData`, so the page can react when the first events arrive,
 * and slowly afterwards, so the counts and the stage follow the cluster.
 * A failed refetch keeps the last state it got, so a passing failure does not blank the page.
 */
export const useAnalyticsClusterState = ({
  poll = false,
}: { poll?: boolean } = {}): AnalyticsClusterStateResult => {
  const { http } = useKibana().services;

  const { data, isError, isFetching, errorUpdateCount, refetch } = useQuery({
    queryKey: ANALYTICS_CLUSTER_STATE_QUERY_KEY,
    queryFn: ({ signal }) =>
      http.get<AnalyticsClusterState>(ANALYTICS_CLUSTER_STATE_PATH, { signal }),
    retry: false,
    refetchOnWindowFocus: true,
    refetchInterval: (latest) => {
      if (!poll || latest === undefined) {
        return false;
      }
      return latest.stage === 'noData' ? NO_DATA_POLL_INTERVAL_MS : REFRESH_INTERVAL_MS;
    },
    refetchIntervalInBackground: false,
  });

  // A retry without data resets the query to loading; it still counts as failed until it settles.
  const hasFailed = isError || (data === undefined && errorUpdateCount > 0);

  return {
    state: data,
    isLoading: data === undefined && !hasFailed,
    isError: hasFailed,
    isFetching,
    refetch: () => {
      refetch();
    },
  };
};
