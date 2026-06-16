/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import { useFetcher } from '../../../hooks/use_fetcher';

const FLOW_ENDPOINTS = {
  otel_host: '/internal/observability_onboarding/otel_host/has-data',
  otel_apm: '/internal/observability_onboarding/otel_apm/has-data',
} as const;

type PreExistingDataFlow = keyof typeof FLOW_ENDPOINTS;

export function usePreExistingDataCheck({
  flow,
  enabled = true,
}: {
  flow: PreExistingDataFlow;
  enabled?: boolean;
}): boolean {
  const endpoint = FLOW_ENDPOINTS[flow];
  const [start] = useState(() => new Date().toISOString());

  const { data } = useFetcher(
    (callApi): Promise<{ hasPreExistingData?: boolean }> | undefined => {
      if (!enabled) return;
      return callApi(`GET ${endpoint}` as Parameters<typeof callApi>[0], {
        params: {
          query: { start },
        },
      });
    },
    [endpoint, start, enabled],
    { showToastOnError: false }
  );

  return data?.hasPreExistingData ?? false;
}
