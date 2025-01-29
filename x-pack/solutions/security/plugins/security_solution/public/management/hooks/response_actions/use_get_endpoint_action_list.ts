/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import type { EndpointActionListRequestQuery } from '../../../../common/api/endpoint';
import { useHttp } from '../../../common/lib/kibana';
import { BASE_ENDPOINT_ACTION_ROUTE } from '../../../../common/endpoint/constants';
import type { ActionListApiResponse } from '../../../../common/endpoint/types';

interface ErrorType {
  statusCode: number;
  message: string;
}

export const useGetEndpointActionList = (
  query: EndpointActionListRequestQuery,
  options: UseQueryOptions<ActionListApiResponse, IHttpFetchError<ErrorType>> = {}
): UseQueryResult<ActionListApiResponse, IHttpFetchError<ErrorType>> => {
  const http = useHttp();

  // prepend and append * to userIds for fuzzy search
  let userIds = query.userIds;
  if (typeof query.userIds === 'string') {
    userIds = `*${query.userIds}*`;
  } else if (Array.isArray(query.userIds)) {
    userIds = query.userIds.map((userId) => `*${userId}*`);
  }

  return useQuery<ActionListApiResponse, IHttpFetchError<ErrorType>>({
    queryKey: ['get-action-list', query],
    ...options,
    keepPreviousData: true,
    queryFn: async () => {
      return http.get<ActionListApiResponse>(BASE_ENDPOINT_ACTION_ROUTE, {
        version: '2023-10-31',
        query: {
          agentIds: query.agentIds,
          agentTypes: query.agentTypes,
          commands: query.commands,
          endDate: query.endDate,
          page: query.page,
          pageSize: query.pageSize,
          startDate: query.startDate,
          statuses: query.statuses,
          userIds,
          withOutputs: query.withOutputs,
          types: query.types,
        },
      });
    },
  });
};
