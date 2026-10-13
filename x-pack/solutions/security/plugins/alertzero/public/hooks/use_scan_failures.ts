/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryResult } from '@kbn/react-query';
import { useQuery } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  ALERTZERO_SCAN_FAILURES_URL,
  API_VERSIONS,
  type ScanFailuresResponse,
} from '@kbn/alertzero-common';
import { retryOnTransientError } from './retry_on_transient_error';
import { PROPOSALS_POLL_INTERVAL_MS } from './use_proposals_api';

/** The queue already refreshes on this interval. The 24-hour window is applied per request. */
export const SCAN_FAILURES_POLL_INTERVAL_MS = PROPOSALS_POLL_INTERVAL_MS;

/** Workers with a failed managed scan in the trailing 24 hours. */
export const useScanFailures = (): UseQueryResult<ScanFailuresResponse> => {
  const { services } = useKibana();

  return useQuery({
    queryKey: ['alertzero', 'scan-failures'] as const,
    queryFn: async (): Promise<ScanFailuresResponse> =>
      services.http!.get<ScanFailuresResponse>(ALERTZERO_SCAN_FAILURES_URL, {
        version: API_VERSIONS.internal.v1,
      }),
    refetchInterval: SCAN_FAILURES_POLL_INTERVAL_MS,
    retry: retryOnTransientError,
  });
};
