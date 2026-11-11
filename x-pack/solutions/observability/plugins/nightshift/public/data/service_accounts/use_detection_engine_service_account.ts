/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery, type UseQueryResult } from '@kbn/react-query';
import type { DetectionEngineServiceAccountStatus } from '@kbn/significant-events-plugin/common';
import { isHttpClientError } from '../../common/http_error';
import { useKibana } from '../../hooks/use_kibana';
import { DETECTION_ENGINE_SERVICE_ACCOUNT_QUERY_KEY } from '../query_keys';

/** Reads the account the detection engine runs as in the current space, `null` until set up. */
export const useDetectionEngineServiceAccount = (): UseQueryResult<
  DetectionEngineServiceAccountStatus,
  Error
> => {
  const { significantEventsRepositoryClient } = useKibana().services.significantEvents;

  return useQuery<DetectionEngineServiceAccountStatus, Error>({
    queryKey: DETECTION_ENGINE_SERVICE_ACCOUNT_QUERY_KEY,
    queryFn: ({ signal }) =>
      significantEventsRepositoryClient.fetch('GET /internal/significant_events/service_account', {
        signal: signal ?? null,
      }),
    retry: (failureCount, error) => !isHttpClientError(error) && failureCount < 3,
  });
};
