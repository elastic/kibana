/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryResult, UseQueryOptions } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import type { CustomScript, CustomScriptsResponse } from '../../../../server/endpoint/services';
import type { ResponseActionAgentType } from '../../../../common/endpoint/service/response_actions/constants';
import { CUSTOM_SCRIPTS_ROUTE } from '../../../../common/endpoint/constants';
import { useHttp } from '../../../common/lib/kibana';

/**
 * Error type for custom scripts API errors
 */
interface CustomScriptsErrorType {
  statusCode: number;
  message: string;
  meta: ActionTypeExecutorResult<unknown>;
}

/**
 * Hook to retrieve custom scripts for a specific agent type
 * @param agentType - The type of agent to get scripts for (e.g., 'crowdstrike')
 * @param options - Additional options for the query
 * @returns Query result containing custom scripts data
 */
export const useGetCustomScripts = (
  agentType: ResponseActionAgentType,
  options: Omit<
    UseQueryOptions<CustomScriptsResponse, IHttpFetchError<CustomScriptsErrorType>>,
    'queryKey' | 'queryFn'
  > = {}
): UseQueryResult<CustomScript[], IHttpFetchError<CustomScriptsErrorType>> => {
  const http = useHttp();

  return useQuery<CustomScript[], IHttpFetchError<CustomScriptsErrorType>>({
    queryKey: ['get-custom-scripts', agentType],
    queryFn: () => {
      return http
        .get<CustomScriptsResponse>(CUSTOM_SCRIPTS_ROUTE, {
          version: '1',
          query: {
            agentType,
          },
        })
        .then((response) => response.data);
    },
  });
};
