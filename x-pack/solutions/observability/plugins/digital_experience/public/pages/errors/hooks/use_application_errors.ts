/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAbortableAsync } from '@kbn/react-hooks';
import type { ApplicationErrorsResponse } from '../../../../common/types/errors';
import { useApiClient } from '../../../hooks/use_api_client';
import { useEnvironment } from '../../../hooks/use_environment';
import { useTimeRange } from '../../../hooks/use_time_range';
import { toTimeRangeQuery } from '../../../utils/time_range_query';

export interface ApplicationErrors {
  response: ApplicationErrorsResponse | undefined;
  /** True until the first response or error, and while the next one loads. */
  isLoading: boolean;
  error: Error | undefined;
  refresh: () => void;
}

/**
 * The JS error groups of one application in the selected time range and environment, for the Errors
 * tab and the Overview's top errors.
 */
export const useApplicationErrors = (serviceName: string): ApplicationErrors => {
  const apiClient = useApiClient();
  const { timeRange } = useTimeRange();
  const { environment } = useEnvironment();

  const { value, loading, error, refresh } = useAbortableAsync(
    async ({ signal }) => {
      return apiClient.fetch('GET /internal/digital_experience/applications/{serviceName}/errors', {
        signal,
        params: { path: { serviceName }, query: toTimeRangeQuery(timeRange, environment) },
      });
    },
    [apiClient, serviceName, timeRange, environment],
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
