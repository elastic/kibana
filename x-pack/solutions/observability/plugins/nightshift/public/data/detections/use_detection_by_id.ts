/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isHttpFetchError } from '@kbn/core-http-browser';
import { useQuery, type UseQueryResult } from '@kbn/react-query';
import type { Detection } from '@kbn/significant-events-schema';
import { useKibana } from '../../hooks/use_kibana';
import { detectionByIdQueryKey } from '../query_keys';

export const useDetectionById = (
  detectionId: string | undefined,
  { enabled = true }: { enabled?: boolean } = {}
): UseQueryResult<Detection | null, Error> => {
  const { significantEventsRepositoryClient } = useKibana().services.significantEvents;

  return useQuery<Detection | null, Error>({
    queryKey: detectionByIdQueryKey(detectionId),
    enabled: enabled && Boolean(detectionId),
    queryFn: async ({ signal }) => {
      try {
        return await significantEventsRepositoryClient.fetch(
          'GET /internal/significant_events/detections/{id}',
          {
            params: { path: { id: detectionId ?? '' } },
            signal: signal ?? null,
          }
        );
      } catch (error) {
        if (isHttpFetchError(error) && error.response?.status === 404) {
          return null;
        }
        throw error;
      }
    },
  });
};
