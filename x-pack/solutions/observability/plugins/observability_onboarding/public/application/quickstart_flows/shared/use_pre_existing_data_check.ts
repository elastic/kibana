/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import { useFetcher } from '../../../hooks/use_fetcher';

const FLOW_ENDPOINTS = {
  kubernetes: '/internal/observability_onboarding/kubernetes/{onboardingId}/has-data',
  otel_host: '/internal/observability_onboarding/otel_host/has-data',
  otel_apm: '/internal/observability_onboarding/otel_apm/has-data',
} as const;

type PreExistingDataFlow = keyof typeof FLOW_ENDPOINTS;

export function usePreExistingDataCheck({
  flow,
  onboardingId,
  enabled = true,
}: {
  flow: PreExistingDataFlow;
  onboardingId?: string;
  enabled?: boolean;
}): boolean {
  const endpoint = FLOW_ENDPOINTS[flow];
  const needsOnboardingId = flow === 'kubernetes';
  const [start] = useState(() => new Date().toISOString());

  const { data } = useFetcher(
    (callApi): Promise<{ hasPreExistingData?: boolean }> | undefined => {
      if (!enabled) return;
      if (needsOnboardingId && !onboardingId) return;
      return callApi(`GET ${endpoint}` as Parameters<typeof callApi>[0], {
        params: {
          ...(onboardingId ? { path: { onboardingId } } : {}),
          query: { start },
        },
      });
    },
    [endpoint, start, onboardingId, needsOnboardingId, enabled],
    { showToastOnError: false }
  );

  return data?.hasPreExistingData ?? false;
}
