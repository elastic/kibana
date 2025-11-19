/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { UseQueryResult, UseQueryOptions } from '@kbn/react-query';
import { useQuery } from '@kbn/react-query';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import type { ResponseActionAgentType } from '../../../../common/endpoint/service/response_actions/constants';
import { BASE_ENDPOINT_ACTION_ROUTE } from '../../../../common/endpoint/constants';
import { useHttp } from '../../../common/lib/kibana';
import type { ActionListApiResponse } from '../../../../common/endpoint/types';

/**
 * Request parameters for pending actions API
 */
export interface PendingActionsRequestQueryParams {
  agentType?: ResponseActionAgentType;
  endpointId?: string;
  page?: number;
  pageSize?: number;
  commands?: string[];
}

/**
 * Error type for pending actions API errors
 */
export interface PendingActionsErrorType {
  statusCode: number;
  message: string;
}

/**
 * Hook to retrieve pending response actions for cancellation
 * Uses the standard actions list endpoint with pending status filter
 * @param params - Query parameters including agentType, endpointId, etc.
 * @param options - Additional options for the query
 * @returns Query result containing pending actions data
 */
export const useGetPendingActions = (
  params: PendingActionsRequestQueryParams,
  options: Omit<
    UseQueryOptions<ActionListApiResponse, IHttpFetchError<PendingActionsErrorType>>,
    'queryKey' | 'queryFn'
  > = {}
): UseQueryResult<ActionListApiResponse, IHttpFetchError<PendingActionsErrorType>> => {
  const http = useHttp();

  return useQuery<ActionListApiResponse, IHttpFetchError<PendingActionsErrorType>>({
    queryKey: ['get-pending-actions', params] as const,
    queryFn: async (): Promise<ActionListApiResponse> => {
      return http.get<ActionListApiResponse>(BASE_ENDPOINT_ACTION_ROUTE, {
        version: '2023-10-31',
        query: {
          agentIds: params.endpointId ? [params.endpointId] : undefined,
          agentTypes: params.agentType ? [params.agentType] : undefined,
          commands: params.commands,
          page: params.page,
          pageSize: params.pageSize,
          statuses: ['pending'], // Filter for pending actions only
        },
      });
    },
    ...options,
  });
};
