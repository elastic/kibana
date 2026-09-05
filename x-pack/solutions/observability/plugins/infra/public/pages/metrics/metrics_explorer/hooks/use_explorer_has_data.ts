/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetHasDataResponse } from '../../../../../common/metrics_sources/get_has_data';
import { isPending, useFetcher } from '../../../../hooks/use_fetcher';

/** Fetches whether any metrics exist so Explorer can keep AppHeader mounted on onboarding. */
export const useExplorerHasData = (): { hasData: boolean; loading: boolean } => {
  const { data, status } = useFetcher(async (callApi) => {
    return await callApi<GetHasDataResponse>('/api/metrics/source/hasData', {
      method: 'GET',
      query: { source: 'all' },
    });
  }, []);

  return {
    hasData: Boolean(data?.hasData),
    loading: isPending(status),
  };
};
