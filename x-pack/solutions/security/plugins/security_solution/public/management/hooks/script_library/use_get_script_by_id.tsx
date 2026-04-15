/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryOptions, UseQueryResult } from '@kbn/react-query';
import { useQuery } from '@kbn/react-query';
import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';
import { resolvePathVariables } from '../../../common/utils/resolve_path_variables';
import { useHttp } from '../../../common/lib/kibana';
import { SCRIPTS_LIBRARY_ROUTE_ITEM } from '../../../../common/endpoint/constants';
import type { EndpointScriptApiResponse } from '../../../../common/endpoint/types';

export const useGetEndpointScript = (
  id: string,
  options: UseQueryOptions<EndpointScriptApiResponse, IHttpFetchError<ResponseErrorBody>> = {}
): UseQueryResult<EndpointScriptApiResponse, IHttpFetchError<ResponseErrorBody>> => {
  const http = useHttp();

  return useQuery<EndpointScriptApiResponse, IHttpFetchError<ResponseErrorBody>>({
    queryKey: ['get-scripts-library', id],
    ...options,
    keepPreviousData: true,
    queryFn: async () => {
      return http.get<EndpointScriptApiResponse>(
        resolvePathVariables(SCRIPTS_LIBRARY_ROUTE_ITEM, { script_id: id }),
        { version: '2023-10-31' }
      );
    },
  });
};
