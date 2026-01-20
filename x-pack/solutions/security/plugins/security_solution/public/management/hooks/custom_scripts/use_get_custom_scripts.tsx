/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { UseQueryResult, UseQueryOptions } from '@kbn/react-query';
import { useQuery } from '@kbn/react-query';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import type { CustomScriptsRequestQueryParams } from '../../../../common/api/endpoint/custom_scripts/get_custom_scripts_route';
import type {
  ResponseActionScript,
  ResponseActionScriptsApiResponse,
} from '../../../../common/endpoint/types';
import { CUSTOM_SCRIPTS_ROUTE } from '../../../../common/endpoint/constants';
import { useHttp } from '../../../common/lib/kibana';

/**
 * Error type for custom scripts API errors
 */
export interface CustomScriptsErrorType {
  statusCode: number;
  message: string;
  meta: ActionTypeExecutorResult<unknown>;
}

/**
 * Hook to retrieve custom scripts for a specific agent type
 * @param agentType - The type of agent to get scripts for (e.g., 'crowdstrike')
 * @param query
 * @param options - Additional options for the query
 * @returns Query result containing custom scripts data
 */

export const useGetCustomScripts = <TMeta extends {} = {}>(
  agentType: CustomScriptsRequestQueryParams['agentType'],
  query: Omit<CustomScriptsRequestQueryParams, 'agentType'> = {},
  options: Omit<
    UseQueryOptions<
      ResponseActionScriptsApiResponse<TMeta>['data'],
      IHttpFetchError<CustomScriptsErrorType>
    >,
    'queryKey' | 'queryFn'
  > = {}
): UseQueryResult<ResponseActionScript<TMeta>[], IHttpFetchError<CustomScriptsErrorType>> => {
  const http = useHttp();

  return useQuery<ResponseActionScript<TMeta>[], IHttpFetchError<CustomScriptsErrorType>>({
    ...options,
    queryKey: ['get-custom-scripts', agentType, query],
    queryFn: () => {
      return http
        .get<ResponseActionScriptsApiResponse<TMeta>>(CUSTOM_SCRIPTS_ROUTE, {
          version: '1',
          query: {
            agentType,
            ...query,
          },
        })
        .then((response) => response.data);
    },
  });
};
