/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAbortableAsync } from '@kbn/react-hooks';
import type { MobileCrashGroupsResponse } from '../../../../common/types/mobile';
import { useApiClient } from '../../../hooks/use_api_client';
import { useMobileFiltersQuery } from '../mobile_overview/use_mobile_filters_query';

export interface MobileCrashGroupsState {
  /** The response of the current filters, `undefined` while they load. */
  response: MobileCrashGroupsResponse | undefined;
  /** The last response, kept while new filters load or the list refreshes; `undefined` on error. */
  lastResponse: MobileCrashGroupsResponse | undefined;
  isLoading: boolean;
  error: Error | undefined;
  refresh: () => void;
}

/** A mobile application's crash groups, over the URL's filters and range. */
export const useMobileCrashGroups = (serviceName: string): MobileCrashGroupsState => {
  const apiClient = useApiClient();
  const { toQuery } = useMobileFiltersQuery();

  const { value, loading, error, refresh } = useAbortableAsync(
    async ({ signal }) =>
      apiClient.fetch(
        'GET /internal/digital_experience/mobile_applications/{serviceName}/crash_groups',
        {
          signal,
          params: {
            path: { serviceName },
            query: toQuery(),
          },
        }
      ),
    [apiClient, serviceName, toQuery],
    { unsetValueOnError: true }
  );
  // Nothing has been fetched before the first request starts.
  const isLoading = loading || (!value && !error);
  return {
    response: isLoading ? undefined : value,
    lastResponse: value,
    isLoading,
    error: loading ? undefined : error,
    refresh,
  };
};
