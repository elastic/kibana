/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { UseQueryResult, UseQueryOptions } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import type { ResponseActionAgentType } from '../../../../common/endpoint/service/response_actions/constants';
import { PENDING_ACTIONS_ROUTE } from '../../../../common/endpoint/constants';
import { useHttp } from '../../../common/lib/kibana';

/**
 * Request parameters for pending actions API
 */
export interface PendingActionsRequestQueryParams {
  agentType?: ResponseActionAgentType;
  endpointId?: string;
  page?: number;
  pageSize?: number;
  commands?: string[];

  [key: string]: string | number | string[] | undefined;
}

/**
 * Response structure for pending actions API
 */
export interface PendingActionsResponse {
  data: Array<{
    id: string; // Internal action ID
    command: string; // Action type (isolate, execute, etc.)
    isCompleted: boolean;
    wasSuccessful: boolean;
    status: string;
    createdBy: string;
    '@timestamp': string;
    agents: Array<{
      agent: { id: string };
      host: { name: string };
    }>;
    comment?: string;
  }>;
  total: number;
  page: number;
  pageSize: number;
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
 * @param params - Query parameters including agentType, endpointId, etc.
 * @param options - Additional options for the query
 * @returns Query result containing pending actions data
 */
export const useGetPendingActions = (
  params: PendingActionsRequestQueryParams,
  options: Omit<
    UseQueryOptions<PendingActionsResponse, IHttpFetchError<PendingActionsErrorType>>,
    'queryKey' | 'queryFn'
  > = {}
): UseQueryResult<PendingActionsResponse, IHttpFetchError<PendingActionsErrorType>> => {
  const http = useHttp();

  return useQuery<PendingActionsResponse, IHttpFetchError<PendingActionsErrorType>>({
    queryKey: ['get-pending-actions', params] as const,
    queryFn: async (): Promise<PendingActionsResponse> => {
      return http.get<PendingActionsResponse>(PENDING_ACTIONS_ROUTE, {
        version: '1',
        query: params,
      });
    },
    ...options,
  });
};
