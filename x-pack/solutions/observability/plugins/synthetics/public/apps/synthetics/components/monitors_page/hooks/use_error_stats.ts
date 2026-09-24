/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFetcher } from '@kbn/observability-shared-plugin/public';
import { SYNTHETICS_API_URLS } from '../../../../../../common/constants';
import type { ErrorStats } from '../../../../../../common/runtime_types';
import { apiService } from '../../../../../utils/api_service/api_service';
import { useSyntheticsRefreshContext } from '../../../contexts';
import { useGetUrlParams } from '../../../hooks';
import { buildErrorFilterParams } from './use_error_filter_params';

export function useErrorStats() {
  const { lastRefresh } = useSyntheticsRefreshContext();
  const urlParams = useGetUrlParams();
  const {
    dateRangeStart,
    dateRangeEnd,
    query,
    monitorTypes,
    locations,
    tags,
    projects,
    statusCodes,
  } = urlParams;

  const { data, loading, error } = useFetcher(async () => {
    const params = buildErrorFilterParams(urlParams);
    return apiService.get<ErrorStats>(SYNTHETICS_API_URLS.ERROR_STATS, params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    lastRefresh,
    dateRangeStart,
    dateRangeEnd,
    query,
    monitorTypes,
    locations,
    tags,
    projects,
    statusCodes,
  ]);

  return {
    stats: data ?? null,
    loading: Boolean(loading),
    error,
  };
}
