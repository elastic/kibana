/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useKibana } from '../../hooks/use_kibana';
import { significantEventsFacetsQueryKey } from '../query_keys';
import { toEventsFilterQuery, type SignificantEventsFilters } from './events_filter_query';

/** Counts per filter option for the Events tab, with the same filters as the list. */
export const useSignificantEventsFacets = (filters: SignificantEventsFilters) => {
  const { significantEventsRepositoryClient } = useKibana().services.significantEvents;

  return useQuery({
    queryKey: significantEventsFacetsQueryKey(filters),
    queryFn: ({ signal }) =>
      significantEventsRepositoryClient.fetch('GET /internal/significant_events/events/_facets', {
        params: { query: toEventsFilterQuery(filters) },
        signal: signal ?? null,
      }),
    keepPreviousData: true,
  });
};
