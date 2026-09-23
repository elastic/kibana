/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import { type QueryFunctionContext, useQuery } from '@kbn/react-query';
import type { Detection } from '@kbn/significant-events-schema';
import type { PaginatedResponse } from '@kbn/streams-plugin/common';
import { useKibana } from './use_kibana';
import { useFetchErrorToast } from './use_fetch_error_toast';

interface UseFetchDetectionsParams {
  from: string | number;
  to: string | number;
}

export const useFetchDetections = ({ from, to }: UseFetchDetectionsParams) => {
  const { significantEventsRepositoryClient } = useKibana().dependencies.start.significantEvents;
  const showFetchErrorToast = useFetchErrorToast();

  const [pagination, setPagination] = useState({ page: 1, perPage: 25 });

  useEffect(() => {
    setPagination((prev) => (prev.page === 1 ? prev : { ...prev, page: 1 }));
  }, [from, to]);

  const fetchDetections = useCallback(
    async ({ signal }: QueryFunctionContext): Promise<PaginatedResponse<Detection>> => {
      return significantEventsRepositoryClient.fetch(
        'GET /internal/significant_events/detections',
        {
          params: {
            query: {
              page: pagination.page,
              perPage: pagination.perPage,
              from: new Date(from).toISOString(),
              to: new Date(to).toISOString(),
            },
          },
          signal: signal ?? null,
        }
      );
    },
    [significantEventsRepositoryClient, pagination, from, to]
  );

  const query = useQuery<PaginatedResponse<Detection>, Error>({
    queryKey: ['detections', pagination.page, pagination.perPage, from, to],
    queryFn: fetchDetections,
    onError: showFetchErrorToast,
  });

  return { ...query, pagination, setPagination };
};

export const useFetchDetectionHistory = (ruleUuid: string | undefined) => {
  const { significantEventsRepositoryClient } = useKibana().dependencies.start.significantEvents;
  const showFetchErrorToast = useFetchErrorToast();

  return useQuery<{ hits: Detection[] }, Error>({
    queryKey: ['detectionHistory', ruleUuid],
    queryFn: async ({ signal }) => {
      return significantEventsRepositoryClient.fetch(
        'GET /internal/significant_events/detections/{id}/history',
        {
          params: { path: { id: ruleUuid! } },
          signal: signal ?? null,
        }
      );
    },
    enabled: !!ruleUuid,
    onError: showFetchErrorToast,
  });
};
