/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAbortableAsync } from '@kbn/react-hooks';
import {
  SCHEDULED_REPORTS_LIST_ENDPOINT,
  type ScheduledReport,
} from '../../../../common/types/scheduled_reports';
import { useApiClient } from '../../../hooks/use_api_client';

/** Loads the managed scheduled scorecard reports of one application in the current space. */
export const useScheduledReports = (
  serviceName: string
): {
  available: boolean | undefined;
  reports: ScheduledReport[] | undefined;
  isLoading: boolean;
  error: Error | undefined;
  refresh: () => void;
} => {
  const apiClient = useApiClient();

  const { value, loading, error, refresh } = useAbortableAsync(
    ({ signal }) =>
      apiClient.fetch(SCHEDULED_REPORTS_LIST_ENDPOINT, {
        signal,
        params: { path: { serviceName } },
      }),
    [apiClient, serviceName]
  );

  return {
    available: value?.available,
    reports: value?.reports,
    isLoading: loading,
    error,
    refresh,
  };
};
