/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { SignificantEventsAvailabilityResponse } from '@kbn/significant-events-plugin/common';
import { useKibana } from './use_kibana';

export const NIGHTSHIFT_AVAILABILITY_QUERY_KEY = ['nightshift.significantEventsAvailability'];

/**
 * `GET /internal/significant_events/availability` is the single source of truth for whether
 * Significant Events can run: it aggregates the rollout flag, project type, pricing tier,
 * license and required plugins. Nightshift renders Significant Events data, so it is gated
 * on the same answer rather than re-deriving one from the flag alone.
 */
export const useSignificantEventsAvailability = (): {
  isAvailable: boolean;
  isLoading: boolean;
} => {
  const {
    significantEvents: { significantEventsRepositoryClient },
  } = useKibana().services;

  const { data, isLoading, isError } = useQuery<SignificantEventsAvailabilityResponse, Error>({
    queryKey: NIGHTSHIFT_AVAILABILITY_QUERY_KEY,
    queryFn: async ({ signal }) =>
      significantEventsRepositoryClient.fetch('GET /internal/significant_events/availability', {
        signal: signal ?? null,
      }),
  });

  // A failed request counts as unavailable so the page redirects instead of rendering
  // an app whose every request would fail.
  return { isAvailable: !isError && data?.available === true, isLoading };
};
