/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetPackagePoliciesRequest, PackagePolicy } from '@kbn/fleet-plugin/common';
import { API_VERSIONS, packagePolicyRouteService } from '@kbn/fleet-plugin/common';
import type { UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { useHttp } from '../../../common/lib/kibana';
import type { GetIntegrationPolicyListResponse } from './types';

/**
 * Fetch integration policies from Fleet.
 */
export const useFetchIntegrationPolicyList = <T extends PackagePolicy = PackagePolicy>(
  query: GetPackagePoliciesRequest['query'] = {},
  options: Omit<
    UseQueryOptions<GetIntegrationPolicyListResponse<T>, IHttpFetchError>,
    'queryFn'
  > = {}
): UseQueryResult<GetIntegrationPolicyListResponse<T>, IHttpFetchError> => {
  const http = useHttp();

  return useQuery<GetIntegrationPolicyListResponse<T>, IHttpFetchError>({
    queryKey: ['fetch-integration-policy-list', query],
    refetchOnWindowFocus: false,
    ...options,
    queryFn: async () => {
      return http.get<GetIntegrationPolicyListResponse<T>>(
        packagePolicyRouteService.getListPath(),
        {
          query,
          version: API_VERSIONS.public.v1,
        }
      );
    },
  });
};
