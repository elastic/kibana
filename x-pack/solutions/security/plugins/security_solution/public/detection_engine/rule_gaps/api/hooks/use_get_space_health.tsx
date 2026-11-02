/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback } from 'react';
import type { UseQueryOptions } from '@kbn/react-query';
import { useQuery, useQueryClient } from '@kbn/react-query';
import type {
  GetSpaceHealthResponse,
  HealthIntervalParameters,
} from '../../../../../common/api/detection_engine/rule_monitoring';
import {
  GET_SPACE_HEALTH_URL,
  HealthIntervalType,
  HealthIntervalGranularity,
} from '../../../../../common/api/detection_engine/rule_monitoring';
import { KibanaServices } from '../../../../common/lib/kibana';

const GET_SPACE_HEALTH = ['GET_SPACE_HEALTH'];

const DEFAULT_INTERVAL: HealthIntervalParameters = {
  type: HealthIntervalType.last_hour,
  granularity: HealthIntervalGranularity.minute,
};

export const useInvalidateGetSpaceHealthQuery = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries([GET_SPACE_HEALTH], {
      refetchType: 'active',
    });
  }, [queryClient]);
};

/**
 * Fetches space health data for detection rules.
 *
 */
export const useGetSpaceHealth = (
  { interval = DEFAULT_INTERVAL }: { interval?: HealthIntervalParameters } = {},
  options?: UseQueryOptions<GetSpaceHealthResponse>
) => {
  return useQuery<GetSpaceHealthResponse>(
    [GET_SPACE_HEALTH, interval],
    async ({ signal }) => {
      const response = await KibanaServices.get().http.fetch<GetSpaceHealthResponse>(
        GET_SPACE_HEALTH_URL,
        {
          method: 'POST',
          version: '1',
          body: JSON.stringify({
            interval,
          }),
          signal,
        }
      );

      return response;
    },
    {
      retry: 0,
      keepPreviousData: true,
      ...options,
    }
  );
};
