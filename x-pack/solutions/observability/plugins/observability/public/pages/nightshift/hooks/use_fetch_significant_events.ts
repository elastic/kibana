/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { SignificantEvent } from '@kbn/significant-events-schema';
import { useKibana } from '../../../utils/kibana_react';

interface SignificantEventsResponse {
  hits: SignificantEvent[];
  page: number;
  perPage: number;
  total: number;
}

export const useFetchSignificantEvents = () => {
  const { http } = useKibana().services;

  return useQuery<SignificantEventsResponse, Error>({
    queryKey: ['nightshift.significantEvents'],
    queryFn: async ({ signal }) => {
      return http.get<SignificantEventsResponse>('/internal/significant_events/events', {
        query: {
          page: 1,
          perPage: 50,
          from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          to: new Date().toISOString(),
        },
        signal,
      });
    },
  });
};
