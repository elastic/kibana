/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAbortableAsync } from '@kbn/react-hooks';
import { toTimeRangeQuery } from '../utils/time_range_query';
import type { DigitalExperienceApiClient } from './use_api_client';
import { useApiClient } from './use_api_client';
import { useEnvironment } from './use_environment';
import { useTimeRange } from './use_time_range';

/** The options of a request for one application's data. */
export interface ApplicationRequestOptions {
  signal: AbortSignal;
  params: { path: { serviceName: string }; query: ReturnType<typeof toTimeRangeQuery> };
}

/** A request for one application's data, e.g. `apiClient.fetch('GET …/errors', options)`. */
export type ApplicationRequest<TResponse> = (
  apiClient: DigitalExperienceApiClient,
  options: ApplicationRequestOptions
) => Promise<TResponse>;

export interface ApplicationData<TResponse> {
  response: TResponse | undefined;
  /** True until the first response or error, and while the next one loads. */
  isLoading: boolean;
  error: Error | undefined;
  refresh: () => void;
}

/**
 * One application's data from `request`, defined outside the component so it stays the same, in
 * the selected time range and environment.
 */
export const useApplicationData = <TResponse>(
  serviceName: string,
  request: ApplicationRequest<TResponse>
): ApplicationData<TResponse> => {
  const apiClient = useApiClient();
  const { timeRange } = useTimeRange();
  const { environment } = useEnvironment();

  const { value, loading, error, refresh } = useAbortableAsync<Promise<TResponse>>(
    async ({ signal }) => {
      return request(apiClient, {
        signal,
        params: { path: { serviceName }, query: toTimeRangeQuery(timeRange, environment) },
      });
    },
    [apiClient, request, serviceName, timeRange, environment],
    // The results of another application, environment or time range are never shown as current.
    { clearValueOnNext: true, unsetValueOnError: true }
  );

  return {
    response: value,
    // Nothing has been fetched before the first request starts.
    isLoading: loading || (!value && !error),
    error,
    refresh,
  };
};
