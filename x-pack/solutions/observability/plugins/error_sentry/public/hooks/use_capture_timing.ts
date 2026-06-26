/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { HttpSetup } from '@kbn/core/public';

export interface CaptureTiming {
  lastRun: string | null;
  nextRun: string | null;
}

export const useCaptureTiming = (http: HttpSetup, isPolling = false) => {
  const { data, isLoading } = useQuery(
    ['errorSentry', 'captureTiming'],
    ({ signal }) => http.get<CaptureTiming>('/internal/error_sentry/capture_timing', { signal }),
    { refetchInterval: isPolling ? 5000 : false }
  );

  return {
    isLoading,
    lastRun: data?.lastRun ?? null,
    nextRun: data?.nextRun ?? null,
  };
};
