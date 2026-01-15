/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryOptions, UseQueryResult } from '@kbn/react-query';
import { useQuery } from '@kbn/react-query';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { resolvePathVariables } from '../../../../../common/utils/resolve_path_variables';
import type { GetOneScriptRequestParams } from '../../../../../../common/api/endpoint';
import { useHttp } from '../../../../../common/lib/kibana';
import { SCRIPTS_LIBRARY_ROUTE_ITEM } from '../../../../../../common/endpoint/constants';
import type { EndpointScriptApiResponse } from '../../../../../../common/endpoint/types';

interface ErrorType {
  statusCode: number;
  message: string;
}

export const useGetEndpointScript = (
  params: GetOneScriptRequestParams,
  options: UseQueryOptions<EndpointScriptApiResponse, IHttpFetchError<ErrorType>> = {}
): UseQueryResult<EndpointScriptApiResponse, IHttpFetchError<ErrorType>> => {
  const http = useHttp();

  return useQuery<EndpointScriptApiResponse, IHttpFetchError<ErrorType>>({
    queryKey: ['get-scripts-library', params],
    ...options,
    keepPreviousData: true,
    queryFn: async () => {
      return http.get<EndpointScriptApiResponse>(
        resolvePathVariables(SCRIPTS_LIBRARY_ROUTE_ITEM, { script_id: params.script_id }),
        { version: '2023-10-31' }
      );
    },
  });
};
