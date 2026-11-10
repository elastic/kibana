/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryOptions, UseQueryResult } from '@kbn/react-query';
import { useQuery } from '@kbn/react-query';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { useHttp } from '../../../common/lib/kibana';
import type { MetadataListResponse } from '../../../../common/endpoint/types';
import type { GetMetadataListRequestQuery } from '../../../../common/api/endpoint';
import { HOST_METADATA_LIST_ROUTE } from '../../../../common/endpoint/constants';

/**
 * Fetch the list of endpoint host metadata from the Endpoint Metadata List API. The response is
 * returned exactly as the API returns it.
 * @param query the query params supported by the metadata list API (page, pageSize, kuery, etc.)
 * @param options
 */
export const useFetchEndpointList = (
  query: Partial<GetMetadataListRequestQuery> = {},
  options: UseQueryOptions<MetadataListResponse, IHttpFetchError> = {}
): UseQueryResult<MetadataListResponse, IHttpFetchError> => {
  const http = useHttp();

  return useQuery<MetadataListResponse, IHttpFetchError>({
    queryKey: ['fetch-endpoint-list', query],
    ...options,
    queryFn: () => {
      return http.get<MetadataListResponse>(HOST_METADATA_LIST_ROUTE, {
        version: '2023-10-31',
        query,
      });
    },
  });
};
