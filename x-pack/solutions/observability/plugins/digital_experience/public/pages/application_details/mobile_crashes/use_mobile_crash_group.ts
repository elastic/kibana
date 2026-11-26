/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAbortableAsync } from '@kbn/react-hooks';
import type { MobileCrashGroupDetailResponse } from '../../../../common/types/mobile';
import { useApiClient } from '../../../hooks/use_api_client';
import { useMobileFiltersQuery } from '../mobile_overview/use_mobile_filters_query';

export interface MobileCrashGroupState {
  /** The response of the current group and filters, `undefined` while they load. */
  detail: MobileCrashGroupDetailResponse | undefined;
  isLoading: boolean;
  error: Error | undefined;
  refresh: () => void;
}

/** A crash group's detail, over the URL's filters and range. */
export const useMobileCrashGroup = (
  serviceName: string,
  fingerprint: string
): MobileCrashGroupState => {
  const apiClient = useApiClient();
  const { toQuery, key } = useMobileFiltersQuery();
  // The group and the URL's params, so another group never shows the last one's detail.
  const paramsKey = JSON.stringify([serviceName, fingerprint, key]);

  const {
    value: fetched,
    loading,
    error,
    refresh,
  } = useAbortableAsync(
    async ({ signal }) => ({
      paramsKey,
      response: await apiClient.fetch(
        'GET /internal/digital_experience/mobile_applications/{serviceName}/crash_groups/{fingerprint}',
        {
          signal,
          params: {
            path: { serviceName, fingerprint },
            query: toQuery(),
          },
        }
      ),
    }),
    [apiClient, serviceName, fingerprint, toQuery, paramsKey],
    { unsetValueOnError: true }
  );
  // Loading from the render the group or params change in, so no frame shows the last detail.
  const isCurrent = fetched?.paramsKey === paramsKey;
  const isLoading = loading || (!isCurrent && !error);
  return {
    detail: isLoading ? undefined : fetched?.response,
    isLoading,
    error: loading ? undefined : error,
    refresh,
  };
};
