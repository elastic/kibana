/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryOptions, UseQueryResult } from '@kbn/react-query';
import { useQuery } from '@kbn/react-query';
import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';
import type { ListScriptsRequestQuery } from '../../../../common/api/endpoint';
import { useHttp } from '../../../common/lib/kibana';
import { SCRIPTS_LIBRARY_ROUTE } from '../../../../common/endpoint/constants';
import type { EndpointScriptListApiResponse } from '../../../../common/endpoint/types';

export const useGetEndpointScriptsList = (
  query: ListScriptsRequestQuery,
  options: UseQueryOptions<EndpointScriptListApiResponse, IHttpFetchError<ResponseErrorBody>> = {}
): UseQueryResult<EndpointScriptListApiResponse, IHttpFetchError<ResponseErrorBody>> => {
  const http = useHttp();

  return useQuery<EndpointScriptListApiResponse, IHttpFetchError<ResponseErrorBody>>({
    queryKey: ['get-scripts-library', query],
    ...options,
    keepPreviousData: true,
    queryFn: async () => {
      return http.get<EndpointScriptListApiResponse>(SCRIPTS_LIBRARY_ROUTE, {
        version: '2023-10-31',
        query: {
          page: query?.page ?? 1,
          pageSize: query?.pageSize ?? 10,
          sortField: query?.sortField,
          sortDirection: query?.sortDirection,
          kuery: query?.kuery,
        },
      });
    },
  });
};
