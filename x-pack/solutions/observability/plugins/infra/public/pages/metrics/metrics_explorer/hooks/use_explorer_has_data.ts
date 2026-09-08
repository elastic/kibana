/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetHasDataResponse } from '../../../../../common/metrics_sources/get_has_data';
import { isPending, isSuccess, useFetcher } from '../../../../hooks/use_fetcher';

export interface ExplorerHasData {
  hasData: boolean;
  loading: boolean;
  showOnboarding: boolean;
}

/** Cluster-level metrics existence (`source=all`), not the current Explorer time range. */
export const useExplorerHasData = (): ExplorerHasData => {
  const { data, status } = useFetcher(async (callApi) => {
    return await callApi<GetHasDataResponse>('/api/metrics/source/hasData', {
      method: 'GET',
      query: { source: 'all' },
    });
  }, []);

  const hasData = Boolean(data?.hasData);

  return {
    hasData,
    loading: isPending(status),
    showOnboarding: isSuccess(status) && !hasData,
  };
};
