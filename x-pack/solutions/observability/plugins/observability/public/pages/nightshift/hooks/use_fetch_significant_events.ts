/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery, type UseQueryResult } from '@kbn/react-query';
import type { SignificantEvent } from '@kbn/significant-events-schema';
import type { PaginatedResponse } from '@kbn/streams-plugin/common';
import { useKibana } from '../../../utils/kibana_react';

/**
 * The landing page shows an overnight triage summary, so it pulls a single
 * capped page of the most recent events rather than paginating. If a cluster
 * produces more than this in the window, `total` will exceed `hits.length` and
 * the UI can surface that the view is truncated.
 */
const NIGHTSHIFT_EVENTS_PAGE_SIZE = 50;
const NIGHTSHIFT_LOOKBACK_DAYS = 30;
const NIGHTSHIFT_LOOKBACK_MS = NIGHTSHIFT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000;

export const useFetchSignificantEvents = (): UseQueryResult<
  PaginatedResponse<SignificantEvent>,
  Error
> => {
  const { http } = useKibana().services;

  return useQuery<PaginatedResponse<SignificantEvent>, Error>({
    queryKey: ['nightshift.significantEvents'],
    queryFn: async ({ signal }) => {
      return http.get<PaginatedResponse<SignificantEvent>>('/internal/significant_events/events', {
        query: {
          page: 1,
          perPage: NIGHTSHIFT_EVENTS_PAGE_SIZE,
          from: new Date(Date.now() - NIGHTSHIFT_LOOKBACK_MS).toISOString(),
          to: new Date().toISOString(),
        },
        signal,
      });
    },
  });
};
