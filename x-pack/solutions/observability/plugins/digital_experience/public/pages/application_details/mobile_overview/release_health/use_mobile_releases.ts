/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAbortableAsync } from '@kbn/react-hooks';
import type { MobileReleasesResponse } from '../../../../../common/types/mobile';
import { useApiClient } from '../../../../hooks/use_api_client';
import { useFormatters } from '../../../../hooks/use_formatters';
import { useMobileFiltersQuery } from '../use_mobile_filters_query';

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
  const { timeZone } = useFormatters();
  const { toQuery, key } = useMobileFiltersQuery(timeZone);
  // The URL's params, not the times they resolve to, so a refresh resolves "now" again
  const paramsKey = JSON.stringify([serviceName, key]);

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
            query: toQuery(),
          },
        }
      ),
    }),
    [apiClient, serviceName, toQuery, paramsKey],
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
