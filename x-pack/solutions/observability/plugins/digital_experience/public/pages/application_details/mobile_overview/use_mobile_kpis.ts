/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAbortableAsync } from '@kbn/react-hooks';
import type { MobileKpisResponse } from '../../../../common/types/mobile';
import { useApiClient } from '../../../hooks/use_api_client';
import { useEnvironment } from '../../../hooks/use_environment';
import { useQueryParam } from '../../../hooks/use_query_param';
import { useTimeRange } from '../../../hooks/use_time_range';
import { toTimeRangeQuery } from '../../../utils/time_range_query';

export interface MobileKpisState {
  /** The last response, kept while new filters load: only the filter options and badges use it. */
  kpis: MobileKpisResponse | undefined;
  /** The response of the current filters, `undefined` while they load. */
  currentKpis: MobileKpisResponse | undefined;
  /** Until the response of the current filters, or an error. */
  isLoading: boolean;
  error: Error | undefined;
  refresh: () => void;
}

/** A mobile application's KPIs, picker options and platforms, over the URL's filters and range. */
export const useMobileKpis = (serviceName: string): MobileKpisState => {
  const apiClient = useApiClient();
  const { timeRange } = useTimeRange();
  const { environment } = useEnvironment();
  const { value: osName } = useQueryParam('osName');
  const { value: release } = useQueryParam('release');

  const {
    value: kpis,
    loading,
    error,
    refresh,
  } = useAbortableAsync(
    async ({ signal }) =>
      apiClient.fetch('GET /internal/digital_experience/mobile_applications/{serviceName}/kpis', {
        signal,
        params: {
          path: { serviceName },
          query: { ...toTimeRangeQuery(timeRange, environment), osName, release },
        },
      }),
    [apiClient, serviceName, timeRange, environment, osName, release],
    { unsetValueOnError: true }
  );
  // Nothing has been fetched before the first request starts.
  const isLoading = loading || (!kpis && !error);
  return {
    kpis,
    currentKpis: isLoading ? undefined : kpis,
    isLoading,
    error: loading ? undefined : error,
    refresh,
  };
};
