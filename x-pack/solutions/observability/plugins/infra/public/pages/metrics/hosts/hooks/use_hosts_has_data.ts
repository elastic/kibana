/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetHasDataResponse } from '../../../../../common/metrics_sources/get_has_data';
import { isPending, isSuccess, useFetcher } from '../../../../hooks/use_fetcher';

export interface HostsHasData {
  hasData: boolean;
  loading: boolean;
  showOnboarding: boolean;
}

/** Cluster-level host metrics existence (`source=host`), not the current table time range. */
export const useHostsHasData = (): HostsHasData => {
  const { data, status } = useFetcher(async (callApi) => {
    return await callApi<GetHasDataResponse>('/api/metrics/source/hasData', {
      method: 'GET',
      query: { source: 'host' },
    });
  }, []);

  const hasData = Boolean(data?.hasData);

  return {
    hasData,
    loading: isPending(status),
    showOnboarding: isSuccess(status) && !hasData,
  };
};
