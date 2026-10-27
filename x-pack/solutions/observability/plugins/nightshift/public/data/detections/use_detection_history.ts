/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery, type UseQueryResult } from '@kbn/react-query';
import type { Detection } from '@kbn/significant-events-schema';
import { useFetchErrorToast } from '../../hooks/use_fetch_error_toast';
import { useKibana } from '../../hooks/use_kibana';
import { detectionHistoryQueryKey } from '../query_keys';

export const useDetectionHistory = (
  ruleUuid: string | undefined
): UseQueryResult<{ hits: Detection[] }, Error> => {
  const { significantEventsRepositoryClient } = useKibana().services.significantEvents;
  const showFetchErrorToast = useFetchErrorToast();

  return useQuery<{ hits: Detection[] }, Error>({
    queryKey: detectionHistoryQueryKey(ruleUuid),
    queryFn: ({ signal }) =>
      significantEventsRepositoryClient.fetch(
        'GET /internal/significant_events/detections/{id}/history',
        {
          params: { path: { id: ruleUuid ?? '' } },
          signal: signal ?? null,
        }
      ),
    enabled: Boolean(ruleUuid),
    onError: showFetchErrorToast,
  });
};
