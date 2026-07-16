/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery, type UseQueryResult } from '@kbn/react-query';
import type { SignificantEventsAvailabilityResponse } from '@kbn/significant-events-plugin/common';
import { useKibana } from '../../../utils/kibana_react';

export const useFetchSignificantEventsAvailability = (
  enabled: boolean = true
): UseQueryResult<SignificantEventsAvailabilityResponse, Error> => {
  const { http } = useKibana().services;

  return useQuery<SignificantEventsAvailabilityResponse, Error>({
    queryKey: ['nightshift.significantEventsAvailability'],
    queryFn: async ({ signal }) => {
      return http.get<SignificantEventsAvailabilityResponse>(
        '/internal/significant_events/availability',
        { signal }
      );
    },
    enabled,
  });
};
