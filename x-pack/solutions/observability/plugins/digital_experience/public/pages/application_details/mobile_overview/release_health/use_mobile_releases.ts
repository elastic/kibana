/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
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
  /** Until the response of the current filters, or an error. */
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

  const query = useMemo(
    // The charts' buckets line up with the user's time zone, as the other time charts'
    () => ({ ...toTimeRangeQuery(timeRange, environment, timeZone), osName, release }),
    [timeRange, environment, timeZone, osName, release]
  );
  // Which params a response is for: a new filter's first render still has the last response
  const paramsKey = JSON.stringify([serviceName, query]);

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
        { signal, params: { path: { serviceName }, query } }
      ),
    }),
    [apiClient, serviceName, query, paramsKey],
    { unsetValueOnError: true }
  );
  // Loading from the render the params change in, not only once the request starts, so the table
  // never shows the last response with the new filter, e.g. its rows with a new release's pill
  const isCurrent = fetched?.paramsKey === paramsKey;
  const isLoading = loading || (!isCurrent && !error);
  return {
    releases: isLoading ? undefined : fetched?.response,
    isLoading,
    error: loading ? undefined : error,
    refresh,
  };
};
