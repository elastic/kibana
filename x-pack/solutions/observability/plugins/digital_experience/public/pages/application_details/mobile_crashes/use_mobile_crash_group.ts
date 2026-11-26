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
  const { toQuery } = useMobileFiltersQuery();

  const { value, loading, error, refresh } = useAbortableAsync(
    async ({ signal }) =>
      apiClient.fetch(
        'GET /internal/digital_experience/mobile_applications/{serviceName}/crash_groups/{fingerprint}',
        {
          signal,
          params: {
            path: { serviceName, fingerprint },
            query: toQuery(),
          },
        }
      ),
    [apiClient, serviceName, fingerprint, toQuery],
    { unsetValueOnError: true }
  );
  const isLoading = loading || (!value && !error);
  return {
    detail: isLoading ? undefined : value,
    isLoading,
    error: loading ? undefined : error,
    refresh,
  };
};
