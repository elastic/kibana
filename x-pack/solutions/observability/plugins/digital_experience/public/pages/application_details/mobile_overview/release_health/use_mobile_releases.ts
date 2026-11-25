/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAbortableAsync } from '@kbn/react-hooks';
import type { MobileReleasesResponse } from '../../../../../common/types/mobile';
import { useApiClient } from '../../../../hooks/use_api_client';
import { useEnvironment } from '../../../../hooks/use_environment';
import { useFormatters } from '../../../../hooks/use_formatters';
import { useQueryParam } from '../../../../hooks/use_query_param';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { toTimeRangeQuery } from '../../../../utils/time_range_query';

export interface MobileReleasesState {
  /** The response of the current filters, `undefined` while they load. */
  releases: MobileReleasesResponse | undefined;
  isLoading: boolean;
  error: Error | undefined;
  refresh: () => void;
}

/** A mobile application's release health, over the URL's filters and range. */
export const useMobileReleases = (serviceName: string): MobileReleasesState => {
  const apiClient = useApiClient();
  const { timeRange } = useTimeRange();
  const { environment } = useEnvironment();
  const { value: osName } = useQueryParam('osName');
  const { value: release } = useQueryParam('release');
  const { timeZone } = useFormatters();

  // The URL's params, not the times they resolve to, so a refresh resolves "now" again
  const paramsKey = JSON.stringify([
    serviceName,
    timeRange,
    environment,
    timeZone,
    osName,
    release,
  ]);

  const {
    value: fetched,
    loading,
    error,
    refresh,
  } = useAbortableAsync(
    async ({ signal }) => ({
      paramsKey,
      response: await apiClient.fetch(
        'GET /internal/digital_experience/mobile_applications/{serviceName}/releases',
        {
          signal,
          params: {
            path: { serviceName },
            query: { ...toTimeRangeQuery(timeRange, environment, timeZone), osName, release },
          },
        }
      ),
    }),
    [apiClient, serviceName, timeRange, environment, timeZone, osName, release, paramsKey],
    { unsetValueOnError: true }
  );
  // Loading from the render the params change in, so no frame shows the last response's rows
  const isCurrent = fetched?.paramsKey === paramsKey;
  const isLoading = loading || (!isCurrent && !error);
  return {
    releases: isLoading ? undefined : fetched?.response,
    isLoading,
    error: loading ? undefined : error,
    refresh,
  };
};
